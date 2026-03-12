import { redirect } from "next/navigation";
import { completeSetupAction } from "@/app/actions";
import { PersonalSettingsForm } from "@/components/personal-settings-form";
import { DEFAULT_GOAL_PRESET } from "@/lib/constants";
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
    redirect("/settings");
  }

  if (state.kind === "missing_env" || state.kind === "blocked" || state.kind === "db_not_ready") {
    redirect("/");
  }

  const defaults = {
    displayName: state.profile?.display_name ?? "",
    focusMode: state.profile?.focus_mode ?? "gain",
    studyMinutes: DEFAULT_GOAL_PRESET.studyMinutes,
    screenTimeMinutes: DEFAULT_GOAL_PRESET.screenTimeMinutes,
    bodyRuleType: DEFAULT_GOAL_PRESET.bodyRuleType,
    bodyLabel: DEFAULT_GOAL_PRESET.bodyLabel,
    bodyDays: [...DEFAULT_GOAL_PRESET.bodyDays] as number[],
    bodyCheckpointCount: DEFAULT_GOAL_PRESET.bodyCheckpointCount,
  } as const;

  return (
    <main className="page-shell px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Thiết lập</p>
          <h1 className="display-type mt-3 text-4xl font-semibold sm:text-5xl">Chốt nhịp riêng của bạn</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Mỗi người có mục tiêu riêng. Chốt vài rule cơ bản trước để từ mai hai đứa theo dõi nhau cho dễ.
          </p>
        </div>

        <PersonalSettingsForm
          action={completeSetupAction}
          defaults={defaults}
          footerCopy={`Hiện đã có ${state.memberCount}/2 người xong phần thiết lập.`}
          submitLabel="Lưu và vào app"
        />
      </div>
    </main>
  );
}
