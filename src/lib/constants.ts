export const APP_NAME = "An Tam";
export const PROOF_BUCKET = "proofs";
export const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;
export const PROOF_INPUT_ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/heif";
export const ALLOWED_PROOF_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
export const PAIR_CAPACITY = 2;

export const GOAL_CATEGORIES = ["study", "screen_time", "body"] as const;
export const CHECKIN_STATUSES = ["pending", "pass", "fail", "na"] as const;
export const PERSONAL_DAY_STATUSES = ["draft", "pass", "fail"] as const;
export const REVIEW_TYPES = ["daily_rule", "weekly_ai"] as const;

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
] as const;

export const BODY_RULE_OPTIONS = [
  {
    value: "workout",
    label: "Buổi tập",
    helper: "Phù hợp nếu bạn muốn đếm ngày đi gym hoặc hoàn thành buổi tập.",
  },
  {
    value: "nutrition",
    label: "Kỷ luật ăn uống",
    helper: "Dùng cho surplus, deficit, đủ bữa hoặc giữ meal plan trong ngày.",
  },
  {
    value: "recovery",
    label: "Đi bộ / recovery",
    helper: "Dành cho bước chân, mobility hoặc ngày hồi phục có chủ đích.",
  },
] as const;

export const WEEKLY_PACTS = [
  {
    key: "same_evening_finish",
    title: "Chốt ngày trước 23:00",
    description: "Cả hai cùng submit trước 23:00 ít nhất 5 ngày trong tuần.",
  },
  {
    key: "quiet_study_hour",
    title: "1 giờ yên tĩnh chung",
    description: "Dành ra một khung giờ học yên tĩnh chung trong tuần, ai học gì cũng được.",
  },
  {
    key: "sunday_reset",
    title: "Chủ nhật reset nhẹ",
    description: "Cuối tuần cùng xem lại tuần cũ và chỉnh goal tuần mới trong 10 phút.",
  },
  {
    key: "walk_and_talk",
    title: "Đi bộ và gọi nhau",
    description: "Chốt một buổi đi bộ hoặc call ngắn để kéo nhau về đúng nhịp.",
  },
] as const;

export const DEFAULT_GOAL_PRESET = {
  studyMinutes: 60,
  screenTimeMinutes: 180,
  bodyLabel: "Bám sát plan body hôm nay",
  bodyRuleType: "workout",
  bodyDays: [1, 3, 5],
} as const;
