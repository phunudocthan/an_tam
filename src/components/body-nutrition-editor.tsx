import { saveBodyCheckpointAction } from "@/app/actions";
import { ProofUploadField } from "@/components/proof-upload-field";
import { PROOF_INPUT_ACCEPT } from "@/lib/constants";
import type { BodyCheckpointView } from "@/lib/types";

export function BodyNutritionEditor({
  checkpoints,
  checkpointCount,
}: {
  checkpoints: BodyCheckpointView[];
  checkpointCount: number;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white/82 px-4 py-4 text-sm leading-7 text-[var(--muted)]">
        Hôm nay mục Body của bạn đi theo {checkpointCount} checkpoint. Đủ {checkpointCount}/{checkpointCount} thì mục này mới qua.
      </div>

      <div className="grid gap-3">
        {checkpoints.map((checkpoint) => (
          <form
            key={checkpoint.checkpointIndex}
            action={saveBodyCheckpointAction}
            className="rounded-[1.5rem] border border-black/8 bg-white/82 p-4"
          >
            <input type="hidden" name="checkpointIndex" value={checkpoint.checkpointIndex} />
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-start gap-3 text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    name="completed"
                    defaultChecked={checkpoint.completed}
                    className="mt-1 size-4 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-7">Checkpoint {checkpoint.checkpointIndex}</span>
                    <span className="block text-sm leading-6 text-[var(--muted)]">
                      Đánh dấu khi bạn đã xong phần này trong ngày.
                    </span>
                  </span>
                </label>
                <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                  {checkpoint.completed ? "Đã lưu" : "Chưa xong"}
                </div>
              </div>

              <ProofUploadField
                name={`checkpointProof-${checkpoint.checkpointIndex}`}
                label="Ảnh check-in"
                buttonLabel="Chọn ảnh"
                accept={PROOF_INPUT_ACCEPT}
                helper={
                  checkpoint.hadProof
                    ? "Đã có ảnh ở checkpoint này, chọn ảnh mới sẽ thay ảnh cũ"
                    : "Không bắt buộc. Nếu có, người kia xem được tới trưa mai."
                }
                description="Nếu muốn, bạn có thể gửi thêm ảnh cho riêng checkpoint này."
              />

              <label className="block space-y-2 text-sm text-[var(--muted)]">
                <span>Ghi chú</span>
                <textarea
                  name="note"
                  rows={2}
                  defaultValue={checkpoint.note ?? ""}
                  className="min-h-[6rem] w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Lưu checkpoint {checkpoint.checkpointIndex}
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
