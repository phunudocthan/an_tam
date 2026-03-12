import {
  DEFAULT_GOAL_PRESET,
  DEFAULT_NUTRITION_CHECKPOINT_COUNT,
  MAX_NUTRITION_CHECKPOINT_COUNT,
  MIN_NUTRITION_CHECKPOINT_COUNT,
  WEEKDAY_OPTIONS,
} from "@/lib/constants";
import type { BodyCheckpointEntryRow, BodyRuleType, GoalConfigRow } from "@/lib/types";

export function getBodyRuleType(goal: GoalConfigRow | null): BodyRuleType {
  const raw = goal?.config?.ruleType;

  if (raw === "nutrition" || raw === "recovery" || raw === "workout") {
    return raw;
  }

  return DEFAULT_GOAL_PRESET.bodyRuleType;
}

export function getBodyScheduledDays(goal: GoalConfigRow | null) {
  const raw = goal?.config && Array.isArray(goal.config.weekdays) ? goal.config.weekdays : DEFAULT_GOAL_PRESET.bodyDays;

  return raw
    .map((value) => Number(value))
    .filter((value) => WEEKDAY_OPTIONS.some((option) => option.value === value));
}

export function isNutritionGoal(goal: GoalConfigRow | null) {
  return getBodyRuleType(goal) === "nutrition";
}

export function getBodyCheckpointCount(goal: GoalConfigRow | null) {
  if (!isNutritionGoal(goal)) {
    return 0;
  }

  const raw = Number(goal?.config?.checkpointCount);

  if (Number.isInteger(raw) && raw >= MIN_NUTRITION_CHECKPOINT_COUNT && raw <= MAX_NUTRITION_CHECKPOINT_COUNT) {
    return raw;
  }

  return DEFAULT_NUTRITION_CHECKPOINT_COUNT;
}

export function buildBodyCheckpointSlots(entries: BodyCheckpointEntryRow[], count: number) {
  return Array.from({ length: count }, (_, index) => {
    const checkpointIndex = index + 1;
    const existing = entries.find((entry) => entry.checkpoint_index === checkpointIndex) ?? null;

    return {
      checkpointIndex,
      completed: existing?.completed ?? false,
      note: existing?.note ?? null,
      proofPath: existing?.proof_path ?? null,
      proofExpiresAt: existing?.proof_expires_at ?? null,
      hadProof: existing?.had_proof ?? false,
    };
  });
}

export function getCompletedBodyCheckpointCount(entries: BodyCheckpointEntryRow[]) {
  return entries.filter((entry) => entry.completed).length;
}

export function clampCheckpointCount(value: number | null | undefined) {
  if (!Number.isInteger(value)) {
    return DEFAULT_NUTRITION_CHECKPOINT_COUNT;
  }

  const safeValue = Number(value);
  return Math.min(MAX_NUTRITION_CHECKPOINT_COUNT, Math.max(MIN_NUTRITION_CHECKPOINT_COUNT, safeValue));
}
