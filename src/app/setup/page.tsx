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
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Thiết lập</p>
          <h1 className="display-type mt-3 text-4xl font-semibold sm:text-5xl">Chốt cách bạn muốn đi qua mỗi ngày.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Thiết lập này không phải để chấm điểm cho đẹp. Nó chỉ định nghĩa thế nào là một ngày đủ của riêng bạn để hai người còn giữ được cùng một nhịp.
          </p>
        </div>

        <form action={completeSetupAction} className="grid gap-6">
          <section className="glass-card rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">1. Bạn muốn hiện lên thế nào?</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Tên hiện trong app</span>
                <input
                  required
                  name="displayName"
                  defaultValue={state.kind === "needs_setup" ? (state.profile?.display_name ?? "") : ""}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Hướng body của bạn</span>
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
            <h2 className="text-lg font-semibold text-[var(--foreground)]">2. Nhịp riêng của bạn mỗi ngày</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Mỗi ngày bạn muốn học bao lâu?</span>
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
                <span>Giới hạn màn hình mỗi ngày</span>
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
                <span>Hôm nay body được tính theo gì?</span>
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
                <span className="block text-xs leading-6 text-[var(--muted)]">
                  Chọn kiểu rule khiến bạn thấy “hôm nay mình đã giữ lời với bản thân”.
                </span>
              </label>

              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Câu nhắc cho mục body</span>
                <input
                  required
                  name="bodyLabel"
                  defaultValue={DEFAULT_GOAL_PRESET.bodyLabel}
                  className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <div className="space-y-3 text-sm text-[var(--muted)]">
                <span className="block">Ngày nào trong tuần mục này được tính?</span>
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
            <h2 className="text-lg font-semibold text-[var(--foreground)]">3. Hai người sẽ giữ nhau thế nào trong tuần này?</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>Cách giữ nhịp</span>
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
                <span>Một câu để nhớ</span>
                <input
                  name="weeklyPactNote"
                  placeholder="Ví dụ: ai xong sớm thì nhắc người kia một câu ngắn"
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
