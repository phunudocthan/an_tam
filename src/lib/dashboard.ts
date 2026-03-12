import {
  APP_NAME,
  DEFAULT_GOAL_PRESET,
  PAIR_CAPACITY,
  WEEKDAY_OPTIONS,
} from "@/lib/constants";
import { getSessionUser, type AuthUser } from "@/lib/auth";
import { getDateLabel, getTodayKey, getWeekRange, getWeekdayInTimezone, listDateKeysDescending } from "@/lib/date";
import { getPairTimezone, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AiReviewRow,
  BodyFocus,
  BodyRuleType,
  DailyCheckinRow,
  DashboardData,
  GoalCategory,
  GoalConfigMap,
  GoalConfigRow,
  HistoryDay,
  PairMemberRow,
  PairRow,
  PersonSummary,
  ProfileRow,
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

  const membershipRows = (members as PairMemberRow[] | null) ?? [];

  if (membersError || goalsError) {
    throw new Error(membersError?.message ?? goalsError?.message ?? "Failed to load pair.");
  }

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
        name: partnerProfile.display_name || "Người kia",
        focusMode: partnerProfile.focus_mode ?? null,
        goals: partnerGoals,
        today: partnerToday,
        streak: computePersonalStreak(checkinRows, partnerProfile.id, timezone),
      }
    : null;

  const shared = computeSharedStreak(checkinRows, membershipRows, timezone);
  const weeklyStats = {
    viewer: computeWeeklyStats(checkinRows, user.id, viewerGoals, timezone),
    partner: partner ? computeWeeklyStats(checkinRows, partner.userId, partnerGoals, timezone) : null,
  };

  const todayState = deriveTodayState(viewerToday, partnerToday, shared.protectedDates);

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
      weeklyPact: (weeklyPacts as WeeklyPactRow | null) ?? null,
      dailyRecap: buildDailyRecap({ partner, todayState, sharedStreak: shared.streak }),
      weeklyInsight: (reviews as AiReviewRow | null) ?? null,
      weeklyStats,
      history: buildHistory(checkinRows, viewer, partner, timezone, shared.protectedDates),
      todayState,
    },
  };
}

export function evaluateDay(
  row: Partial<DailyCheckinRow> | null,
  goals: GoalConfigMap,
  dateKey: string,
  timezone: string,
  mode: "draft" | "submit",
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

  const bodyStatus = !bodyIsScheduled
    ? "na"
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
    if (category === "screen_time") return "Giữ màn hình thấp";
    return DEFAULT_GOAL_PRESET.bodyLabel;
  }

  return goal.title;
}

export function getBodyScheduledDays(goal: GoalConfigRow | null) {
  const raw = goal?.config && Array.isArray(goal.config.weekdays) ? goal.config.weekdays : DEFAULT_GOAL_PRESET.bodyDays;

  return raw
    .map((value) => Number(value))
    .filter((value) => WEEKDAY_OPTIONS.some((option) => option.value === value));
}

export function getBodyRuleType(goal: GoalConfigRow | null): BodyRuleType {
  const raw = goal?.config?.ruleType;

  if (raw === "nutrition" || raw === "recovery" || raw === "workout") {
    return raw;
  }

  return DEFAULT_GOAL_PRESET.bodyRuleType;
}

export function getTargetText(goal: GoalConfigRow | null, category: GoalCategory) {
  if (category === "study") {
    return `${goal?.target_value ?? DEFAULT_GOAL_PRESET.studyMinutes} phút`;
  }

  if (category === "screen_time") {
    return `<= ${goal?.target_value ?? DEFAULT_GOAL_PRESET.screenTimeMinutes} phút`;
  }

  const days = getBodyScheduledDays(goal);
  return `${getGoalLabel(goal, "body")} · ${days.length} ngày/tuần`;
}

function buildGoalMap(goalRows: GoalConfigRow[], userId: string): GoalConfigMap {
  const rows = goalRows.filter((goal) => goal.user_id === userId);

  return {
    study: rows.find((goal) => goal.category === "study") ?? null,
    screen_time: rows.find((goal) => goal.category === "screen_time") ?? null,
    body: rows.find((goal) => goal.category === "body") ?? null,
  };
}

function deriveTodayState(
  viewerToday: DailyCheckinRow | null,
  partnerToday: DailyCheckinRow | null,
  protectedDates: string[],
): DashboardData["todayState"] {
  const todayKey = viewerToday?.entry_date ?? partnerToday?.entry_date;
  const protectedToday = todayKey ? protectedDates.includes(todayKey) : false;

  if (!viewerToday?.submitted_at && partnerToday?.submitted_at) return "waiting_for_you";
  if (!viewerToday?.submitted_at) return "draft";
  if (!partnerToday?.submitted_at) return "waiting_for_partner";
  if (viewerToday.personal_day_status === "pass" && partnerToday.personal_day_status === "pass") return "shared_pass";
  if (protectedToday) return "grace_protected";
  return "shared_fail";
}

function computePersonalStreak(rows: DailyCheckinRow[], userId: string, timezone: string) {
  const byDate = new Map(
    rows.filter((row) => row.user_id === userId).map((row) => [row.entry_date, row]),
  );

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

function buildDailyRecap({
  partner,
  todayState,
  sharedStreak,
}: {
  partner: PersonSummary | null;
  todayState: DashboardData["todayState"];
  sharedStreak: number;
}) {
  if (!partner) {
    return "Bạn đã vào app rồi. Khi người kia setup xong, streak chung sẽ bắt đầu chạy và cảm giác chờ nhau mới bật lên.";
  }

  if (todayState === "waiting_for_you") {
    return `${partner.name} đã khóa ngày trước. Bạn chỉ còn thiếu bước chốt nốt phần mình để nối lại nhịp chung.`;
  }

  if (todayState === "waiting_for_partner") {
    return `Bạn đã khóa ngày. Giờ còn chờ ${partner.name} chốt nốt để biết streak chung có đi tiếp không.`;
  }

  if (todayState === "shared_pass") {
    return `Hôm nay cả hai đều qua ngày. Streak chung đang ở ${sharedStreak} ngày và cảm giác đồng hành vẫn còn nguyên nhịp.`;
  }

  if (todayState === "grace_protected") {
    return "Hôm nay chưa sạch để tính là một ngày đẹp, nhưng streak chung vẫn được giữ nhờ 1 grace. Đây là lúc nên chỉnh lại ma sát nhỏ cho ngày mai.";
  }

  if (todayState === "shared_fail") {
    return "Cả hai đều đã vào app nhưng hôm nay chưa đủ chuẩn để kéo streak chung đi tiếp. Cần sửa chỗ gãy cụ thể chứ không cần siết thêm áp lực.";
  }

  return `Hôm nay vẫn đang ở trạng thái draft. Chỉ cần chốt từng mục rồi submit, app sẽ chuyển sang cảm giác chờ nhau mà ${APP_NAME} được xây để tạo ra.`;
}

function looksLikeMissingSchema(message: string) {
  return message.includes("does not exist") || message.includes("relation") || message.includes("schema cache");
}

export function getFocusLabel(mode: BodyFocus | null) {
  if (mode === "gain") return "Tăng cân";
  if (mode === "cut") return "Giảm cân";
  return "Body goal";
}

export function getBodyRuleLabel(goal: GoalConfigRow | null) {
  const rule = getBodyRuleType(goal);

  if (rule === "nutrition") return "Ăn uống";
  if (rule === "recovery") return "Recovery";
  return "Gym";
}
