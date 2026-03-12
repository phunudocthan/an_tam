"use client";

import { ImageUp } from "lucide-react";
import { useId, useState } from "react";

type ProofUploadFieldProps = {
  accept: string;
  buttonLabel: string;
  description?: string;
  helper: string;
  label: string;
  name: string;
};

export function ProofUploadField({
  accept,
  buttonLabel,
  description,
  helper,
  label,
  name,
}: ProofUploadFieldProps) {
  const inputId = useId();
  const [filename, setFilename] = useState("");
  const hasSelection = Boolean(filename);
  const selectedLabel = filename || "Đã chọn 1 ảnh";

  return (
    <div className="space-y-2 rounded-[1.35rem] border border-black/8 bg-white/72 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
        <span className="max-w-[48%] rounded-full border border-black/10 bg-white px-3 py-1 text-right text-[11px] font-medium text-[var(--muted)]">
          {helper}
        </span>
      </div>

      <p className="text-xs leading-6 text-[var(--muted)]">
        {hasSelection
          ? "Đã chọn ảnh mới. Nhớ bấm Lưu để cập nhật."
          : description ?? "Ảnh này sẽ chỉ ở lại trong một cửa sổ ngắn để người còn lại kịp thấy."}
      </p>

      <input
        id={inputId}
        type="file"
        name={name}
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const nextFile = event.currentTarget.files?.[0];
          setFilename(nextFile?.name ?? "");
        }}
      />

      <label
        htmlFor={inputId}
        className="flex min-h-[4.25rem] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/84 px-4 py-3 text-sm transition hover:border-black/15 hover:bg-white"
      >
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--foreground)] px-3.5 py-2 text-sm font-semibold text-white">
          <ImageUp className="size-4" />
          {hasSelection ? "Đổi ảnh" : buttonLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-xs text-[var(--muted)]">
          {hasSelection ? selectedLabel : "Chưa chọn ảnh"}
        </span>
      </label>
    </div>
  );
}
