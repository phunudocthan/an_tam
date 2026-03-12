import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Eye,
  Flame,
  HeartHandshake,
  LogOut,
  MoonStar,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  logoutAction,
  refreshWeeklyInsightAction,
  saveCheckinAction,
  submitDayAction,
  toggleProofReactionAction,
} from "@/app/actions";
import { getBodyCheckpointCount, isNutritionGoal } from "@/lib/body";
import { BodyNutritionEditor } from "@/components/body-nutrition-editor";
import { ProofUploadField } from "@/components/proof-upload-field";
import { WeeklyPactCard } from "@/components/weekly-pact-card";
import { PROOF_INPUT_ACCEPT, PROOF_REACTION_OPTIONS } from "@/lib/constants";
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
import type { DashboardData, DayLane, GoalCategory, GoalStage, TodayStage, VisibleProof } from "@/lib/types";

export const dynamic = "force-dynamic";

type DashboardTab = "today" | "review";
type GoalTab = GoalCategory;

const DASHBOARD_TABS = [
  { key: "today" as const, label: "Hôm nay", icon: HeartHandshake },
  { key: "review" as const, label: "Tổng kết", icon: Sparkles },
] satisfies Array<{ key: DashboardTab; label: string; icon: LucideIcon }>;

const GOAL_TABS = [
  { key: "study" as const, label: "Học", icon: MoonStar, accent: "var(--gold)" },
  { key: "screen_time" as const, label: "Điện thoại", icon: Smartphone, accent: "var(--accent)" },
  { key: "body" as const, label: "Body", icon: Dumbbell, accent: "var(--rose)" },
] satisfies Array<{ key: GoalTab; label: string; icon: LucideIcon; accent: string }>;

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
        title="Tài khoản này chưa nằm trong pair."
        copy={state.reason}
      />
    );
  }

  if (state.kind === "db_not_ready") {
    return (
      <SimpleState
        eyebrow="Database chưa xong"
        title="Schema Supabase của app này vẫn chưa đủ."
        copy={state.message}
      />
    );
  }

  const { data } = state;
  const activeTab = normalizeDashboardTab(params.tab);
  const activeGoal = normalizeGoalTab(params.goal);

  return (
    <main className="page-shell px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader data={data} activeGoal={activeGoal} />

        <section className="mb-5">
          <div className="glass-card sticky top-3 z-10 rounded-[1.5rem] p-2">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {DASHBOARD_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;

                return (
                  <Link
                    key={tab.key}
                    href={dashboardTabHref(tab.key, activeGoal)}
                    scroll={false}
                    className={`inline-flex min-h-11 min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-[1.15rem] px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                      active
                        ? "border border-black/10 bg-white text-[var(--foreground)] shadow-[0_16px_30px_rgba(27,25,22,0.08)]"
                        : "bg-white/60 text-[var(--muted)] hover:bg-white/85"
                    }`}
                  >
                    <Icon className={`size-4 ${active ? "text-[var(--accent)]" : ""}`} />
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        {activeTab === "today" ? <TodayTab data={data} activeGoal={activeGoal} /> : null}
        {activeTab === "review" ? <ReviewTab data={data} /> : null}
      </div>
    </main>
  );
}

function PageHeader({ data, activeGoal }: { data: DashboardData; activeGoal: GoalTab }) {
  return (
    <header className="glass-card mb-5 rounded-[2rem] px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-1.5 text-xs font-medium tracking-[0.18em] text-[var(--muted)] uppercase">
            <HeartHandshake className="size-4" />
            An Tam
          </div>
          <h1 className="display-type mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Xem hôm nay của hai đứa đang tới đâu rồi.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Mở ra là biết ai đã xong, ai còn đang làm, và còn thiếu gì để khóa ngày.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:max-w-[28rem] xl:justify-end">
          <StatPill icon={Flame} label="Nhịp chung" value={`${data.sharedStreak} ngày`} />
          <StatPill
            icon={ShieldCheck}
            label="Grace"
            value={data.sharedGraceProtectedDates.includes(data.todayKey) ? "Đang giữ hôm nay" : "1 lần / 7 ngày"}
          />
          <StatPill icon={Clock3} label="Đang mở" value={goalTabLabel(activeGoal)} />
          <Link
            href="/settings"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white/78 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
          >
            <SlidersHorizontal className="size-4" />
            Chỉnh nhịp
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white/78 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
            >
              <LogOut className="size-4" />
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function TodayTab({ data, activeGoal }: { data: DashboardData; activeGoal: GoalTab }) {
  const bodyScheduledToday = getBodyScheduledDays(data.viewer.goals.body).includes(
    getWeekdayInTimezone(data.todayKey, data.pair.timezone),
  );
  const activeGoalConfig = data.viewer.goals[activeGoal];
  const activeGoalMeta = GOAL_TABS.find((goal) => goal.key === activeGoal) ?? GOAL_TABS[0];
  const activeGoalStage = data.viewerLane.goalStages[activeGoal];
  const activePartnerGoalStage = data.partnerLane?.goalStages[activeGoal] ?? null;
  const activeGoalTarget =
    activeGoal === "body" && isNutritionGoal(data.viewer.goals.body)
      ? `${getBodyRuleLabel(data.viewer.goals.body)} · ${data.viewerBodyCheckpoints.filter((item) => item.completed).length}/${getBodyCheckpointCount(data.viewer.goals.body)} checkpoint hôm nay`
      : activeGoal === "body"
        ? `${getBodyRuleLabel(data.viewer.goals.body)} · ${getBodyScheduledDays(data.viewer.goals.body).length} ngày/tuần`
      : getTargetText(activeGoalConfig, activeGoal);

  return (
    <section className="space-y-4">
      <TodayStateHeader data={data} />

      <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
        <CoupleLaneCard data={data} />
        <ProofTray data={data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="glass-card rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Phần của bạn</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{getGoalLabel(activeGoalConfig, activeGoal)}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{activeGoalTarget}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StagePill label="Bạn" stage={activeGoalStage} />
                {data.partnerLane ? <StagePill label={data.partnerLane.name} stage={activePartnerGoalStage ?? "not_started"} muted /> : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {GOAL_TABS.map((goal) => (
                <GoalTabCard
                  key={goal.key}
                  href={goalTabHref(goal.key)}
                  title={goal.label}
                  icon={goal.icon}
                  active={goal.key === activeGoal}
                />
              ))}
            </div>

            <GoalEditorCard data={data} activeGoal={activeGoal} bodyScheduledToday={bodyScheduledToday} accent={activeGoalMeta.accent} />
          </div>
        </section>

        <aside className="space-y-4">
          <SubmitCard data={data} />
          <WeeklyPactCard data={data} />
        </aside>
      </div>
    </section>
  );
}

function TodayStateHeader({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="glass-card rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">{data.todaySummary.eyebrow}</p>
        <h2 className="display-type mt-3 text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl">
          {data.todaySummary.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">{data.todaySummary.copy}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <StagePill label={data.viewerLane.name} stage={data.viewerLane.dayStage} />
          {data.partnerLane ? <StagePill label={data.partnerLane.name} stage={data.partnerLane.dayStage} muted /> : null}
        </div>
      </div>

      <div className="glass-card rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Bước tiếp theo</p>
        <div className="mt-4 rounded-[1.5rem] border border-black/10 bg-white/72 p-4">
          <p className="text-base font-semibold text-[var(--foreground)]">{data.todaySummary.nextStep}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <MiniStat label="Cá nhân bạn" value={`${data.viewerLane.streak} ngày`} />
          <MiniStat label="Goal đã sẵn" value={`${data.viewerLane.readyCount}/3`} />
        </div>
      </div>
    </section>
  );
}

function CoupleLaneCard({ data }: { data: DashboardData }) {
  return (
    <section className="glass-card rounded-[2rem] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Tiến độ của hai đứa</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Hôm nay mỗi người đang tới đâu?</h2>
        </div>
        <div className="rounded-full border border-black/10 bg-white/72 px-4 py-2 text-sm font-medium text-[var(--foreground)]">
          {todayStageLabel(data.todayStage)}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <LaneCard lane={data.viewerLane} focusLabel={getFocusLabel(data.viewerLane.focusMode)} current />
        {data.partnerLane ? (
          <LaneCard lane={data.partnerLane} focusLabel={getFocusLabel(data.partnerLane.focusMode)} />
        ) : (
          <WaitingPartnerCard />
        )}
      </div>
    </section>
  );
}

function LaneCard({
  lane,
  focusLabel,
  current = false,
}: {
  lane: DayLane;
  focusLabel: string;
  current?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/8 bg-white/72 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {lane.name}
            {current ? " · bạn" : ""}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{focusLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StagePill label="Hôm nay" stage={lane.dayStage} compact />
          <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
            Streak cá nhân {lane.streak} ngày
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {GOAL_TABS.map((goal) => (
          <GoalProgressPill key={goal.key} label={goal.label} stage={lane.goalStages[goal.key]} />
        ))}
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        {lane.submitted
          ? lane.dayStage === "shared_pass"
            ? "Đã khóa ngày và cùng qua ngày."
            : lane.dayStage === "protected_by_grace"
              ? "Đã khóa ngày, hiện grace đang giữ nhịp."
              : lane.dayStage === "missed"
                ? "Đã khóa ngày nhưng hôm nay chưa giữ được nhịp."
                : "Đã khóa ngày, đang chờ người còn lại."
          : lane.dayStage === "ready_to_submit"
            ? "Phần hôm nay đã đủ để khóa."
            : `Còn ${formatCategoryList(lane.missingCategories)}.`}
      </p>
    </div>
  );
}

function ProofTray({ data }: { data: DashboardData }) {
  return (
    <section className="glass-card rounded-[2rem] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Proof còn xem được</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Ảnh hôm nay của hai đứa sẽ hiện ở đây tới trưa mai.</h2>
        </div>
        <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white/72 px-4 py-2 text-sm text-[var(--muted)]">
          <Eye className="size-4" />
          Tới trưa mai
        </div>
      </div>

      {data.visibleProofs.length > 0 ? (
        <div className="mt-5 space-y-3">
          {data.visibleProofs.map((proof) => (
            <ProofCard
              key={`${proof.checkinId}-${proof.category}-${proof.checkpointIndex ?? "base"}`}
              proof={proof}
              timezone={data.pair.timezone}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-black/12 bg-white/68 p-4 text-sm leading-7 text-[var(--muted)]">
          Hôm nay chưa có ảnh nào ở đây. Khi một người lưu ảnh, người kia sẽ thấy ngay trong khung này.
        </div>
      )}
    </section>
  );
}

function ProofCard({ proof, timezone }: { proof: VisibleProof; timezone: string }) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/72">
      <div className="flex flex-col gap-3 border-b border-black/8 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              {proof.label}
            </span>
            <span className="text-sm text-[var(--muted)]">{proof.ownerName}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {proof.note?.trim() ? proof.note : "Không có ghi chú thêm."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className={`rounded-full px-3 py-1.5 text-xs font-medium ${proof.seenByPartner ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-black/10 bg-white text-[var(--muted)]"}`}>
            {proof.seenByPartner ? "Đã có phản hồi" : "Chưa có phản hồi"}
          </div>
          <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
            Xem tới {formatProofDeadline(proof.expiresAt, timezone)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[0.92fr_1.08fr]">
        <div className="overflow-hidden rounded-[1.25rem] border border-black/8 bg-[#f4efe7]">
          {/* eslint-disable-next-line @next/next/no-img-element -- Signed Supabase proof URLs are short-lived in this MVP. */}
          <img src={proof.imageUrl} alt={`${proof.ownerName} - ${proof.label}`} className="h-full min-h-[12rem] w-full object-cover" />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Phản hồi</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {proof.reactions.length > 0 ? (
                proof.reactions.map((reaction) => (
                  <span
                    key={`${reaction.reactorUserId}-${reaction.reactionKey}`}
                    className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[var(--foreground)]"
                  >
                    {reaction.reactorName}: {reactionLabel(reaction.reactionKey)}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-dashed border-black/12 bg-white/70 px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                  Chưa có phản hồi nào
                </span>
              )}
            </div>
          </div>

          {!proof.isViewerProof ? (
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Thả một phản hồi là đủ</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROOF_REACTION_OPTIONS.map((option) => {
                  const active = proof.viewerReaction === option.key;

                  return (
                    <form key={option.key} action={toggleProofReactionAction}>
                      <input type="hidden" name="checkinId" value={proof.checkinId} />
                      <input type="hidden" name="category" value={proof.category} />
                      <input type="hidden" name="checkpointIndex" value={proof.checkpointIndex ?? ""} />
                      <input type="hidden" name="reactionKey" value={option.key} />
                      <button
                        type="submit"
                        className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                          active
                            ? "border border-black/10 bg-[var(--foreground)] text-white"
                            : "border border-black/10 bg-white text-[var(--foreground)] hover:bg-black/5"
                        }`}
                      >
                        {option.label}
                      </button>
                    </form>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-black/8 bg-white/78 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              Ảnh của bạn sẽ nằm ở đây tới trưa mai để người kia kịp thấy.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function GoalEditorCard({
  data,
  activeGoal,
  bodyScheduledToday,
  accent,
}: {
  data: DashboardData;
  activeGoal: GoalTab;
  bodyScheduledToday: boolean;
  accent: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-black/8 p-4 sm:p-5" style={{ backgroundColor: `${accent}14` }}>
      {activeGoal === "study" ? (
        <form action={saveCheckinAction} className="flex flex-col gap-4">
          <input type="hidden" name="category" value="study" />
          <label className="block space-y-2 text-sm text-[var(--muted)]">
            <span>Học hôm nay (phút)</span>
            <input
              type="number"
              min={0}
              name="studyMinutes"
              defaultValue={data.viewer.today?.study_minutes ?? ""}
              className="w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <ProofUploadField
            name="studyProof"
            label="Ảnh check-in"
            buttonLabel="Chọn ảnh"
            accept={PROOF_INPUT_ACCEPT}
            helper={
              data.viewer.today?.study_had_proof
                ? "Đã có ảnh hôm nay, chọn ảnh mới sẽ thay ảnh cũ"
                : "Người kia xem được tới trưa mai"
            }
            description="Ảnh này sẽ hiện ở đây để người kia kịp thấy."
          />
          <label className="block space-y-2 text-sm text-[var(--muted)]">
            <span>Ghi chú</span>
            <textarea
              name="studyNote"
              rows={3}
              defaultValue={data.viewer.today?.study_note ?? ""}
              className="min-h-[8rem] w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <div className="pt-1">
            <SaveButton label="Lưu mục học" fullWidth />
          </div>
        </form>
      ) : null}

      {activeGoal === "screen_time" ? (
        <form action={saveCheckinAction} className="flex flex-col gap-4">
          <input type="hidden" name="category" value="screen_time" />
          <label className="block space-y-2 text-sm text-[var(--muted)]">
            <span>Điện thoại hôm nay (phút)</span>
            <input
              type="number"
              min={0}
              name="screenTimeMinutes"
              defaultValue={data.viewer.today?.screen_time_minutes ?? ""}
              className="w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <ProofUploadField
            name="screenTimeProof"
            label="Ảnh màn hình"
            buttonLabel="Chọn ảnh"
            accept={PROOF_INPUT_ACCEPT}
            helper="Không bắt buộc. Nếu có, người kia xem được tới trưa mai."
            description="Nếu muốn, bạn có thể thêm ảnh để người kia nhìn dễ hơn."
          />
          <label className="block space-y-2 text-sm text-[var(--muted)]">
            <span>Ghi chú</span>
            <textarea
              name="screenTimeNote"
              rows={3}
              defaultValue={data.viewer.today?.screen_time_note ?? ""}
              className="min-h-[8rem] w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <div className="pt-1">
            <SaveButton label="Lưu mục điện thoại" fullWidth />
          </div>
        </form>
      ) : null}

      {activeGoal === "body" ? (
        isNutritionGoal(data.viewer.goals.body) ? (
          bodyScheduledToday ? (
            <BodyNutritionEditor
              checkpoints={data.viewerBodyCheckpoints}
              checkpointCount={getBodyCheckpointCount(data.viewer.goals.body)}
            />
          ) : (
            <div className="rounded-2xl border border-black/10 bg-white/82 px-4 py-4 text-sm leading-7 text-[var(--muted)]">
              Hôm nay không nằm trong lịch Body của bạn, nên mục này không ảnh hưởng đến việc khóa ngày.
            </div>
          )
        ) : (
          <form action={saveCheckinAction} className="flex flex-col gap-4">
            <input type="hidden" name="category" value="body" />
            {bodyScheduledToday ? (
              <>
                <label className="flex min-h-[4.75rem] items-start gap-3 rounded-2xl border border-black/10 bg-white/82 px-4 py-4 text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    name="bodyCompleted"
                    defaultChecked={data.viewer.today?.body_completed ?? false}
                    className="mt-1 size-4 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-7">Hôm nay mình đã làm đúng phần Body của mình.</span>
                    <span className="block text-sm leading-7 text-[var(--muted)]">
                      Dùng cho tập luyện, ăn uống hoặc recovery, tùy rule bạn đã chọn.
                    </span>
                  </span>
                </label>
                <ProofUploadField
                  name="bodyProof"
                  label="Ảnh check-in"
                  buttonLabel="Chọn ảnh"
                  accept={PROOF_INPUT_ACCEPT}
                  helper={
                    data.viewer.today?.body_had_proof
                      ? "Đã có ảnh hôm nay, chọn ảnh mới sẽ thay ảnh cũ"
                      : "Người kia xem được tới trưa mai"
                  }
                  description="Ảnh này sẽ hiện ở đây để người kia kịp thấy."
                />
              </>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-white/82 px-4 py-4 text-sm leading-7 text-[var(--muted)]">
                Hôm nay không nằm trong lịch Body của bạn, nên mục này không ảnh hưởng đến việc khóa ngày.
              </div>
            )}
            <label className="block space-y-2 text-sm text-[var(--muted)]">
              <span>Ghi chú</span>
              <textarea
                name="bodyNote"
                rows={3}
                defaultValue={data.viewer.today?.body_note ?? ""}
                className="min-h-[8rem] w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>
            <div className="pt-1">
              <SaveButton label="Lưu mục Body" fullWidth />
            </div>
          </form>
        )
      ) : null}
    </div>
  );
}

function SubmitCard({ data }: { data: DashboardData }) {
  return (
    <section className="glass-card rounded-[2rem] p-5">
      <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Khóa ngày</p>
      <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{todayStageLabel(data.todayStage)}</h2>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{data.todaySummary.nextStep}</p>

      <form action={submitDayAction} className="mt-5">
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Khóa ngày hôm nay
          <ArrowRight className="size-4" />
        </button>
      </form>
    </section>
  );
}

function ReviewTab({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="glass-card rounded-[2rem] p-5">
        <div className="flex items-center gap-2 text-[var(--foreground)]">
          <Sparkles className="size-4" />
          <h2 className="font-semibold">Tổng kết tuần</h2>
        </div>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          Nhìn lại tuần vừa rồi để xem nhịp nào đang ổn, nhịp nào nên chỉnh nhẹ.
        </p>
        <div className="mt-4 rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
          {data.weeklyInsight ? (
            <pre className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">{data.weeklyInsight.content}</pre>
          ) : (
            <div className="space-y-2 text-sm leading-7 text-[var(--muted)]">
              <p>Tuần này chưa có bản tổng kết sẵn.</p>
              <p>
                {data.viewer.name} giữ được mục học {data.weeklyStats.viewer.studyPassDays}/7 ngày, mục điện thoại{" "}
                {data.weeklyStats.viewer.screenWins}/7 ngày, và Body {data.weeklyStats.viewer.bodyPassDays}/
                {data.weeklyStats.viewer.bodyScheduledDays} ngày theo lịch.
              </p>
              {data.partner ? (
                <p>
                  {data.partner.name} giữ được mục học {data.weeklyStats.partner?.studyPassDays ?? 0}/7 ngày, mục điện thoại{" "}
                  {data.weeklyStats.partner?.screenWins ?? 0}/7 ngày, và Body {data.weeklyStats.partner?.bodyPassDays ?? 0}/
                  {data.weeklyStats.partner?.bodyScheduledDays ?? 0} ngày theo lịch.
                </p>
              ) : null}
            </div>
          )}
        </div>
        <form action={refreshWeeklyInsightAction} className="mt-4">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
          >
            Làm mới tổng kết
          </button>
        </form>
      </section>

      <section className="glass-card rounded-[2rem] p-5">
        <div className="flex items-center gap-2 text-[var(--foreground)]">
          <CheckCircle2 className="size-4" />
          <h2 className="font-semibold">7 ngày gần nhất</h2>
        </div>
        <div className="mt-4 space-y-3">
          {data.history.map((day) => (
            <div
              key={day.date}
              className="grid gap-3 rounded-[1.5rem] border border-black/8 bg-white/68 px-4 py-3 text-sm sm:grid-cols-[0.9fr_1fr_1fr_0.9fr]"
            >
              <div>
                <p className="font-semibold text-[var(--foreground)]">{day.label}</p>
                <p className="text-[var(--muted)]">{day.date}</p>
              </div>
              <HistoryBadge label={data.viewer.name} status={day.viewerStatus} />
              <HistoryBadge label={data.partner?.name ?? "Chưa đủ pair"} status={day.partnerStatus} />
              <HistoryBadge label="Chung" status={day.sharedStatus} shared />
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function normalizeDashboardTab(value: string | undefined): DashboardTab {
  return value === "review" ? "review" : "today";
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

  return `/?tab=review`;
}

function goalTabHref(goal: GoalTab) {
  return goal === "study" ? "/" : `/?goal=${goal}`;
}

function ConfigState() {
  return (
    <SimpleState
      eyebrow="Missing env"
      title="App đã có flow, nhưng thiếu env runtime."
      copy="Thêm Supabase URL, publishable key, service role key và Gemini key vào `.env.local` để bật app."
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
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border px-3 py-3 text-sm font-medium transition ${
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

function SaveButton({ label, subtle = false, fullWidth = false }: { label: string; subtle?: boolean; fullWidth?: boolean }) {
  const base = fullWidth ? "w-full justify-center" : "";

  return (
    <button
      type="submit"
      className={
        subtle
          ? `${base} inline-flex min-h-11 items-center rounded-full border border-black/10 bg-white/85 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white`
          : `${base} inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90`
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
  icon: LucideIcon;
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-black/8 bg-white/72 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function GoalProgressPill({ label, stage }: { label: string; stage: GoalStage }) {
  return (
    <div className={`rounded-[1.1rem] border px-3 py-3 text-center ${stageTone(stage, true)}`}>
      <p className="text-xs uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-sm font-medium">{goalStageLabel(stage)}</p>
    </div>
  );
}

function StagePill({
  label,
  stage,
  muted = false,
  compact = false,
}: {
  label: string;
  stage: GoalStage | DayLane["dayStage"];
  muted?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full ${compact ? "px-3 py-1.5" : "px-4 py-2"} text-sm font-medium ${stageTone(stage, muted)}`}
    >
      <span>{label}</span>
      <span className="shrink-0">{stageLabel(stage)}</span>
    </div>
  );
}

function WaitingPartnerCard() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-white/60 p-4 text-sm leading-7 text-[var(--muted)]">
      Người kia chưa vào app hoặc chưa xong phần thiết lập. Khi đủ 2 người, tiến độ hôm nay sẽ hiện ở đây.
    </div>
  );
}

function HistoryBadge({ label, status, shared = false }: { label: string; status: string; shared?: boolean }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white/75 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-sm font-medium ${shared ? "text-[var(--foreground)]" : "text-[var(--foreground)]"}`}>
        {historyStatusLabel(status)}
      </p>
    </div>
  );
}

function stageLabel(stage: GoalStage | DayLane["dayStage"]) {
  if (stage === "shared_pass") return "Qua ngày";
  if (stage === "protected_by_grace") return "Được grace giữ nhịp";
  if (stage === "submitted_waiting_partner") return "Đã khóa";
  if (stage === "ready_to_submit") return "Đủ để khóa";
  if (stage === "missed") return "Lỡ nhịp";
  if (stage === "waiting") return "Đang chờ";
  if (stage === "drafting") return "Đang làm";
  return goalStageLabel(stage as GoalStage);
}

function goalStageLabel(stage: GoalStage) {
  if (stage === "locked") return "Đã khóa";
  if (stage === "ready") return "Đủ để khóa";
  if (stage === "needs_fix") return "Còn thiếu";
  if (stage === "in_progress") return "Đang làm";
  if (stage === "na") return "N/A";
  if (stage === "missed") return "Lỡ nhịp";
  return "Chưa làm";
}

function stageTone(stage: GoalStage | DayLane["dayStage"], muted: boolean) {
  if (stage === "shared_pass" || stage === "locked") {
    return muted
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-emerald-200 bg-emerald-100 text-emerald-800";
  }

  if (stage === "protected_by_grace") {
    return muted
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-amber-200 bg-amber-100 text-amber-800";
  }

  if (stage === "ready_to_submit" || stage === "ready") {
    return muted
      ? "border-teal-200 bg-teal-50 text-teal-700"
      : "border-teal-200 bg-teal-100 text-teal-800";
  }

  if (stage === "submitted_waiting_partner") {
    return muted
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-sky-200 bg-sky-100 text-sky-800";
  }

  if (stage === "needs_fix" || stage === "missed") {
    return muted
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-rose-200 bg-rose-100 text-rose-800";
  }

  if (stage === "na") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return muted
    ? "border-black/8 bg-white/75 text-[var(--muted)]"
    : "border-black/8 bg-white/90 text-[var(--foreground)]";
}

function todayStageLabel(stage: TodayStage) {
  if (stage === "shared_pass") return "Hai người đã qua ngày";
  if (stage === "protected_by_grace") return "Được grace giữ nhịp";
  if (stage === "submitted_waiting_partner") return "Bạn đang đợi";
  if (stage === "ready_to_submit") return "Đủ để khóa";
  if (stage === "missed") return "Lỡ nhịp";
  return "Ngày vẫn đang mở";
}

function historyStatusLabel(status: string) {
  if (status === "pass") return "Qua ngày";
  if (status === "fail") return "Lỡ nhịp";
  if (status === "protected") return "Được grace giữ nhịp";
  if (status === "waiting") return "Đang chờ";
  if (status === "missing" || status === "idle") return "Chưa có";
  return "Bản nháp";
}

function goalTabLabel(goal: GoalCategory) {
  if (goal === "study") return "Học";
  if (goal === "screen_time") return "Điện thoại";
  return "Body";
}

function formatCategoryList(categories: GoalCategory[]) {
  if (categories.length === 0) {
    return "một nhịp cuối";
  }

  const labels = categories.map((category) => {
    if (category === "study") return "học";
    if (category === "screen_time") return "điện thoại";
    return "Body";
  });

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} và ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")} và ${labels.at(-1)}`;
}

function formatProofDeadline(expiresAt: string, timezone: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  }).format(new Date(expiresAt));
}

function reactionLabel(key: VisibleProof["viewerReaction"] | string) {
  return PROOF_REACTION_OPTIONS.find((option) => option.key === key)?.label ?? key;
}
