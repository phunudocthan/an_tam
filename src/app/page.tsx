import Link from "next/link";
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
import { ProofUploadField } from "@/components/proof-upload-field";
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

type DashboardTab = "today" | "pair" | "review";
type GoalTab = GoalCategory;

const DASHBOARD_TABS = [
  { key: "today" as const, label: "Hôm nay", icon: CheckCircle2 },
  { key: "pair" as const, label: "Cặp đôi", icon: HeartHandshake },
  { key: "review" as const, label: "Review", icon: Sparkles },
] satisfies Array<{
  key: DashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}>;

const GOAL_TABS = [
  { key: "study" as const, label: "Study", icon: MoonStar, accent: "var(--gold)" },
  { key: "screen_time" as const, label: "Screen time", icon: Smartphone, accent: "var(--accent)" },
  { key: "body" as const, label: "Body", icon: Dumbbell, accent: "var(--rose)" },
] satisfies Array<{
  key: GoalTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; goal?: string }>;
}) {
  if (!hasSupabaseEnv()) {
    return <ConfigState />;
  }

  const params = await searchParams;
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
  const activeTab = normalizeDashboardTab(params.tab);
  const activeGoal = normalizeGoalTab(params.goal);
  const bodyScheduledToday = getBodyScheduledDays(data.viewer.goals.body).includes(
    getWeekdayInTimezone(data.todayKey, data.pair.timezone),
  );
  const partnerName = data.partner?.name ?? null;

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
                  : " Còn 1 người chưa setup xong, nên board này vẫn đang chờ đủ 2 người để bật đúng loop chờ nhau."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatPill icon={Flame} label="Shared streak" value={`${data.sharedStreak} ngày`} />
              <StatPill
                icon={ShieldCheck}
                label="Grace"
                value={data.sharedGraceProtectedDates.includes(data.todayKey) ? "Đã dùng hôm nay" : "1 / 7 ngày"}
              />
              <StatPill icon={Clock3} label="State" value={todayStateLabel(data.todayState, partnerName)} />
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

        <section className="mb-6">
          <div className="glass-card sticky top-3 z-10 rounded-[1.5rem] p-2">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {DASHBOARD_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                  <Link
                    key={tab.key}
                    href={dashboardTabHref(tab.key, activeGoal)}
                    scroll={false}
                    className={`inline-flex min-w-[8.75rem] flex-1 items-center justify-center gap-2 rounded-[1.15rem] px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                      isActive
                        ? "border border-black/10 bg-white text-[var(--foreground)] shadow-[0_16px_30px_rgba(27,25,22,0.08)]"
                        : "bg-white/55 text-[var(--muted)] hover:bg-white/85"
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? "text-[var(--accent)]" : ""}`} />
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        {activeTab === "today" ? <TodayTab data={data} bodyScheduledToday={bodyScheduledToday} activeGoal={activeGoal} /> : null}
        {activeTab === "pair" ? <PairTab data={data} /> : null}
        {activeTab === "review" ? <ReviewTab data={data} /> : null}
      </div>
    </main>
  );
}

function TodayTab({
  data,
  bodyScheduledToday,
  activeGoal,
}: {
  data: DashboardData;
  bodyScheduledToday: boolean;
  activeGoal: GoalTab;
}) {
  const viewerName = data.viewer.name;
  const partnerName = data.partner?.name ?? null;
  const partnerBodyScheduledToday =
    data.partner &&
    getBodyScheduledDays(data.partner.goals.body).includes(getWeekdayInTimezone(data.todayKey, data.pair.timezone));

  const goalCards = GOAL_TABS.map((goal) => {
    const target =
      goal.key === "body"
        ? `${getBodyRuleLabel(data.viewer.goals.body)} · ${getBodyScheduledDays(data.viewer.goals.body).length} ngày/tuần`
        : getTargetText(data.viewer.goals[goal.key], goal.key);

    const headline = getGoalLabel(data.viewer.goals[goal.key], goal.key);
    const scheduledToday = goal.key === "body" ? bodyScheduledToday : true;
    const partnerScheduledToday = goal.key === "body" ? Boolean(partnerBodyScheduledToday) : true;

    return {
      ...goal,
      headline,
      target,
      viewerStatus: getGoalDisplayStatus({
        row: data.viewer.today,
        category: goal.key,
        scheduledToday,
      }),
      partnerStatus: getGoalDisplayStatus({
        row: data.partner?.today ?? null,
        category: goal.key,
        scheduledToday: data.partner ? partnerScheduledToday : false,
        partnerMissing: !data.partner,
      }),
    };
  });

  const activeGoalCard = goalCards.find((goal) => goal.key === activeGoal) ?? goalCards[0];

  return (
    <section className="grid gap-4 xl:grid-cols-[1.28fr_0.72fr]">
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

        <div className="mt-6 grid grid-cols-3 gap-2">
          {goalCards.map((goal) => (
            <GoalTabCard
              key={goal.key}
              href={goalTabHref(goal.key)}
              title={goal.label}
              icon={goal.icon}
              active={goal.key === activeGoal}
            />
          ))}
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm leading-7 text-emerald-900">
          Lưu từng mục chỉ tạo bản nháp cá nhân hoặc báo rằng mục đó đã đủ điều kiện để khóa ngày. Chỉ sau khi bấm
          <span className="font-semibold"> Khóa ngày hôm nay</span>, app mới chốt kết quả; shared streak chỉ tăng khi
          cả hai cùng khóa và cùng đạt chuẩn riêng của mình.
        </div>

        <div className="mt-5">
          <CheckinCard
            category={activeGoalCard.key}
            title={activeGoalCard.label}
            icon={activeGoalCard.icon}
            accent={activeGoalCard.accent}
            target={activeGoalCard.target}
            label={activeGoalCard.headline}
            status={activeGoalCard.viewerStatus}
            partnerStatus={activeGoalCard.partnerStatus}
            viewerLabel={viewerName}
            partnerLabel={partnerName}
          >
            {activeGoal === "study" ? (
              <form action={saveCheckinAction} className="flex flex-col gap-4">
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
                <ProofUploadField
                  name="studyProof"
                  label="Ảnh bằng chứng"
                  buttonLabel="Chọn ảnh bằng chứng"
                  accept={PROOF_INPUT_ACCEPT}
                  helper={data.viewer.today?.study_had_proof ? "Đã có proof hôm nay, ảnh mới sẽ thay thế ảnh cũ" : "Tự xóa khi sang ngày mới"}
                />
                <label className="block space-y-2 text-sm text-[var(--muted)]">
                  <span>Note</span>
                  <textarea
                    name="studyNote"
                    rows={3}
                    defaultValue={data.viewer.today?.study_note ?? ""}
                    className="min-h-[8rem] w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <div className="pt-1">
                  <SaveButton label="Lưu study" fullWidth />
                </div>
              </form>
            ) : null}

            {activeGoal === "screen_time" ? (
              <form action={saveCheckinAction} className="flex flex-col gap-4">
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
                <ProofUploadField
                  name="screenTimeProof"
                  label="Screenshot"
                  buttonLabel="Tải screenshot"
                  accept={PROOF_INPUT_ACCEPT}
                  helper={data.viewer.today?.screen_time_had_proof ? "Đã có screenshot hôm nay, ảnh mới sẽ thay thế ảnh cũ" : "Không bắt buộc"}
                />
                <label className="block space-y-2 text-sm text-[var(--muted)]">
                  <span>Note</span>
                  <textarea
                    name="screenTimeNote"
                    rows={3}
                    defaultValue={data.viewer.today?.screen_time_note ?? ""}
                    className="min-h-[8rem] w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <div className="pt-1">
                  <SaveButton label="Lưu screen time" fullWidth />
                </div>
              </form>
            ) : null}

            {activeGoal === "body" ? (
              <form action={saveCheckinAction} className="flex flex-col gap-4">
                <input type="hidden" name="category" value="body" />
                <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/75 px-4 py-4 text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    name="bodyCompleted"
                    defaultChecked={data.viewer.today?.body_completed ?? false}
                    className="mt-1 size-4 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-7">Tôi đã bám đúng plan body hôm nay</span>
                    <span className="block text-sm leading-7 text-[var(--muted)]">
                      Dùng cho buổi gym, nutrition, hoặc recovery của riêng bạn.
                    </span>
                  </span>
                </label>
                <p className="rounded-2xl border border-black/8 bg-white/65 px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                  {bodyScheduledToday
                    ? "Hôm nay body được tính. Cần ảnh bằng chứng để mục này đủ điều kiện khóa ngày."
                    : "Hôm nay không nằm trong lịch body của bạn, nên mục này đang ở trạng thái N/A."}
                </p>
                <ProofUploadField
                  name="bodyProof"
                  label="Ảnh bằng chứng"
                  buttonLabel="Chọn ảnh bằng chứng"
                  accept={PROOF_INPUT_ACCEPT}
                  helper={data.viewer.today?.body_had_proof ? "Đã có proof hôm nay, ảnh mới sẽ thay thế ảnh cũ" : "Tự xóa khi sang ngày mới"}
                />
                <label className="block space-y-2 text-sm text-[var(--muted)]">
                  <span>Note</span>
                  <textarea
                    name="bodyNote"
                    rows={3}
                    defaultValue={data.viewer.today?.body_note ?? ""}
                    className="min-h-[8rem] w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <div className="pt-1">
                  <SaveButton label="Lưu body" fullWidth />
                </div>
              </form>
            ) : null}
          </CheckinCard>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="glass-card rounded-[2rem] p-5">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Chờ nhau</p>
          <div className="mt-4 grid gap-3">
            <PersonCard person={data.viewer} row={data.viewer.today} todayKey={data.todayKey} timezone={data.pair.timezone} current />
            {data.partner ? <PersonCard person={data.partner} row={data.partner.today} todayKey={data.todayKey} timezone={data.pair.timezone} /> : <WaitingPartnerCard />}
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-5">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Khóa ngày</p>
          <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{todayStateLabel(data.todayState, partnerName)}</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Xong từng mục rồi khóa ngày để app chuyển sang trạng thái chờ nhau thật sự.
          </p>

          <form action={submitDayAction} className="mt-5">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Khóa ngày hôm nay
              <ArrowRight className="size-4" />
            </button>
          </form>
        </div>
      </aside>
    </section>
  );
}

function PairTab({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="glass-card rounded-[2rem] p-5">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Nhìn thấy nhau</p>
        <div className="mt-4 grid gap-3">
          <PersonCard person={data.viewer} row={data.viewer.today} todayKey={data.todayKey} timezone={data.pair.timezone} current />
          {data.partner ? <PersonCard person={data.partner} row={data.partner.today} todayKey={data.todayKey} timezone={data.pair.timezone} /> : <WaitingPartnerCard />}
        </div>
      </div>

      <div className="space-y-4">
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

        <div className="glass-card rounded-[2rem] p-5">
          <div className="flex items-center gap-2 text-[var(--foreground)]">
            <HeartHandshake className="size-4" />
            <p className="font-semibold">Nhịp chung hôm nay</p>
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-black/10 bg-white/70 px-4 py-4 text-sm leading-7 text-[var(--muted)]">
            {data.dailyRecap}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewTab({ data }: { data: DashboardData }) {
  return (
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
              <HistoryBadge label={data.partner?.name ?? "Chưa đủ pair"} status={day.partnerStatus} />
              <HistoryBadge label="Shared" status={day.sharedStatus} shared />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function normalizeDashboardTab(value: string | undefined): DashboardTab {
  if (value === "pair" || value === "review") {
    return value;
  }

  return "today";
}

function normalizeGoalTab(value: string | undefined): GoalTab {
  if (value === "screen_time" || value === "body") {
    return value;
  }

  return "study";
}

function dashboardTabHref(tab: DashboardTab, goal: GoalTab) {
  if (tab === "today") {
    return goal === "study" ? "/" : `/?goal=${goal}`;
  }

  return `/?tab=${tab}`;
}

function goalTabHref(goal: GoalTab) {
  return goal === "study" ? "/" : `/?goal=${goal}`;
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

function GoalTabCard({
  href,
  title,
  icon: Icon,
  active,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`inline-flex items-center justify-center gap-2 rounded-[1rem] border px-3 py-3 text-sm font-medium transition ${
        active
          ? "border-black/12 bg-white text-[var(--foreground)] shadow-[0_16px_32px_rgba(27,25,22,0.08)]"
          : "border-black/8 bg-white/62 hover:border-black/12 hover:bg-white/80"
      }`}
    >
      <Icon className={`size-4 ${active ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
      <span className={active ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>{title}</span>
    </Link>
  );
}

function CheckinCard({
  title,
  label,
  target,
  status,
  partnerStatus,
  viewerLabel,
  partnerLabel,
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
  viewerLabel: string;
  partnerLabel: string | null;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-[1.75rem] border border-black/8 bg-white/65 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="sm:min-h-[6.5rem]">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            <Icon className="size-4" />
            {title}
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">{label}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{target}</p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[12rem]">
          <StatusPill label={viewerLabel} status={status} stretch />
          {partnerLabel ? (
            <StatusPill label={partnerLabel} status={partnerStatus} muted stretch />
          ) : (
            <div className="inline-flex min-h-11 items-center justify-between gap-3 rounded-full border border-dashed border-black/12 bg-white/72 px-3.5 py-2 text-xs font-medium text-[var(--muted)]">
              <span className="truncate">Chờ đủ 2 người</span>
              <span className="shrink-0">Chưa ghép</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex-1 rounded-[1.5rem] border border-black/8 p-4 sm:p-5" style={{ backgroundColor: `${accent}12` }}>
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
  todayKey,
  timezone,
  current = false,
}: {
  person: PersonSummary;
  row: DailyCheckinRow | null;
  todayKey: string;
  timezone: string;
  current?: boolean;
}) {
  const bodyScheduledToday = getBodyScheduledDays(person.goals.body).includes(getWeekdayInTimezone(todayKey, timezone));
  const dayStatus = row?.submitted_at ? row.personal_day_status : row ? "draft_live" : "waiting";

  return (
    <div className="rounded-[1.5rem] border border-black/8 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">
            {person.name} {current ? "· bạn" : ""}
          </p>
          <p className="text-sm text-[var(--muted)]">{getFocusLabel(person.focusMode)}</p>
        </div>
        <StatusPill label="Hôm nay" status={dayStatus} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--muted)]">
        <MiniMetric label="Study" value={getGoalDisplayStatus({ row, category: "study", scheduledToday: true })} />
        <MiniMetric
          label="Screen"
          value={getGoalDisplayStatus({ row, category: "screen_time", scheduledToday: true })}
        />
        <MiniMetric label="Body" value={getGoalDisplayStatus({ row, category: "body", scheduledToday: bodyScheduledToday })} />
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">Streak cá nhân: {person.streak} ngày</p>
    </div>
  );
}

function WaitingPartnerCard() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-white/60 p-4 text-sm leading-6 text-[var(--muted)]">
      Người còn lại chưa vào app hoặc chưa setup xong. Khi đủ 2 người, card này sẽ biến thành bảng trạng thái chờ nhau theo ngày.
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

function getGoalDisplayStatus({
  row,
  category,
  scheduledToday,
  partnerMissing = false,
}: {
  row: DailyCheckinRow | null;
  category: GoalCategory;
  scheduledToday: boolean;
  partnerMissing?: boolean;
}) {
  if (partnerMissing) {
    return "waiting";
  }

  if (!scheduledToday) {
    return "na";
  }

  const rawStatus = getRawGoalStatus(row, category);

  if (row?.submitted_at) {
    return rawStatus;
  }

  if (!hasGoalDraftContent(row, category)) {
    return "unsaved";
  }

  if (rawStatus === "pass") {
    return "ready";
  }

  if (rawStatus === "fail") {
    return "needs_work";
  }

  return "saved";
}

function getRawGoalStatus(row: DailyCheckinRow | null, category: GoalCategory) {
  if (!row) {
    return "pending";
  }

  if (category === "study") return row.study_status;
  if (category === "screen_time") return row.screen_time_status;
  return row.body_status;
}

function hasGoalDraftContent(row: DailyCheckinRow | null, category: GoalCategory) {
  if (!row) {
    return false;
  }

  if (category === "study") {
    return (
      typeof row.study_minutes === "number" ||
      Boolean(row.study_note) ||
      Boolean(row.study_proof_path || row.study_had_proof)
    );
  }

  if (category === "screen_time") {
    return (
      typeof row.screen_time_minutes === "number" ||
      Boolean(row.screen_time_note) ||
      Boolean(row.screen_time_proof_path || row.screen_time_had_proof)
    );
  }

  return Boolean(row.body_completed || row.body_note || row.body_proof_path || row.body_had_proof);
}

function StatusPill({
  label,
  status,
  muted = false,
  stretch = false,
}: {
  label: string;
  status: string;
  muted?: boolean;
  stretch?: boolean;
}) {
  const tone = statusTone(status, muted);

  return (
    <div
      className={`${stretch ? "flex min-h-11 w-full justify-between gap-3 px-3.5 py-2" : "inline-flex gap-2 px-3 py-1.5"} items-center rounded-full text-xs font-medium ${tone}`}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0">{statusLabel(status)}</span>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "pass" || status === "shared_pass") return "Pass";
  if (status === "fail" || status === "shared_fail") return "Trượt";
  if (status === "protected" || status === "grace_protected") return "Grace giữ";
  if (status === "ready") return "Sẵn khóa";
  if (status === "saved") return "Đã lưu";
  if (status === "needs_work") return "Còn thiếu";
  if (status === "na") return "N/A";
  if (status === "unsaved") return "Chưa lưu";
  if (status === "waiting" || status === "waiting_for_partner") return "Đang chờ";
  if (status === "waiting_for_you") return "Tới lượt bạn";
  if (status === "draft_live") return "Chưa khóa";
  if (status === "draft") return "Draft";
  if (status === "idle" || status === "missing") return "Chưa có";
  return "Pending";
}

function todayStateLabel(state: DashboardData["todayState"], partnerName?: string | null) {
  if (state === "shared_pass") return "Cả hai đều qua";
  if (state === "waiting_for_partner") return "Bạn xong rồi";
  if (state === "waiting_for_you") return partnerName ? `${partnerName} đang chờ` : "Người còn lại đang chờ";
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

  if (status === "ready") {
    return muted
      ? "border border-teal-200 bg-teal-50 text-teal-700"
      : "border border-teal-200 bg-teal-100 text-teal-800";
  }

  if (status === "saved" || status === "draft_live") {
    return muted
      ? "border border-sky-200 bg-sky-50 text-sky-700"
      : "border border-sky-200 bg-sky-100 text-sky-800";
  }

  if (status === "needs_work") {
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
