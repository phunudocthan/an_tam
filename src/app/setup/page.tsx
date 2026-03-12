import Link from "next/link";
import { redirect } from "next/navigation";
import { completeSetupAction } from "@/app/actions";
import { BODY_RULE_OPTIONS, DEFAULT_GOAL_PRESET, WEEKDAY_OPTIONS, WEEKLY_PACTS } from "@/lib/constants";
import { loadAppState, requireUser } from "@/lib/dashboard";
import { hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!hasSupabaseEnv()) {
    redirect("/");
  }

  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  const state = await loadAppState(user);

  if (state.kind === "missing_env" || state.kind === "blocked" || state.kind === "db_not_ready") {
    redirect("/");
  }

  const isEditing = state.kind === "ready";
  const currentProfile = state.kind === "needs_setup" ? state.profile : null;
  const currentStudyGoal = isEditing ? state.data.viewer.goals.study : null;
  const currentScreenGoal = isEditing ? state.data.viewer.goals.screen_time : null;
  const currentBodyGoal = isEditing ? state.data.viewer.goals.body : null;
  const bodyRuleType = readBodyRuleType(currentBodyGoal?.config);
  const bodyDays = readBodyDays(currentBodyGoal?.config);

  return (
    <main className="page-shell px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
              {isEditing ? "Chỉnh nhịp" : "Thiết lập"}
            </p>
            <h1 className="display-type mt-3 text-4xl font-semibold sm:text-5xl">
              {isEditing ? "Chỉnh lại nhịp của bạn" : "Chốt nhịp riêng của bạn"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              {isEditing
                ? "Đổi target, lịch Body hoặc kèo tuần ở đây. Lưu xong là quay lại màn hôm nay."
                : "Mỗi người có mục tiêu riêng. Chốt vài rule cơ bản trước để từ mai hai đứa theo dõi nhau cho dễ."}
            </p>
          </div>

          {isEditing ? (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 bg-white/78 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
            >
              Quay lại hôm nay
            </Link>
          ) : null}
        </div>

        <form action={completeSetupAction} className="grid gap-6">
          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">1. Thông tin của bạn</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Tên hiển thị</span>
                <input
                  required
                  name="displayName"
                  defaultValue={isEditing ? state.data.viewer.name : (currentProfile?.display_name ?? "")}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Mục tiêu Body</span>
                <select
                  name="focusMode"
                  defaultValue={isEditing ? (state.data.viewer.focusMode ?? "gain") : (currentProfile?.focus_mode ?? "gain")}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="gain">Tăng cân / bulk</option>
                  <option value="cut">Giảm cân / cut</option>
                </select>
              </label>
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">2. Rule mỗi ngày</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Mục tiêu học mỗi ngày (phút)</span>
                <input
                  required
                  min={15}
                  max={600}
                  step={5}
                  type="number"
                  name="studyMinutes"
                  defaultValue={currentStudyGoal?.target_value ?? DEFAULT_GOAL_PRESET.studyMinutes}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Giới hạn điện thoại (phút)</span>
                <input
                  required
                  min={15}
                  max={720}
                  step={5}
                  type="number"
                  name="screenTimeMinutes"
                  defaultValue={currentScreenGoal?.target_value ?? DEFAULT_GOAL_PRESET.screenTimeMinutes}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Cách chấm mục Body</span>
                <select
                  name="bodyRuleType"
                  defaultValue={bodyRuleType}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                >
                  {BODY_RULE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Tên ngắn cho mục Body</span>
                <input
                  required
                  name="bodyLabel"
                  defaultValue={currentBodyGoal?.title ?? DEFAULT_GOAL_PRESET.bodyLabel}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <div className="space-y-3 text-sm text-[var(--muted)]">
                <span className="block">Những ngày áp dụng</span>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <label
                      key={day.value}
                      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[var(--foreground)]"
                    >
                        <input
                          type="checkbox"
                          name="bodyDays"
                          value={day.value}
                          defaultChecked={bodyDays.includes(day.value)}
                        />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">3. Kèo chung trong tuần</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Mẫu kèo</span>
                <select
                  name="weeklyPactKey"
                  defaultValue={isEditing ? (state.data.weeklyPact?.template_key ?? WEEKLY_PACTS[0].key) : WEEKLY_PACTS[0].key}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                >
                  {WEEKLY_PACTS.map((pact) => (
                    <option key={pact.key} value={pact.key}>
                      {pact.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Ghi chú thêm</span>
                <input
                  name="weeklyPactNote"
                  defaultValue={isEditing ? (state.data.weeklyPact?.note ?? "") : ""}
                  placeholder="Ví dụ: ai xong trước thì nhắc người kia một câu"
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted)]">
              {!isEditing
                ? `Hiện đã có ${state.memberCount}/2 người xong phần thiết lập.`
                : "Lưu xong là quay lại màn hôm nay."}
            </p>
            <button
              type="submit"
              className="rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {isEditing ? "Lưu thay đổi" : "Lưu và vào app"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function readBodyRuleType(config: Record<string, unknown> | null | undefined) {
  const ruleType = config?.ruleType;

  if (ruleType === "workout" || ruleType === "nutrition" || ruleType === "recovery") {
    return ruleType;
  }

  return DEFAULT_GOAL_PRESET.bodyRuleType;
}

function readBodyDays(config: Record<string, unknown> | null | undefined) {
  const raw = config?.weekdays;

  if (!Array.isArray(raw)) {
    return [...DEFAULT_GOAL_PRESET.bodyDays];
  }

  const values = raw
    .map((value) => Number(value))
    .filter((value) => WEEKDAY_OPTIONS.some((option) => option.value === value));

  return values.length > 0 ? values : [...DEFAULT_GOAL_PRESET.bodyDays];
}
