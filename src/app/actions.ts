"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateWeeklyInsight } from "@/lib/ai";
import {
  APP_NAME,
  DEFAULT_GOAL_PRESET,
  MAX_PROOF_SIZE_BYTES,
  PROOF_BUCKET,
  WEEKLY_PACTS,
} from "@/lib/constants";
import { getExpiryForDate, getTodayKey, getWeekRange } from "@/lib/date";
import {
  evaluateDay,
  loadAppState,
  requireUser,
} from "@/lib/dashboard";
import { getPairTimezone } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { DailyCheckinRow, GoalConfigMap, GoalConfigRow, PairMemberRow, PairRow } from "@/lib/types";

const setupSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  focusMode: z.enum(["gain", "cut"]),
  studyMinutes: z.coerce.number().int().min(15).max(600),
  screenTimeMinutes: z.coerce.number().int().min(15).max(720),
  bodyRuleType: z.enum(["workout", "nutrition", "recovery"]),
  bodyLabel: z.string().trim().min(3).max(80),
  weeklyPactKey: z.string().trim().min(1),
  weeklyPactNote: z.string().trim().max(160).optional().default(""),
});

export async function completeSetupAction(formData: FormData) {
  const user = await requireUser();

  if (!user?.email) {
    redirect("/login");
  }

  const bodyDays = formData
    .getAll("bodyDays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  const parsed = setupSchema.parse({
    displayName: formData.get("displayName"),
    focusMode: formData.get("focusMode"),
    studyMinutes: formData.get("studyMinutes"),
    screenTimeMinutes: formData.get("screenTimeMinutes"),
    bodyRuleType: formData.get("bodyRuleType"),
    bodyLabel: formData.get("bodyLabel"),
    weeklyPactKey: formData.get("weeklyPactKey"),
    weeklyPactNote: formData.get("weeklyPactNote"),
  });

  const selectedPact = WEEKLY_PACTS.find((pact) => pact.key === parsed.weeklyPactKey) ?? WEEKLY_PACTS[0];
  const safeBodyDays = bodyDays.length > 0 ? bodyDays : [...DEFAULT_GOAL_PRESET.bodyDays];
  const admin = createAdminClient();

  let { data: pair } = await admin.from("pairs").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();

  if (!pair) {
    const { data, error } = await admin
      .from("pairs")
      .insert({
        timezone: getPairTimezone(),
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    pair = data;
  }

  const { data: members, error: membersError } = await admin
    .from("pair_members")
    .select("*")
    .eq("pair_id", pair.id);

  if (membersError) {
    throw new Error(membersError.message);
  }

  const memberRows = (members as PairMemberRow[] | null) ?? [];
  const isMember = memberRows.some((member) => member.user_id === user.id);

  if (!isMember && memberRows.length >= 2) {
    throw new Error("Pair da du 2 nguoi.");
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      display_name: parsed.displayName,
      focus_mode: parsed.focusMode,
      setup_completed: true,
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!isMember) {
    const { error: memberError } = await admin.from("pair_members").insert({
      pair_id: pair.id,
      user_id: user.id,
    });

    if (memberError) {
      throw new Error(memberError.message);
    }
  }

  const goalRows = [
    {
      pair_id: pair.id,
      user_id: user.id,
      category: "study",
      title: "Học đủ phút",
      target_value: parsed.studyMinutes,
      unit: "minutes",
      proof_required: true,
      config: {},
      active: true,
    },
    {
      pair_id: pair.id,
      user_id: user.id,
      category: "screen_time",
      title: "Giữ screen time trong giới hạn",
      target_value: parsed.screenTimeMinutes,
      unit: "minutes",
      proof_required: false,
      config: {},
      active: true,
    },
    {
      pair_id: pair.id,
      user_id: user.id,
      category: "body",
      title: parsed.bodyLabel,
      target_value: safeBodyDays.length,
      unit: "days",
      proof_required: true,
      config: {
        ruleType: parsed.bodyRuleType,
        weekdays: safeBodyDays,
      },
      active: true,
    },
  ] satisfies Array<Partial<GoalConfigRow>>;

  const { error: goalError } = await admin.from("goal_configs").upsert(goalRows, {
    onConflict: "user_id,category",
  });

  if (goalError) {
    throw new Error(goalError.message);
  }

  const { weekStart } = getWeekRange(pair.timezone ?? getPairTimezone());

  const { error: pactError } = await admin.from("weekly_pacts").upsert(
    {
      pair_id: pair.id,
      week_start: weekStart,
      template_key: selectedPact.key,
      title: selectedPact.title,
      note: parsed.weeklyPactNote || null,
      created_by: user.id,
    },
    {
      onConflict: "pair_id,week_start",
    },
  );

  if (pactError) {
    throw new Error(pactError.message);
  }

  redirect("/");
}

export async function saveCheckinAction(formData: FormData) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  const category = String(formData.get("category") ?? "");
  const { pair, goals, todayKey, todayRow, admin } = await getMemberContext(user.id);

  const nextRow: Partial<DailyCheckinRow> = {
    ...todayRow,
    pair_id: pair.id,
    user_id: user.id,
    entry_date: todayKey,
  };

  if (category === "study") {
    nextRow.study_minutes = readNumber(formData.get("studyMinutes"));
    nextRow.study_note = readText(formData.get("studyNote"));
    const file = formData.get("studyProof");
    const uploadedPath = await maybeUploadProof({
      admin,
      category: "study",
      dateKey: todayKey,
      existingPath: todayRow?.study_proof_path ?? null,
      file,
      pairId: pair.id,
      userId: user.id,
    });

    if (uploadedPath) {
      nextRow.study_proof_path = uploadedPath;
      nextRow.study_proof_expires_at = getExpiryForDate(todayKey, pair.timezone);
      nextRow.study_had_proof = true;
    }
  }

  if (category === "screen_time") {
    nextRow.screen_time_minutes = readNumber(formData.get("screenTimeMinutes"));
    nextRow.screen_time_note = readText(formData.get("screenTimeNote"));
    const file = formData.get("screenTimeProof");
    const uploadedPath = await maybeUploadProof({
      admin,
      category: "screen_time",
      dateKey: todayKey,
      existingPath: todayRow?.screen_time_proof_path ?? null,
      file,
      pairId: pair.id,
      userId: user.id,
    });

    if (uploadedPath) {
      nextRow.screen_time_proof_path = uploadedPath;
      nextRow.screen_time_proof_expires_at = getExpiryForDate(todayKey, pair.timezone);
      nextRow.screen_time_had_proof = true;
    }
  }

  if (category === "body") {
    nextRow.body_completed = formData.get("bodyCompleted") === "on";
    nextRow.body_note = readText(formData.get("bodyNote"));
    const file = formData.get("bodyProof");
    const uploadedPath = await maybeUploadProof({
      admin,
      category: "body",
      dateKey: todayKey,
      existingPath: todayRow?.body_proof_path ?? null,
      file,
      pairId: pair.id,
      userId: user.id,
    });

    if (uploadedPath) {
      nextRow.body_proof_path = uploadedPath;
      nextRow.body_proof_expires_at = getExpiryForDate(todayKey, pair.timezone);
      nextRow.body_had_proof = true;
    }
  }

  const evaluation = evaluateDay(
    nextRow,
    goals,
    todayKey,
    pair.timezone,
    todayRow?.submitted_at ? "submit" : "draft",
  );

  const { error } = await admin.from("daily_checkins").upsert(
    {
      ...pickPersistedCheckinFields(nextRow, todayRow),
      study_status: evaluation.studyStatus,
      screen_time_status: evaluation.screenTimeStatus,
      body_status: evaluation.bodyStatus,
      personal_day_status: evaluation.personalStatus,
    },
    {
      onConflict: "user_id,entry_date",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function submitDayAction() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  const { pair, goals, todayKey, todayRow, admin } = await getMemberContext(user.id);
  const currentRow = {
    ...createBlankDayRow(pair.id, user.id, todayKey),
    ...todayRow,
  };

  const evaluation = evaluateDay(currentRow, goals, todayKey, pair.timezone, "submit");

  const { error } = await admin.from("daily_checkins").upsert(
    {
      ...pickPersistedCheckinFields(currentRow, todayRow),
      study_status: evaluation.studyStatus,
      screen_time_status: evaluation.screenTimeStatus,
      body_status: evaluation.bodyStatus,
      personal_day_status: evaluation.personalStatus,
      submitted_at: todayRow?.submitted_at ?? new Date().toISOString(),
    },
    {
      onConflict: "user_id,entry_date",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function saveWeeklyPactAction(formData: FormData) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { pair } = await getMemberContext(user.id);
  const templateKey = String(formData.get("templateKey") ?? "");
  const note = readText(formData.get("note"));
  const pact = WEEKLY_PACTS.find((item) => item.key === templateKey) ?? WEEKLY_PACTS[0];
  const { weekStart } = getWeekRange(pair.timezone);

  const { error } = await admin.from("weekly_pacts").upsert(
    {
      pair_id: pair.id,
      week_start: weekStart,
      template_key: pact.key,
      title: pact.title,
      note,
      created_by: user.id,
    },
    {
      onConflict: "pair_id,week_start",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function refreshWeeklyInsightAction() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  const state = await loadAppState(user);

  if (state.kind !== "ready") {
    return;
  }

  const insight = await generateWeeklyInsight(state.data);

  if (!insight) {
    return;
  }

  const admin = createAdminClient();
  const { weekStart, weekEnd } = getWeekRange(state.data.pair.timezone);

  const { error } = await admin.from("ai_reviews").upsert(
    {
      pair_id: state.data.pair.id,
      review_type: "weekly_ai",
      period_start: weekStart,
      period_end: weekEnd,
      title: "Weekly insight",
      content: insight,
      metadata: {
        model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
      },
    },
    {
      onConflict: "pair_id,review_type,period_start,period_end",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function logoutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function getMemberContext(userId: string) {
  const admin = createAdminClient();

  const { data: membership, error: membershipError } = await admin
    .from("pair_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    throw new Error(`${APP_NAME} chua co membership cho tai khoan nay.`);
  }

  const [{ data: pair, error: pairError }, { data: goals, error: goalError }] = await Promise.all([
    admin.from("pairs").select("*").eq("id", membership.pair_id).single(),
    admin.from("goal_configs").select("*").eq("user_id", userId),
  ]);

  if (pairError || goalError) {
    throw new Error(pairError?.message ?? goalError?.message ?? "Failed to load member context.");
  }

  const pairRow = pair as PairRow;
  const todayKey = getTodayKey(pairRow.timezone);
  const { data: row, error: rowError } = await admin
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("entry_date", todayKey)
    .maybeSingle();

  if (rowError) {
    throw new Error(rowError.message);
  }

  let todayRow = row as DailyCheckinRow | null;

  if (todayRow && todayRow.entry_date !== todayKey) {
    todayRow = null;
  }

  return {
    admin,
    pair: pairRow,
    todayKey,
    goals: buildGoalMap((goals as GoalConfigRow[] | null) ?? []),
    todayRow,
  };
}

function buildGoalMap(rows: GoalConfigRow[]): GoalConfigMap {
  return {
    study: rows.find((goal) => goal.category === "study") ?? null,
    screen_time: rows.find((goal) => goal.category === "screen_time") ?? null,
    body: rows.find((goal) => goal.category === "body") ?? null,
  };
}

function readNumber(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readText(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function maybeUploadProof({
  admin,
  category,
  dateKey,
  existingPath,
  file,
  pairId,
  userId,
}: {
  admin: ReturnType<typeof createAdminClient>;
  category: "study" | "screen_time" | "body";
  dateKey: string;
  existingPath: string | null;
  file: FormDataEntryValue | null;
  pairId: string;
  userId: string;
}) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > MAX_PROOF_SIZE_BYTES) {
    throw new Error("Proof vuot qua 5MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${pairId}/${userId}/${dateKey}/${category}-${Date.now()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from(PROOF_BUCKET).upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (existingPath && existingPath !== path) {
    await admin.storage.from(PROOF_BUCKET).remove([existingPath]);
  }

  return path;
}

function pickPersistedCheckinFields(nextRow: Partial<DailyCheckinRow>, existingRow: DailyCheckinRow | null) {
  const base = createBlankDayRow(nextRow.pair_id!, nextRow.user_id!, nextRow.entry_date!);

  return {
    ...base,
    ...existingRow,
    ...nextRow,
  };
}

function createBlankDayRow(pairId: string, userId: string, dateKey: string) {
  return {
    pair_id: pairId,
    user_id: userId,
    entry_date: dateKey,
    personal_day_status: "draft" as const,
    study_minutes: null,
    study_note: null,
    study_proof_path: null,
    study_proof_expires_at: null,
    study_had_proof: false,
    study_status: "pending" as const,
    screen_time_minutes: null,
    screen_time_note: null,
    screen_time_proof_path: null,
    screen_time_proof_expires_at: null,
    screen_time_had_proof: false,
    screen_time_status: "pending" as const,
    body_completed: false,
    body_note: null,
    body_proof_path: null,
    body_proof_expires_at: null,
    body_had_proof: false,
    body_status: "pending" as const,
  };
}
