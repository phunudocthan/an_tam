import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Flame,
  HeartHandshake,
  LogOut,
  MoonStar,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TimerReset,
} from "lucide-react";
import {
  logoutAction,
  refreshWeeklyInsightAction,
  saveCheckinAction,
  saveWeeklyPactAction,
  submitDayAction,
} from "@/app/actions";
import { PROOF_INPUT_ACCEPT, WEEKLY_PACTS } from "@/lib/constants";
import {
  getBodyRuleLabel,
  getBodyScheduledDays,
  getFocusLabel,
  getGoalLabel,
  getTargetText,
  loadAppState,
  requireUser,
} from "@/lib/dashboard";
import { getWeekdayInTimezone } from "@/lib/date";
import { hasSupabaseEnv } from "@/lib/env";
import type { DailyCheckinRow, DashboardData, GoalCategory, PersonSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!hasSupabaseEnv()) {
    return <ConfigState />;
  }

  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  const state = await loadAppState(user);

  if (state.kind === "needs_setup") {
    redirect("/setup");
  }

  if (state.kind === "missing_env") {
    return <ConfigState />;
  }

  if (state.kind === "blocked") {
    return (
      <SimpleState
        eyebrow="Access locked"
        title="Tài khoản này chưa được ghép vào pair."
        copy={state.reason}
      />
    );
  }

  if (state.kind === "db_not_ready") {
    return (
      <SimpleState
        eyebrow="Database chưa xong"
        title="App đã được scaffold, nhưng schema Supabase chưa có."
        copy={state.message}
      />
    );
  }

  const { data } = state;
  const bodyScheduledToday = getBodyScheduledDays(data.viewer.goals.body).includes(
    getWeekdayInTimezone(data.todayKey, data.pair.timezone),
  );

  return (
    <main className="page-shell px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card mb-6 rounded-[2rem] px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1.5 text-xs font-medium tracking-[0.18em] text-[var(--muted)] uppercase">
                <HeartHandshake className="size-4" />
                Couple accountability MVP
              </div>
              <h1 className="display-type text-3xl font-semibold leading-tight sm:text-5xl">
                Khác mục tiêu, nhưng vẫn phải chờ nhau.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Hôm nay {data.viewer.name} đang đi theo hướng {getFocusLabel(data.viewer.focusMode).toLowerCase()}.
                {data.partner
                  ? ` ${data.partner.name} thì khác hướng, nhưng shared streak chỉ đi tiếp khi cả hai đều qua ngày.`
                  : " Người kia chưa setup xong, nên board này đang chờ đầy đủ 2 người để bật đúng cảm giác sản phẩm."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatPill icon={Flame} label="Shared streak" value={`${data.sharedStreak} ngày`} />
              <StatPill
                icon={ShieldCheck}
                label="Grace"
                value={data.sharedGraceProtectedDates.includes(data.todayKey) ? "Đã dùng hôm nay" : "1 / 7 ngày"}
              />
              <StatPill icon={Clock3} label="State" value={todayStateLabel(data.todayState)} />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
                >
                  <LogOut className="size-4" />
                  Đăng xuất
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 xl:grid-cols-[1.38fr_0.62fr]">
          <div className="glass-card rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Today board</p>
                <h2 className="display-type mt-2 text-3xl font-semibold">Ngày hôm nay đang ở đâu?</h2>
              </div>
              <div className="max-w-3xl rounded-[1.5rem] border border-black/10 bg-white/70 px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                {data.dailyRecap}
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <CheckinCard
                category="study"
                title="Study"
                icon={MoonStar}
                accent="var(--gold)"
                target={getTargetText(data.viewer.goals.study, "study")}
                label={getGoalLabel(data.viewer.goals.study, "study")}
                status={data.viewer.today?.study_status ?? "pending"}
                partnerStatus={data.partner?.today?.study_status ?? "pending"}
              >
                <form action={saveCheckinAction} className="space-y-3">
                  <input type="hidden" name="category" value="study" />
                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Số phút học</span>
                    <input
                      type="number"
                      min={0}
                      name="studyMinutes"
                      defaultValue={data.viewer.today?.study_minutes ?? ""}
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Proof học</span>
                    <input
                      type="file"
                      name="studyProof"
                      accept={PROOF_INPUT_ACCEPT}
                      className="block w-full text-sm text-[var(--muted)]"
                    />
                  </label>
                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Note</span>
                    <textarea
                      name="studyNote"
                      rows={3}
                      defaultValue={data.viewer.today?.study_note ?? ""}
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <SaveButton label="Lưu study" fullWidth />
                </form>
              </CheckinCard>

              <CheckinCard
                category="screen_time"
                title="Screen time"
                icon={Smartphone}
                accent="var(--accent)"
                target={getTargetText(data.viewer.goals.screen_time, "screen_time")}
                label={getGoalLabel(data.viewer.goals.screen_time, "screen_time")}
                status={data.viewer.today?.screen_time_status ?? "pending"}
                partnerStatus={data.partner?.today?.screen_time_status ?? "pending"}
              >
                <form action={saveCheckinAction} className="space-y-3">
                  <input type="hidden" name="category" value="screen_time" />
                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Screen time hôm nay (phút)</span>
                    <input
                      type="number"
                      min={0}
                      name="screenTimeMinutes"
                      defaultValue={data.viewer.today?.screen_time_minutes ?? ""}
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Screenshot (không bắt buộc)</span>
                    <input
                      type="file"
                      name="screenTimeProof"
                      accept={PROOF_INPUT_ACCEPT}
                      className="block w-full text-sm text-[var(--muted)]"
                    />
                  </label>
                  <label className="block space-y-2 text-sm text-[var(--muted)]">
                    <span>Note</span>
                    <textarea
                      name="screenTimeNote"
                      rows={3}
                      defaultValue={data.viewer.today?.screen_time_note ?? ""}
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <SaveButton label="Lưu screen time" fullWidth />
                </form>
              </CheckinCard>

              <div className="xl:col-span-2">
                <CheckinCard
                  category="body"
                  title="Body"
                  icon={Dumbbell}
                  accent="var(--rose)"
                  target={getTargetText(data.viewer.goals.body, "body")}
                  label={`${getGoalLabel(data.viewer.goals.body, "body")} · ${getBodyRuleLabel(data.viewer.goals.body)}`}
                  status={bodyScheduledToday ? data.viewer.today?.body_status ?? "pending" : "na"}
                  partnerStatus={
                    data.partner
                      ? getBodyScheduledDays(data.partner.goals.body).includes(
                          getWeekdayInTimezone(data.todayKey, data.pair.timezone),
                        )
                        ? data.partner.today?.body_status ?? "pending"
                        : "na"
                      : "pending"
                  }
                >
                  <form action={saveCheckinAction} className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <input type="hidden" name="category" value="body" />
                    <div className="space-y-3">
                      <label className="inline-flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-sm text-[var(--foreground)]">
                        <input type="checkbox" name="bodyCompleted" defaultChecked={data.viewer.today?.body_completed ?? false} />
                        Hôm nay tôi đã bám đúng plan body của mình
                      </label>
                      <p className="rounded-2xl border border-black/8 bg-white/65 px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                        {bodyScheduledToday
                          ? "Body được tính hôm nay. Proof là bắt buộc để mục này pass."
                          : "Hôm nay không nằm trong lịch body của bạn, nên card này đang ở trạng thái N/A."}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="block space-y-2 text-sm text-[var(--muted)]">
                        <span>Proof body</span>
                        <input
                          type="file"
                          name="bodyProof"
                          accept={PROOF_INPUT_ACCEPT}
                          className="block w-full text-sm text-[var(--muted)]"
                        />
                      </label>
                      <label className="block space-y-2 text-sm text-[var(--muted)]">
                        <span>Note</span>
                        <textarea
                          name="bodyNote"
                          rows={3}
                          defaultValue={data.viewer.today?.body_note ?? ""}
                          className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                        />
                      </label>
                      <SaveButton label="Lưu body" fullWidth />
                    </div>
                  </form>
                </CheckinCard>
              </div>
            </div>

            <form action={submitDayAction} className="mt-5">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Khóa ngày hôm nay
                <ArrowRight className="size-4" />
              </button>
            </form>
          </div>

          <aside className="space-y-4">
            <div className="glass-card rounded-[2rem] p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Nhìn thấy nhau</p>
              <div className="mt-4 grid gap-3">
                <PersonCard person={data.viewer} row={data.viewer.today} current />
                {data.partner ? <PersonCard person={data.partner} row={data.partner.today} /> : <WaitingPartnerCard />}
              </div>
            </div>

            <div className="glass-card rounded-[2rem] p-5">
              <div className="flex items-center gap-2 text-[var(--foreground)]">
                <TimerReset className="size-4" />
                <p className="font-semibold">Pact tuần</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Shared streak là phần cứng. Pact tuần là phần mềm giúp hai người cảm thấy cùng phe.
              </p>
              <form action={saveWeeklyPactAction} className="mt-4 space-y-3">
                <select
                  name="templateKey"
                  defaultValue={data.weeklyPact?.template_key ?? WEEKLY_PACTS[0].key}
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                >
                  {WEEKLY_PACTS.map((pact) => (
                    <option key={pact.key} value={pact.key}>
                      {pact.title}
                    </option>
                  ))}
                </select>
                <textarea
                  name="note"
                  rows={3}
                  defaultValue={data.weeklyPact?.note ?? ""}
                  placeholder="Ví dụ: ai xong sớm thì nhắc người kia bằng 1 câu thôi, không cằn nhằn"
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
                <SaveButton label="Lưu pact tuần" subtle />
              </form>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center gap-2 text-[var(--foreground)]">
              <Sparkles className="size-4" />
              <h2 className="font-semibold">Weekly insight</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Daily recap đi theo rule. Weekly insight mới dùng AI, và chỉ nên nói ra pattern thật cùng vài thay đổi nhỏ cho tuần tới.
            </p>
            <div className="mt-4 rounded-[1.5rem] border border-black/10 bg-white/65 p-4">
              {data.weeklyInsight ? (
                <pre className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">{data.weeklyInsight.content}</pre>
              ) : (
                <div className="space-y-2 text-sm leading-6 text-[var(--muted)]">
                  <p>Chưa có weekly insight lưu sẵn cho tuần này.</p>
                  <p>
                    Hiện tại {data.viewer.name} pass study {data.weeklyStats.viewer.studyPassDays}/7 ngày, screen time giữ được{" "}
                    {data.weeklyStats.viewer.screenWins}/7 ngày, body đạt {data.weeklyStats.viewer.bodyPassDays}/
                    {data.weeklyStats.viewer.bodyScheduledDays} ngày lên lịch.
                  </p>
                </div>
              )}
            </div>
            <form action={refreshWeeklyInsightAction} className="mt-4">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
              >
                Làm mới weekly insight
              </button>
            </form>
          </div>

          <div className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center gap-2 text-[var(--foreground)]">
              <CheckCircle2 className="size-4" />
              <h2 className="font-semibold">7 ngày gần nhất</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data.history.map((day) => (
                <div
                  key={day.date}
                  className="grid gap-3 rounded-[1.5rem] border border-black/8 bg-white/65 px-4 py-3 text-sm sm:grid-cols-[0.9fr_1fr_1fr_1fr]"
                >
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{day.label}</p>
                    <p className="text-[var(--muted)]">{day.date}</p>
                  </div>
                  <HistoryBadge label={data.viewer.name} status={day.viewerStatus} />
                  <HistoryBadge label={data.partner?.name ?? "Người kia"} status={day.partnerStatus} />
                  <HistoryBadge label="Shared" status={day.sharedStatus} shared />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ConfigState() {
  return (
    <SimpleState
      eyebrow="Missing env"
      title="App đã có đủ UI và flow, nhưng chưa có env runtime."
      copy="Thêm Supabase URL + publishable key + service role key + Gemini key vào `.env.local`, rồi app sẽ bật ngay."
    />
  );
}

function SimpleState({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-8">
      <div className="glass-card max-w-2xl rounded-[2rem] p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">{eyebrow}</p>
        <h1 className="display-type mt-4 text-4xl font-semibold text-[var(--foreground)]">{title}</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">{copy}</p>
      </div>
    </main>
  );
}

function CheckinCard({
  title,
  label,
  target,
  status,
  partnerStatus,
  accent,
  icon: Icon,
  children,
}: {
  category: GoalCategory;
  title: string;
  label: string;
  target: string;
  status: string;
  partnerStatus: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-black/8 bg-white/65 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            <Icon className="size-4" />
            {title}
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">{label}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{target}</p>
        </div>
        <div className="space-y-2 text-right">
          <StatusPill label="Bạn" status={status} />
          <StatusPill label="Người kia" status={partnerStatus} muted />
        </div>
      </div>
      <div className="mt-4 rounded-[1.5rem] border border-black/8 p-4" style={{ backgroundColor: `${accent}12` }}>
        {children}
      </div>
    </section>
  );
}

function SaveButton({ label, subtle = false, fullWidth = false }: { label: string; subtle?: boolean; fullWidth?: boolean }) {
  return (
    <button
      type="submit"
      className={
        subtle
          ? `${fullWidth ? "w-full justify-center" : ""} rounded-full border border-black/10 bg-white/85 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white`
          : `${fullWidth ? "w-full justify-center" : ""} inline-flex items-center rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90`
      }
    >
      {label}
    </button>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-black/10 bg-white/70 px-4 py-2.5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function PersonCard({
  person,
  row,
  current = false,
}: {
  person: PersonSummary;
  row: DailyCheckinRow | null;
  current?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/8 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">
            {person.name} {current ? "· bạn" : ""}
          </p>
          <p className="text-sm text-[var(--muted)]">{getFocusLabel(person.focusMode)}</p>
        </div>
        <StatusPill
          label="Hôm nay"
          status={row?.submitted_at ? row.personal_day_status : "waiting"}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--muted)]">
        <MiniMetric label="Study" value={row?.study_status ?? "pending"} />
        <MiniMetric label="Screen" value={row?.screen_time_status ?? "pending"} />
        <MiniMetric label="Body" value={row?.body_status ?? "pending"} />
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">Streak cá nhân: {person.streak} ngày</p>
    </div>
  );
}

function WaitingPartnerCard() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-white/60 p-4 text-sm leading-6 text-[var(--muted)]">
      Người kia chưa vào app hoặc chưa setup xong. Khi đủ 2 người, card này sẽ biến thành bảng trạng thái chờ nhau theo ngày.
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white/75 px-3 py-2 text-center">
      <p className="font-medium text-[var(--foreground)]">{label}</p>
      <p className="mt-1">{statusLabel(value)}</p>
    </div>
  );
}

function HistoryBadge({ label, status, shared = false }: { label: string; status: string; shared?: boolean }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white/75 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-sm font-medium ${shared ? "text-[var(--foreground)]" : "text-[var(--foreground)]"}`}>
        {statusLabel(status)}
      </p>
    </div>
  );
}

function StatusPill({
  label,
  status,
  muted = false,
}: {
  label: string;
  status: string;
  muted?: boolean;
}) {
  const tone = statusTone(status, muted);

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${tone}`}>
      <span>{label}</span>
      <span>{statusLabel(status)}</span>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "pass" || status === "shared_pass") return "Pass";
  if (status === "fail" || status === "shared_fail") return "Trượt";
  if (status === "protected" || status === "grace_protected") return "Grace giữ";
  if (status === "na") return "N/A";
  if (status === "waiting" || status === "waiting_for_partner") return "Đang chờ";
  if (status === "waiting_for_you") return "Tới lượt bạn";
  if (status === "draft") return "Draft";
  if (status === "idle" || status === "missing") return "Chưa có";
  return "Pending";
}

function todayStateLabel(state: DashboardData["todayState"]) {
  if (state === "shared_pass") return "Cả hai đều qua";
  if (state === "waiting_for_partner") return "Bạn xong rồi";
  if (state === "waiting_for_you") return "Người kia đang chờ";
  if (state === "grace_protected") return "Được grace giữ";
  if (state === "shared_fail") return "Hôm nay hụt";
  return "Chưa khóa ngày";
}

function statusTone(status: string, muted: boolean) {
  if (status === "pass" || status === "shared_pass") {
    return muted
      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border border-emerald-200 bg-emerald-100 text-emerald-800";
  }

  if (status === "fail" || status === "shared_fail") {
    return muted
      ? "border border-rose-200 bg-rose-50 text-rose-700"
      : "border border-rose-200 bg-rose-100 text-rose-800";
  }

  if (status === "protected" || status === "grace_protected") {
    return muted
      ? "border border-amber-200 bg-amber-50 text-amber-700"
      : "border border-amber-200 bg-amber-100 text-amber-800";
  }

  if (status === "na") {
    return "border border-slate-200 bg-slate-50 text-slate-700";
  }

  return muted
    ? "border border-black/8 bg-white/75 text-[var(--muted)]"
    : "border border-black/8 bg-white/90 text-[var(--foreground)]";
}
