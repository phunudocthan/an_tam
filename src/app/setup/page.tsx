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

  if (state.kind === "ready") {
    redirect("/");
  }

  return (
    <main className="page-shell px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Setup</p>
          <h1 className="display-type mt-3 text-4xl font-semibold sm:text-5xl">Khóa nhịp riêng của bạn trước.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Ở An Tam, mỗi người có rule riêng. Bulk hay cut đều được, miễn là khi bước vào ngày mới, hai người vẫn cảm thấy
            đang đi cùng nhau.
          </p>
        </div>

        <form action={completeSetupAction} className="grid gap-6">
          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">1. Nhận diện của bạn trong app</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Tên hiển thị</span>
                <input
                  required
                  name="displayName"
                  defaultValue={state.kind === "needs_setup" ? (state.profile?.display_name ?? "") : ""}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Body direction</span>
                <select
                  name="focusMode"
                  defaultValue={state.kind === "needs_setup" ? (state.profile?.focus_mode ?? "gain") : "gain"}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="gain">Tăng cân / bulk</option>
                  <option value="cut">Giảm cân / cut</option>
                </select>
              </label>
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">2. Daily rule cá nhân</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Study target mỗi ngày</span>
                <input
                  required
                  min={15}
                  max={600}
                  step={5}
                  type="number"
                  name="studyMinutes"
                  defaultValue={DEFAULT_GOAL_PRESET.studyMinutes}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Screen time limit</span>
                <input
                  required
                  min={15}
                  max={720}
                  step={5}
                  type="number"
                  name="screenTimeMinutes"
                  defaultValue={DEFAULT_GOAL_PRESET.screenTimeMinutes}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Body rule type</span>
                <select
                  name="bodyRuleType"
                  defaultValue={DEFAULT_GOAL_PRESET.bodyRuleType}
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
                <span>Label cho body card</span>
                <input
                  required
                  name="bodyLabel"
                  defaultValue={DEFAULT_GOAL_PRESET.bodyLabel}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <div className="space-y-3 text-sm text-[var(--muted)]">
                <span className="block">Ngày áp dụng trong tuần</span>
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
                          defaultChecked={(DEFAULT_GOAL_PRESET.bodyDays as readonly number[]).includes(day.value)}
                        />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">3. Pact chung của tuần</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Preset</span>
                <select
                  name="weeklyPactKey"
                  defaultValue={WEEKLY_PACTS[0].key}
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
                <span>Note ngắn</span>
                <input
                  name="weeklyPactNote"
                  placeholder="Ví dụ: ai xong sớm thì ping người kia"
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted)]">
              {state.kind === "needs_setup"
                ? `Hiện đã có ${state.memberCount}/2 người trong pair này.`
                : "Sau bước này bạn sẽ vào thẳng Today board."}
            </p>
            <button
              type="submit"
              className="rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Lưu setup và vào app
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
