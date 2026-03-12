import { DEFAULT_GOAL_PRESET, GOAL_CATEGORIES, PAIR_CAPACITY, PROOF_BUCKET } from "@/lib/constants";
import {
  buildBodyCheckpointSlots,
  getBodyCheckpointCount,
  getBodyRuleType,
  getBodyScheduledDays,
  isNutritionGoal,
} from "@/lib/body";
import { getSessionUser, type AuthUser } from "@/lib/auth";
import { getDateLabel, getExpiryForDate, getTodayKey, getWeekRange, getWeekdayInTimezone, listDateKeysDescending } from "@/lib/date";
import { getPairTimezone, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AiReviewRow,
  BodyCheckpointEntryRow,
  BodyFocus,
  DailyCheckinRow,
  DashboardData,
  DayLane,
  GoalCategory,
  GoalConfigMap,
  GoalConfigRow,
  GoalStage,
  HistoryDay,
  PairMemberRow,
  PairRow,
  PersonSummary,
  ProfileRow,
  ProofReactionRow,
  TodayStage,
  VisibleProof,
  WeeklyPactRow,
  WeeklyStats,
} from "@/lib/types";

export type AppState =
  | { kind: "missing_env" }
  | { kind: "blocked"; email: string; reason: string }
  | { kind: "needs_setup"; email: string; memberCount: number; profile: ProfileRow | null }
  | { kind: "db_not_ready"; email: string; message: string }
  | { kind: "ready"; data: DashboardData };

type DailyEvaluation = {
  studyStatus: DailyCheckinRow["study_status"];
  screenTimeStatus: DailyCheckinRow["screen_time_status"];
  bodyStatus: DailyCheckinRow["body_status"];
  personalStatus: DailyCheckinRow["personal_day_status"];
};

type ProofSource = {
  checkinId: string;
  pairId: string;
  ownerUserId: string;
  ownerName: string;
  category: GoalCategory;
  checkpointIndex: number | null;
  checkpointCount: number | null;
  label: string;
  path: string;
  note: string | null;
  expiresAt: string;
};

export { getBodyCheckpointCount, getBodyRuleType, getBodyScheduledDays, isNutritionGoal } from "@/lib/body";

export async function requireUser() {
  return getSessionUser();
}

export async function loadAppState(user: AuthUser): Promise<AppState> {
  if (!hasSupabaseEnv()) {
    return { kind: "missing_env" };
  }

  const admin = createAdminClient();

  const [{ data: pair, error: pairError }, { data: profile, error: profileError }] = await Promise.all([
    admin.from("pairs").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle(),
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const firstError = pairError ?? profileError;

  if (firstError) {
    if (looksLikeMissingSchema(firstError.message)) {
      return {
        kind: "db_not_ready",
        email: user.email,
        message:
          "Database schema chưa được apply. Hãy chạy file migration trong thư mục `supabase/migrations` lên đúng Supabase project trước.",
      };
    }

    throw new Error(firstError.message);
  }

  if (!pair) {
    return {
      kind: "needs_setup",
      email: user.email,
      memberCount: 0,
      profile: (profile as ProfileRow | null) ?? null,
    };
  }

  const [{ data: members, error: membersError }, { data: goals, error: goalsError }] = await Promise.all([
    admin.from("pair_members").select("*").eq("pair_id", pair.id),
    admin.from("goal_configs").select("*").eq("pair_id", pair.id).order("created_at", { ascending: true }),
  ]);

  if (membersError || goalsError) {
    throw new Error(membersError?.message ?? goalsError?.message ?? "Failed to load pair.");
  }

  const membershipRows = (members as PairMemberRow[] | null) ?? [];
  const isMember = membershipRows.some((member) => member.user_id === user.id);

  if (!isMember && membershipRows.length >= PAIR_CAPACITY) {
    return {
      kind: "blocked",
      email: user.email,
      reason: "Pair này đã đủ 2 người. App được khóa ở đúng một cặp đôi cho MVP.",
    };
  }

  const setupCompleted = Boolean(profile?.setup_completed);
  const userGoalCount = ((goals as GoalConfigRow[] | null) ?? []).filter((goal) => goal.user_id === user.id).length;

  if (!isMember || !setupCompleted || userGoalCount < 3) {
    return {
      kind: "needs_setup",
      email: user.email,
      memberCount: membershipRows.length,
      profile: (profile as ProfileRow | null) ?? null,
    };
  }

  const timezone = pair.timezone ?? getPairTimezone();
  const todayKey = getTodayKey(timezone);
  const { weekStart, weekEnd } = getWeekRange(timezone);
  const historyStart = listDateKeysDescending(timezone, 21).at(-1) ?? todayKey;

  const [
    { data: pairProfiles, error: profilesError },
    { data: checkins, error: checkinsError },
    { data: weeklyPacts, error: pactError },
    { data: reviews, error: reviewsError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("*")
      .in(
        "id",
        membershipRows.map((member) => member.user_id),
      ),
    admin
      .from("daily_checkins")
      .select("*")
      .eq("pair_id", pair.id)
      .gte("entry_date", historyStart)
      .order("entry_date", { ascending: false }),
    admin.from("weekly_pacts").select("*").eq("pair_id", pair.id).eq("week_start", weekStart).maybeSingle(),
    admin
      .from("ai_reviews")
      .select("*")
      .eq("pair_id", pair.id)
      .eq("review_type", "weekly_ai")
      .eq("period_start", weekStart)
      .eq("period_end", weekEnd)
      .maybeSingle(),
  ]);

  const downstreamError = profilesError ?? checkinsError ?? pactError ?? reviewsError;

  if (downstreamError) {
    throw new Error(downstreamError.message);
  }

  const profileRows = (pairProfiles as ProfileRow[] | null) ?? [];
  const goalRows = (goals as GoalConfigRow[] | null) ?? [];
  const checkinRows = (checkins as DailyCheckinRow[] | null) ?? [];
  const profileNames = new Map(profileRows.map((item) => [item.id, item.display_name || item.email]));

  const checkinIds = checkinRows.map((row) => row.id);
  let bodyCheckpointRows: BodyCheckpointEntryRow[] = [];

  if (checkinIds.length > 0) {
    const { data: checkpoints, error: checkpointsError } = await admin
      .from("body_checkpoint_entries")
      .select("*")
      .in("checkin_id", checkinIds)
      .order("checkpoint_index", { ascending: true });

    if (checkpointsError && !looksLikeMissingSchema(checkpointsError.message)) {
      throw new Error(checkpointsError.message);
    }

    if (!checkpointsError) {
      bodyCheckpointRows = (checkpoints as BodyCheckpointEntryRow[] | null) ?? [];
    }
  }

  const viewerProfile = profileRows.find((item) => item.id === user.id);
  const partnerProfile = profileRows.find((item) => item.id !== user.id) ?? null;
  const viewerGoals = buildGoalMap(goalRows, user.id);
  const partnerGoals = buildGoalMap(goalRows, partnerProfile?.id ?? "");
  const viewerToday = checkinRows.find((row) => row.user_id === user.id && row.entry_date === todayKey) ?? null;
  const partnerToday =
    checkinRows.find((row) => row.user_id === partnerProfile?.id && row.entry_date === todayKey) ?? null;

  const viewer: PersonSummary = {
    userId: user.id,
    email: viewerProfile?.email ?? user.email,
    name: viewerProfile?.display_name || user.fallbackName,
    focusMode: viewerProfile?.focus_mode ?? null,
    goals: viewerGoals,
    today: viewerToday,
    streak: computePersonalStreak(checkinRows, user.id, timezone),
  };

  const partner: PersonSummary | null = partnerProfile
    ? {
        userId: partnerProfile.id,
        email: partnerProfile.email,
        name: partnerProfile.display_name || "Người còn lại",
        focusMode: partnerProfile.focus_mode ?? null,
        goals: partnerGoals,
        today: partnerToday,
        streak: computePersonalStreak(checkinRows, partnerProfile.id, timezone),
      }
    : null;

  const shared = computeSharedStreak(checkinRows, membershipRows, timezone);
  const viewerCheckpointEntries = viewerToday
    ? bodyCheckpointRows.filter((entry) => entry.checkin_id === viewerToday.id)
    : [];
  const partnerCheckpointEntries =
    partner && partnerToday ? bodyCheckpointRows.filter((entry) => entry.checkin_id === partnerToday.id) : [];
  const baseViewerLane = buildDayLane(viewer, viewerToday, viewerCheckpointEntries, todayKey, timezone);
  const basePartnerLane = partner ? buildDayLane(partner, partnerToday, partnerCheckpointEntries, todayKey, timezone) : null;
  const todayStage = deriveTodayStage({
    viewerLane: baseViewerLane,
    partnerLane: basePartnerLane,
    protectedDates: shared.protectedDates,
    todayKey,
  });
  const viewerLane = syncLaneWithTodayStage(baseViewerLane, todayStage);
  const partnerLane = basePartnerLane ? syncLaneWithTodayStage(basePartnerLane, todayStage) : null;

  const weeklyStats = {
    viewer: computeWeeklyStats(checkinRows, user.id, viewerGoals, timezone),
    partner: partner ? computeWeeklyStats(checkinRows, partner.userId, partnerGoals, timezone) : null,
  };
  const weeklyPact = (weeklyPacts as WeeklyPactRow | null) ?? null;
  const weeklyPactEditorId = weeklyPact?.updated_by ?? weeklyPact?.created_by ?? null;

  const visibleProofs = await buildVisibleProofs({
    admin,
    rows: checkinRows,
    bodyCheckpointRows,
    viewer,
    partner,
    profileNames,
    now: new Date(),
    timezone,
  });

  return {
    kind: "ready",
    data: {
      pair: pair as PairRow,
      viewer,
      partner,
      memberCount: membershipRows.length,
      todayKey,
      weekStart,
      sharedStreak: shared.streak,
      sharedGraceProtectedDates: shared.protectedDates,
      weeklyPact,
      weeklyPactEditorName: weeklyPactEditorId ? profileNames.get(weeklyPactEditorId) ?? null : null,
      todayStage,
      todaySummary: buildTodaySummary({
        partner,
        viewerLane,
        partnerLane,
        todayStage,
        sharedStreak: shared.streak,
      }),
      viewerLane,
      partnerLane,
      viewerBodyCheckpoints: buildBodyCheckpointSlots(viewerCheckpointEntries, getBodyCheckpointCount(viewerGoals.body)),
      visibleProofs,
      weeklyInsight: (reviews as AiReviewRow | null) ?? null,
      weeklyStats,
      history: buildHistory(checkinRows, viewer, partner, timezone, shared.protectedDates),
    },
  };
}

export function evaluateDay(
  row: Partial<DailyCheckinRow> | null,
  goals: GoalConfigMap,
  dateKey: string,
  timezone: string,
  mode: "draft" | "submit",
  bodyCheckpointEntries: BodyCheckpointEntryRow[] = [],
): DailyEvaluation {
  const studyGoal = goals.study;
  const screenGoal = goals.screen_time;
  const bodyGoal = goals.body;

  const studyMinutes = row?.study_minutes;
  const screenTimeMinutes = row?.screen_time_minutes;
  const hasStudyProof = Boolean(row?.study_proof_path || row?.study_had_proof);
  const hasBodyProof = Boolean(row?.body_proof_path || row?.body_had_proof);

  const studyTarget = studyGoal?.target_value ?? DEFAULT_GOAL_PRESET.studyMinutes;
  const screenLimit = screenGoal?.target_value ?? DEFAULT_GOAL_PRESET.screenTimeMinutes;

  const studyStatus =
    typeof studyMinutes !== "number"
      ? mode === "submit"
        ? "fail"
        : "pending"
      : studyMinutes >= studyTarget
        ? studyGoal?.proof_required
          ? hasStudyProof
            ? "pass"
            : mode === "submit"
              ? "fail"
              : "pending"
          : "pass"
        : "fail";

  const screenTimeStatus =
    typeof screenTimeMinutes !== "number"
      ? mode === "submit"
        ? "fail"
        : "pending"
      : screenTimeMinutes <= screenLimit
        ? "pass"
        : "fail";

  const scheduledDays = getBodyScheduledDays(bodyGoal);
  const weekday = getWeekdayInTimezone(dateKey, timezone);
  const bodyIsScheduled = scheduledDays.includes(weekday);
  const nutritionCheckpointCount = getBodyCheckpointCount(bodyGoal);
  const completedNutritionCheckpoints = bodyCheckpointEntries.filter((entry) => entry.completed).length;

  const bodyStatus = !bodyIsScheduled
    ? "na"
    : isNutritionGoal(bodyGoal)
      ? completedNutritionCheckpoints >= nutritionCheckpointCount
        ? "pass"
        : mode === "submit"
          ? "fail"
          : bodyCheckpointEntries.length > 0
            ? "pending"
            : "pending"
      : row?.body_completed
        ? bodyGoal?.proof_required
          ? hasBodyProof
            ? "pass"
            : mode === "submit"
              ? "fail"
              : "pending"
          : "pass"
        : mode === "submit"
          ? "fail"
          : "pending";

  const personalStatus =
    [studyStatus, screenTimeStatus, bodyStatus].every((status) => status === "pass" || status === "na")
      ? "pass"
      : [studyStatus, screenTimeStatus, bodyStatus].includes("fail")
        ? "fail"
        : "draft";

  return {
    studyStatus,
    screenTimeStatus,
    bodyStatus,
    personalStatus,
  };
}

export function getGoalLabel(goal: GoalConfigRow | null, category: GoalCategory) {
  if (!goal) {
    if (category === "study") return "Học đều";
    if (category === "screen_time") return "Giữ điện thoại trong giới hạn";
    return DEFAULT_GOAL_PRESET.bodyLabel;
  }

  return goal.title;
}

export function getTargetText(goal: GoalConfigRow | null, category: GoalCategory) {
  if (category === "study") {
    return `${goal?.target_value ?? DEFAULT_GOAL_PRESET.studyMinutes} phút`;
  }

  if (category === "screen_time") {
    return `<= ${goal?.target_value ?? DEFAULT_GOAL_PRESET.screenTimeMinutes} phút`;
  }

  if (isNutritionGoal(goal)) {
    return `${getBodyRuleLabel(goal)} · ${getBodyCheckpointCount(goal)}/${getBodyCheckpointCount(goal)} checkpoint`;
  }

  return `${getBodyRuleLabel(goal)} · ${getBodyScheduledDays(goal).length} ngày/tuần`;
}

export function getFocusLabel(mode: BodyFocus | null) {
  if (mode === "gain") return "Tăng cân";
  if (mode === "cut") return "Giảm cân";
  return "Mục tiêu Body";
}

export function getBodyRuleLabel(goal: GoalConfigRow | null) {
  const rule = getBodyRuleType(goal);

  if (rule === "nutrition") return "Ăn uống";
  if (rule === "recovery") return "Recovery";
  return "Gym";
}

function buildGoalMap(goalRows: GoalConfigRow[], userId: string): GoalConfigMap {
  const rows = goalRows.filter((goal) => goal.user_id === userId);

  return {
    study: rows.find((goal) => goal.category === "study") ?? null,
    screen_time: rows.find((goal) => goal.category === "screen_time") ?? null,
    body: rows.find((goal) => goal.category === "body") ?? null,
  };
}

function buildDayLane(
  person: PersonSummary,
  row: DailyCheckinRow | null,
  bodyCheckpointEntries: BodyCheckpointEntryRow[],
  todayKey: string,
  timezone: string,
): DayLane {
  const goalStages = {
    study: deriveGoalStage(row, "study", true),
    screen_time: deriveGoalStage(row, "screen_time", true),
    body: deriveGoalStage(
      row,
      "body",
      getBodyScheduledDays(person.goals.body).includes(getWeekdayInTimezone(todayKey, timezone)),
      bodyCheckpointEntries,
      person.goals.body,
    ),
  } satisfies DayLane["goalStages"];

  const readyCount = GOAL_CATEGORIES.filter((category) => {
    const stage = goalStages[category];
    return stage === "ready" || stage === "locked" || stage === "na";
  }).length;

  const lockedCount = GOAL_CATEGORIES.filter((category) => {
    const stage = goalStages[category];
    return stage === "locked" || stage === "na";
  }).length;

  const missingCategories = GOAL_CATEGORIES.filter((category) => {
    const stage = goalStages[category];
    return stage === "not_started" || stage === "in_progress" || stage === "needs_fix" || stage === "missed";
  });

  return {
    userId: person.userId,
    name: person.name,
    focusMode: person.focusMode,
    streak: person.streak,
    dayStage: derivePersonDayStage(row, goalStages),
    submitted: Boolean(row?.submitted_at),
    submittedAt: row?.submitted_at ?? null,
    personalStatus: row?.submitted_at ? row.personal_day_status : "waiting",
    goalStages,
    readyCount,
    lockedCount,
    missingCategories,
  };
}

function deriveGoalStage(
  row: DailyCheckinRow | null,
  category: GoalCategory,
  scheduledToday: boolean,
  bodyCheckpointEntries: BodyCheckpointEntryRow[] = [],
  bodyGoal: GoalConfigRow | null = null,
): GoalStage {
  if (!scheduledToday) {
    return "na";
  }

  const rawStatus = getRawGoalStatus(row, category);

  if (row?.submitted_at) {
    if (rawStatus === "pass") return "locked";
    if (rawStatus === "na") return "na";
    return "missed";
  }

  if (!hasGoalDraftContent(row, category, bodyCheckpointEntries, bodyGoal)) {
    return "not_started";
  }

  if (rawStatus === "pass") {
    return "ready";
  }

  if (rawStatus === "fail") {
    return "needs_fix";
  }

  return "in_progress";
}

function derivePersonDayStage(
  row: DailyCheckinRow | null,
  goalStages: Record<GoalCategory, GoalStage>,
): TodayStage | "waiting" {
  if (!row) {
    return "drafting";
  }

  if (!row.submitted_at) {
    const readyToSubmit = GOAL_CATEGORIES.every((category) => {
      const stage = goalStages[category];
      return stage === "ready" || stage === "na";
    });

    return readyToSubmit ? "ready_to_submit" : "drafting";
  }

  if (row.personal_day_status === "pass") {
    return "submitted_waiting_partner";
  }

  return "missed";
}

function deriveTodayStage({
  viewerLane,
  partnerLane,
  protectedDates,
  todayKey,
}: {
  viewerLane: DayLane;
  partnerLane: DayLane | null;
  protectedDates: string[];
  todayKey: string;
}): TodayStage {
  if (!viewerLane.submitted) {
    return viewerLane.dayStage === "ready_to_submit" ? "ready_to_submit" : "drafting";
  }

  if (!partnerLane?.submitted) {
    return "submitted_waiting_partner";
  }

  if (viewerLane.personalStatus === "pass" && partnerLane.personalStatus === "pass") {
    return "shared_pass";
  }

  if (protectedDates.includes(todayKey)) {
    return "protected_by_grace";
  }

  return "missed";
}

function syncLaneWithTodayStage(lane: DayLane, todayStage: TodayStage): DayLane {
  if (!lane.submitted) {
    return lane;
  }

  if (todayStage === "shared_pass" || todayStage === "protected_by_grace" || todayStage === "missed") {
    return {
      ...lane,
      dayStage: todayStage,
    };
  }

  return {
    ...lane,
    dayStage: "submitted_waiting_partner",
  };
}

function computePersonalStreak(rows: DailyCheckinRow[], userId: string, timezone: string) {
  const byDate = new Map(rows.filter((row) => row.user_id === userId).map((row) => [row.entry_date, row]));
  let streak = 0;
  const dateKeys = listDateKeysDescending(timezone, 60);
  const todayKey = getTodayKey(timezone);

  for (const dateKey of dateKeys) {
    const row = byDate.get(dateKey);

    if (!row?.submitted_at) {
      if (dateKey === todayKey) {
        continue;
      }
      break;
    }

    if (row.personal_day_status !== "pass") {
      break;
    }

    streak += 1;
  }

  return streak;
}

function computeSharedStreak(rows: DailyCheckinRow[], members: PairMemberRow[], timezone: string) {
  const dateKeys = listDateKeysDescending(timezone, 60);
  const todayKey = getTodayKey(timezone);
  const protectedDates: string[] = [];
  let streak = 0;
  let remainingGrace = 1;

  for (const dateKey of dateKeys) {
    const dateRows = members
      .map((member) => rows.find((row) => row.user_id === member.user_id && row.entry_date === dateKey) ?? null)
      .filter(Boolean) as DailyCheckinRow[];

    const allSubmitted = dateRows.length === members.length && dateRows.every((row) => Boolean(row.submitted_at));

    if (!allSubmitted) {
      if (dateKey === todayKey) {
        continue;
      }
      break;
    }

    const isPass = dateRows.every((row) => row.personal_day_status === "pass");

    if (isPass) {
      streak += 1;
    } else if (remainingGrace > 0) {
      streak += 1;
      remainingGrace -= 1;
      protectedDates.push(dateKey);
    } else {
      break;
    }

    if (streak % 7 === 0) {
      remainingGrace = 1;
    }
  }

  return {
    streak,
    protectedDates,
  };
}

function buildHistory(
  rows: DailyCheckinRow[],
  viewer: PersonSummary,
  partner: PersonSummary | null,
  timezone: string,
  protectedDates: string[],
): HistoryDay[] {
  return listDateKeysDescending(timezone, 7).map((date) => {
    const viewerRow = rows.find((row) => row.user_id === viewer.userId && row.entry_date === date) ?? null;
    const partnerRow = partner
      ? rows.find((row) => row.user_id === partner.userId && row.entry_date === date) ?? null
      : null;

    const viewerStatus = viewerRow?.submitted_at ? viewerRow.personal_day_status : "waiting";
    const partnerStatus = partner
      ? partnerRow?.submitted_at
        ? partnerRow.personal_day_status
        : "waiting"
      : "missing";

    let sharedStatus: HistoryDay["sharedStatus"] = "idle";

    if (viewerRow?.submitted_at || partnerRow?.submitted_at) {
      if (viewerRow?.submitted_at && partnerRow?.submitted_at) {
        sharedStatus =
          viewerRow.personal_day_status === "pass" && partnerRow.personal_day_status === "pass"
            ? "pass"
            : protectedDates.includes(date)
              ? "protected"
              : "fail";
      } else {
        sharedStatus = "waiting";
      }
    }

    return {
      date,
      label: getDateLabel(date, timezone),
      viewerStatus,
      partnerStatus,
      sharedStatus,
    };
  });
}

function computeWeeklyStats(
  rows: DailyCheckinRow[],
  userId: string,
  goals: GoalConfigMap,
  timezone: string,
): WeeklyStats {
  const weekDates = listDateKeysDescending(timezone, 7);
  const relevantRows = weekDates
    .map((dateKey) => rows.find((row) => row.user_id === userId && row.entry_date === dateKey) ?? null)
    .filter(Boolean) as DailyCheckinRow[];

  const screenValues = relevantRows
    .map((row) => row.screen_time_minutes)
    .filter((value): value is number => typeof value === "number");

  return {
    studyPassDays: relevantRows.filter((row) => row.study_status === "pass").length,
    studyMinutes: relevantRows.reduce((sum, row) => sum + (row.study_minutes ?? 0), 0),
    screenWins: relevantRows.filter((row) => row.screen_time_status === "pass").length,
    averageScreenTime:
      screenValues.length > 0
        ? Math.round(screenValues.reduce((sum, value) => sum + value, 0) / screenValues.length)
        : goals.screen_time?.target_value ?? DEFAULT_GOAL_PRESET.screenTimeMinutes,
    bodyPassDays: relevantRows.filter((row) => row.body_status === "pass").length,
    bodyScheduledDays: weekDates.filter((dateKey) =>
      getBodyScheduledDays(goals.body).includes(getWeekdayInTimezone(dateKey, timezone)),
    ).length,
  };
}

async function buildVisibleProofs({
  admin,
  rows,
  bodyCheckpointRows,
  viewer,
  partner,
  profileNames,
  now,
  timezone,
}: {
  admin: ReturnType<typeof createAdminClient>;
  rows: DailyCheckinRow[];
  bodyCheckpointRows: BodyCheckpointEntryRow[];
  viewer: PersonSummary;
  partner: PersonSummary | null;
  profileNames: Map<string, string>;
  now: Date;
  timezone: string;
}): Promise<VisibleProof[]> {
  const visibleSources: ProofSource[] = [];
  const seenKeys = new Set<string>();

  for (const row of rows) {
    for (const category of GOAL_CATEGORIES) {
      const ownerBodyGoal =
        row.user_id === viewer.userId
          ? viewer.goals.body
          : row.user_id === partner?.userId
            ? partner.goals.body
            : null;

      if (category === "body" && isNutritionGoal(ownerBodyGoal)) {
        const checkpointCount = getBodyCheckpointCount(ownerBodyGoal);
        const checkpoints = bodyCheckpointRows.filter((entry) => entry.checkin_id === row.id && Boolean(entry.proof_path));

        for (const checkpoint of checkpoints) {
          const visibleUntil = normalizeProofExpiry(row.entry_date, timezone, checkpoint.proof_expires_at);

          if (!checkpoint.proof_path || !visibleUntil || new Date(visibleUntil).getTime() <= now.getTime()) {
            continue;
          }

          const dedupeKey = `${row.user_id}:${category}:${checkpoint.checkpoint_index}`;

          if (seenKeys.has(dedupeKey)) {
            continue;
          }

          seenKeys.add(dedupeKey);
          visibleSources.push({
            checkinId: row.id,
            pairId: row.pair_id,
            ownerUserId: row.user_id,
            ownerName:
              row.user_id === viewer.userId
                ? viewer.name
                : row.user_id === partner?.userId
                  ? partner.name
                  : profileNames.get(row.user_id) ?? "Người còn lại",
            category,
            checkpointIndex: checkpoint.checkpoint_index,
            checkpointCount,
            label: `Body · ${checkpoint.checkpoint_index}/${checkpointCount}`,
            path: checkpoint.proof_path,
            note: checkpoint.note,
            expiresAt: visibleUntil,
          });
        }

        continue;
      }

      const proofMeta = getProofMeta(row, category);

      if (!proofMeta.path || !proofMeta.expiresAt) {
        continue;
      }

      const visibleUntil = normalizeProofExpiry(row.entry_date, timezone, proofMeta.expiresAt);

      if (!visibleUntil || new Date(visibleUntil).getTime() <= now.getTime()) {
        continue;
      }

      const dedupeKey = `${row.user_id}:${category}`;

      if (seenKeys.has(dedupeKey)) {
        continue;
      }

      seenKeys.add(dedupeKey);
      visibleSources.push({
        checkinId: row.id,
        pairId: row.pair_id,
        ownerUserId: row.user_id,
        ownerName:
          row.user_id === viewer.userId
            ? viewer.name
            : row.user_id === partner?.userId
              ? partner.name
              : profileNames.get(row.user_id) ?? "Người còn lại",
        category,
        checkpointIndex: null,
        checkpointCount: null,
        label: category === "body" ? "Body" : category === "study" ? "Học" : "Điện thoại",
        path: proofMeta.path,
        note: proofMeta.note,
        expiresAt: visibleUntil,
      });
    }
  }

  if (visibleSources.length === 0) {
    return [];
  }

  let reactionRows: ProofReactionRow[] = [];
  const { data: reactions, error: reactionsError } = await admin
    .from("proof_reactions")
    .select("*")
    .in(
      "checkin_id",
      [...new Set(visibleSources.map((item) => item.checkinId))],
    );

  if (reactionsError && !looksLikeMissingSchema(reactionsError.message)) {
    throw new Error(reactionsError.message);
  }

  if (!reactionsError) {
    reactionRows = (reactions as ProofReactionRow[] | null) ?? [];
  }

  const proofs = await Promise.all(
    visibleSources.map(async (source) => {
      const { data, error } = await admin.storage.from(PROOF_BUCKET).createSignedUrl(source.path, 60 * 15);

      if (error || !data?.signedUrl) {
        return null;
      }

      const reactionsForProof = reactionRows
        .filter(
          (reaction) =>
            reaction.checkin_id === source.checkinId &&
            reaction.category === source.category &&
            (reaction.checkpoint_index ?? null) === source.checkpointIndex,
        )
        .map((reaction) => ({
          reactorUserId: reaction.reactor_user_id,
          reactorName: profileNames.get(reaction.reactor_user_id) ?? "Partner",
          reactionKey: reaction.reaction_key,
        }));

      return {
        checkinId: source.checkinId,
        pairId: source.pairId,
        ownerUserId: source.ownerUserId,
        ownerName: source.ownerName,
        category: source.category,
        checkpointIndex: source.checkpointIndex,
        checkpointCount: source.checkpointCount,
        label: source.label,
        imageUrl: data.signedUrl,
        note: source.note,
        expiresAt: source.expiresAt,
        isViewerProof: source.ownerUserId === viewer.userId,
        seenByPartner: reactionsForProof.some((reaction) => reaction.reactorUserId !== source.ownerUserId),
        reactions: reactionsForProof,
        viewerReaction:
          source.ownerUserId === viewer.userId
            ? null
            : reactionsForProof.find((reaction) => reaction.reactorUserId === viewer.userId)?.reactionKey ?? null,
      } satisfies VisibleProof;
    }),
  );

  return proofs
    .filter((item): item is VisibleProof => Boolean(item))
    .sort((left, right) => {
      if (left.isViewerProof !== right.isViewerProof) {
        return Number(left.isViewerProof) - Number(right.isViewerProof);
      }

      return right.expiresAt.localeCompare(left.expiresAt);
    });
}

function buildTodaySummary({
  partner,
  viewerLane,
  partnerLane,
  todayStage,
  sharedStreak,
}: {
  partner: PersonSummary | null;
  viewerLane: DayLane;
  partnerLane: DayLane | null;
  todayStage: TodayStage;
  sharedStreak: number;
}): DashboardData["todaySummary"] {
  if (!partner || !partnerLane) {
    return {
      eyebrow: "Chờ đủ hai người",
      title: "Bạn đã vào trước.",
      copy: "Phần của bạn đã sẵn rồi. Khi người còn lại vào, màn hôm nay mới đủ nhịp của hai đứa.",
      nextStep: "Giữ rule của bạn gọn để lúc người kia vào là dùng được ngay.",
    };
  }

  if (todayStage === "shared_pass") {
    return {
      eyebrow: "Qua ngày",
      title: "Hai người đã qua ngày.",
      copy: `Nhịp chung đang ở ${sharedStreak} ngày. Ảnh hôm nay vẫn còn tới trưa mai nếu hai đứa muốn nhìn lại.`,
      nextStep: "Nếu còn muốn xem ảnh thì xem bây giờ, rồi để ngày mới tự mở ra.",
    };
  }

  if (todayStage === "protected_by_grace") {
    return {
      eyebrow: "Grace đang giữ nhịp",
      title: "Hôm nay chưa đẹp, nhưng chưa gãy.",
      copy: "Cả hai đã khóa ngày rồi. Có chỗ hụt, nhưng grace đang giữ nhịp hộ thêm một lần.",
      nextStep: `Ngày mai sửa đúng ${formatMissingCategories(viewerLane.missingCategories)} hoặc phần còn hụt của ${partner.name}.`,
    };
  }

  if (todayStage === "missed") {
    return {
      eyebrow: "Hôm nay bị hụt",
      title: "Cả hai đã vào đủ, nhưng hôm nay không qua.",
      copy: "Không cần siết thêm áp lực. Chỉ cần nhìn đúng chỗ nào đã làm ngày hôm nay gãy nhịp.",
      nextStep: `Xem lại ${formatMissingCategories(viewerLane.missingCategories)} và phần hụt còn hiện ở khung ảnh.`,
    };
  }

  if (todayStage === "submitted_waiting_partner") {
    return {
      eyebrow: "Bạn xong rồi",
      title: `${partner.name} vẫn còn ở trong ngày.`,
      copy: buildWaitingCopy(partnerLane, partner.name),
      nextStep:
        partnerLane.dayStage === "ready_to_submit"
          ? `${partner.name} chỉ còn bấm khóa ngày.`
          : `${partner.name} còn ${formatMissingCategories(partnerLane.missingCategories)}.`,
    };
  }

  if (todayStage === "ready_to_submit") {
    return {
      eyebrow: partnerLane.submitted ? `${partner.name} đang đợi` : "Bạn đã đủ để khóa",
      title: partnerLane.submitted ? `${partner.name} đã khóa ngày trước rồi.` : "Phần của bạn đã đủ để khóa.",
      copy:
        partnerLane.submitted
          ? "Bạn không cần làm thêm gì nữa. Chỉ cần khóa ngày để chuyển sang trạng thái chờ nhau thật sự."
          : `${partner.name} hiện ${laneStageLabel(partnerLane.dayStage).toLowerCase()}. Nếu bạn khóa sớm, cảm giác chờ nhau sẽ rõ hơn.`,
      nextStep: "Bấm Khóa ngày hôm nay.",
    };
  }

  return {
    eyebrow: partnerLane.submitted ? `${partner.name} đang đợi` : "Ngày hôm nay vẫn đang mở",
    title: partnerLane.submitted ? `${partner.name} đã xong, còn bạn chưa xong.` : "Ngày hôm nay vẫn đang mở.",
    copy: partnerLane.submitted
      ? `Bạn còn ${formatMissingCategories(viewerLane.missingCategories)} trước khi hai người bước vào trạng thái chờ nhau.`
      : `Bạn còn ${formatMissingCategories(viewerLane.missingCategories)}. ${partner.name} hiện ${laneStageLabel(partnerLane.dayStage).toLowerCase()}.`,
    nextStep: `Làm nốt ${formatMissingCategories(viewerLane.missingCategories)} rồi mới khóa ngày.`,
  };
}

function buildWaitingCopy(lane: DayLane, partnerName: string) {
  if (lane.dayStage === "ready_to_submit") {
    return `${partnerName} đã đủ hết phần của mình và chỉ còn bấm khóa ngày.`;
  }

  if (lane.dayStage === "drafting") {
    return `${partnerName} vẫn còn ${formatMissingCategories(lane.missingCategories)}, nên hai đứa chưa vào hẳn trạng thái chờ nhau được.`;
  }

  return `${partnerName} đang hoàn tất nốt phần cuối của ngày hôm nay.`;
}

function getProofMeta(row: DailyCheckinRow, category: GoalCategory) {
  if (category === "study") {
    return {
      path: row.study_proof_path,
      expiresAt: row.study_proof_expires_at,
      note: row.study_note,
    };
  }

  if (category === "screen_time") {
    return {
      path: row.screen_time_proof_path,
      expiresAt: row.screen_time_proof_expires_at,
      note: row.screen_time_note,
    };
  }

  return {
    path: row.body_proof_path,
    expiresAt: row.body_proof_expires_at,
    note: row.body_note,
  };
}

function normalizeProofExpiry(entryDate: string, timezone: string, storedExpiry: string | null) {
  if (!storedExpiry) {
    return null;
  }

  const canonical = getExpiryForDate(entryDate, timezone);
  return new Date(storedExpiry).getTime() <= new Date(canonical).getTime() ? storedExpiry : canonical;
}

function getRawGoalStatus(row: DailyCheckinRow | null, category: GoalCategory) {
  if (!row) {
    return "pending";
  }

  if (category === "study") return row.study_status;
  if (category === "screen_time") return row.screen_time_status;
  return row.body_status;
}

function hasGoalDraftContent(
  row: DailyCheckinRow | null,
  category: GoalCategory,
  bodyCheckpointEntries: BodyCheckpointEntryRow[] = [],
  bodyGoal: GoalConfigRow | null = null,
) {
  if (!row) {
    return false;
  }

  if (category === "study") {
    return typeof row.study_minutes === "number" || Boolean(row.study_note) || Boolean(row.study_proof_path || row.study_had_proof);
  }

  if (category === "screen_time") {
    return (
      typeof row.screen_time_minutes === "number" ||
      Boolean(row.screen_time_note) ||
      Boolean(row.screen_time_proof_path || row.screen_time_had_proof)
    );
  }

  if (isNutritionGoal(bodyGoal)) {
    return bodyCheckpointEntries.length > 0;
  }

  return Boolean(row.body_completed || row.body_note || row.body_proof_path || row.body_had_proof);
}

function formatMissingCategories(categories: GoalCategory[]) {
  if (categories.length === 0) {
    return "một nhịp cuối cùng";
  }

  const labels = categories.map((category) => {
    if (category === "study") return "học";
    if (category === "screen_time") return "điện thoại";
    return "Body";
  });

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} và ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")} và ${labels.at(-1)}`;
}

function laneStageLabel(stage: DayLane["dayStage"]) {
  if (stage === "shared_pass") return "đã qua ngày";
  if (stage === "protected_by_grace") return "được grace giữ nhịp";
  if (stage === "submitted_waiting_partner") return "đã khóa ngày";
  if (stage === "ready_to_submit") return "đủ để khóa";
  if (stage === "missed") return "bị hụt";
  if (stage === "waiting") return "đang chờ";
  return "đang làm";
}

function looksLikeMissingSchema(message: string) {
  return message.includes("does not exist") || message.includes("relation") || message.includes("schema cache");
}
