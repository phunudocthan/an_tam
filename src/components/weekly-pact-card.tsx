import { TimerReset } from "lucide-react";
import { saveWeeklyPactAction } from "@/app/actions";
import { WEEKLY_PACTS } from "@/lib/constants";
import type { DashboardData } from "@/lib/types";

export function WeeklyPactCard({ data }: { data: DashboardData }) {
  const lastEditedCopy =
    data.weeklyPact && data.weeklyPactEditorName
      ? `${data.weeklyPactEditorName} sửa gần nhất lúc ${formatCompactDate(data.weeklyPact.updated_at, data.pair.timezone)}`
      : "Tuần này chưa có kèo chung nào được chốt.";

  return (
    <section className="glass-card rounded-[2rem] p-5">
      <div className="flex items-center gap-2 text-[var(--foreground)]">
        <TimerReset className="size-4" />
        <h2 className="font-semibold">Kèo tuần</h2>
      </div>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
        Đây là kèo chung của tuần này. Không bắt buộc phải hoàn hảo, nhưng giúp hai đứa nhìn cùng một hướng.
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{lastEditedCopy}</p>

      <form action={saveWeeklyPactAction} className="mt-4 space-y-3">
        <label className="block space-y-2 text-sm text-[var(--muted)]">
          <span>Mẫu kèo</span>
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
        </label>
        <label className="block space-y-2 text-sm text-[var(--muted)]">
          <span>Ghi chú thêm</span>
          <textarea
            name="note"
            rows={3}
            defaultValue={data.weeklyPact?.note ?? ""}
            placeholder="Ví dụ: ai xong trước thì nhắc người kia một câu"
            className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full border border-black/10 bg-white/85 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
        >
          {data.weeklyPact ? "Cập nhật kèo tuần" : "Lưu kèo tuần"}
        </button>
      </form>
    </section>
  );
}

function formatCompactDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}
