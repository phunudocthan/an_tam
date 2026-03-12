import Link from "next/link";
import { redirect } from "next/navigation";
import { completeSetupAction } from "@/app/actions";
import { PersonalSettingsForm } from "@/components/personal-settings-form";
import { getBodyCheckpointCount, getBodyRuleType, getBodyScheduledDays } from "@/lib/body";
import { DEFAULT_GOAL_PRESET } from "@/lib/constants";
import { loadAppState, requireUser } from "@/lib/dashboard";
import { hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!hasSupabaseEnv()) {
    redirect("/");
  }

  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  const state = await loadAppState(user);

  if (state.kind === "needs_setup") {
    redirect("/setup");
  }

  if (state.kind === "missing_env" || state.kind === "blocked" || state.kind === "db_not_ready") {
    redirect("/");
  }

  const defaults = {
    displayName: state.data.viewer.name,
    focusMode: state.data.viewer.focusMode ?? "gain",
    studyMinutes: state.data.viewer.goals.study?.target_value ?? DEFAULT_GOAL_PRESET.studyMinutes,
    screenTimeMinutes: state.data.viewer.goals.screen_time?.target_value ?? DEFAULT_GOAL_PRESET.screenTimeMinutes,
    bodyRuleType: getBodyRuleType(state.data.viewer.goals.body),
    bodyLabel: state.data.viewer.goals.body?.title ?? DEFAULT_GOAL_PRESET.bodyLabel,
    bodyDays: getBodyScheduledDays(state.data.viewer.goals.body),
    bodyCheckpointCount: getBodyCheckpointCount(state.data.viewer.goals.body) || DEFAULT_GOAL_PRESET.bodyCheckpointCount,
  } as const;

  return (
    <main className="page-shell px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Chỉnh nhịp</p>
            <h1 className="display-type mt-3 text-4xl font-semibold sm:text-5xl">Chỉnh lại nhịp của bạn</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Đổi target, lịch Body hoặc cách chấm ở đây. Lưu xong là quay lại màn hôm nay.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 bg-white/78 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
          >
            Quay lại hôm nay
          </Link>
        </div>

        <PersonalSettingsForm
          action={completeSetupAction}
          defaults={defaults}
          footerCopy="Lưu xong là quay lại màn hôm nay."
          submitLabel="Lưu thay đổi"
        />
      </div>
    </main>
  );
}
