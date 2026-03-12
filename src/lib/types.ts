import {
  CHECKIN_STATUSES,
  GOAL_CATEGORIES,
  PERSONAL_DAY_STATUSES,
  REVIEW_TYPES,
} from "@/lib/constants";

export type GoalCategory = (typeof GOAL_CATEGORIES)[number];
export type CheckinStatus = (typeof CHECKIN_STATUSES)[number];
export type PersonalDayStatus = (typeof PERSONAL_DAY_STATUSES)[number];
export type ReviewType = (typeof REVIEW_TYPES)[number];

export type BodyRuleType = "workout" | "nutrition" | "recovery";
export type BodyFocus = "gain" | "cut";

export type GoalConfigRow = {
  id: string;
  pair_id: string;
  user_id: string;
  category: GoalCategory;
  title: string;
  target_value: number | null;
  unit: string | null;
  proof_required: boolean;
  config: Record<string, unknown> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  focus_mode: BodyFocus | null;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type PairRow = {
  id: string;
  timezone: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PairMemberRow = {
  pair_id: string;
  user_id: string;
  created_at: string;
};

export type DailyCheckinRow = {
  id: string;
  pair_id: string;
  user_id: string;
  entry_date: string;
  submitted_at: string | null;
  personal_day_status: PersonalDayStatus;
  study_minutes: number | null;
  study_note: string | null;
  study_proof_path: string | null;
  study_proof_expires_at: string | null;
  study_had_proof: boolean;
  study_status: CheckinStatus;
  screen_time_minutes: number | null;
  screen_time_note: string | null;
  screen_time_proof_path: string | null;
  screen_time_proof_expires_at: string | null;
  screen_time_had_proof: boolean;
  screen_time_status: CheckinStatus;
  body_completed: boolean;
  body_note: string | null;
  body_proof_path: string | null;
  body_proof_expires_at: string | null;
  body_had_proof: boolean;
  body_status: CheckinStatus;
  created_at: string;
  updated_at: string;
};

export type WeeklyPactRow = {
  id: string;
  pair_id: string;
  week_start: string;
  template_key: string;
  title: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AiReviewRow = {
  id: string;
  pair_id: string;
  review_type: ReviewType;
  period_start: string;
  period_end: string;
  title: string;
  content: string;
  metadata: Record<string, unknown> | null;
  generated_at: string;
};

export type GoalConfigMap = Record<GoalCategory, GoalConfigRow | null>;

export type PersonSummary = {
  userId: string;
  email: string;
  name: string;
  focusMode: BodyFocus | null;
  goals: GoalConfigMap;
  today: DailyCheckinRow | null;
  streak: number;
};

export type HistoryDay = {
  date: string;
  label: string;
  viewerStatus: PersonalDayStatus | "waiting";
  partnerStatus: PersonalDayStatus | "waiting" | "missing";
  sharedStatus: "waiting" | "pass" | "protected" | "fail" | "idle";
};

export type WeeklyStats = {
  studyPassDays: number;
  studyMinutes: number;
  screenWins: number;
  averageScreenTime: number;
  bodyPassDays: number;
  bodyScheduledDays: number;
};

export type DashboardData = {
  pair: PairRow;
  viewer: PersonSummary;
  partner: PersonSummary | null;
  memberCount: number;
  todayKey: string;
  weekStart: string;
  sharedStreak: number;
  sharedGraceProtectedDates: string[];
  weeklyPact: WeeklyPactRow | null;
  dailyRecap: string;
  weeklyInsight: AiReviewRow | null;
  weeklyStats: {
    viewer: WeeklyStats;
    partner: WeeklyStats | null;
  };
  history: HistoryDay[];
  todayState:
    | "draft"
    | "waiting_for_you"
    | "waiting_for_partner"
    | "shared_pass"
    | "grace_protected"
    | "shared_fail";
};
