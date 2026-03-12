"use client";

import { ImageUp } from "lucide-react";
import { useId, useState } from "react";

type ProofUploadFieldProps = {
  accept: string;
  buttonLabel: string;
  helper: string;
  label: string;
  name: string;
};

export function ProofUploadField({
  accept,
  buttonLabel,
  helper,
  label,
  name,
}: ProofUploadFieldProps) {
  const inputId = useId();
  const [filename, setFilename] = useState("");
  const hasSelection = Boolean(filename);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        <span className="max-w-[48%] truncate text-right text-xs text-[var(--muted)]">{helper}</span>
      </div>

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
          {hasSelection ? "1 ảnh mới đã chọn" : "Chưa chọn file"}
        </span>
      </label>
    </div>
  );
}
