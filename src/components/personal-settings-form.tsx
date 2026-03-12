"use client";

import { useState } from "react";
import {
  BODY_RULE_OPTIONS,
  MAX_NUTRITION_CHECKPOINT_COUNT,
  MIN_NUTRITION_CHECKPOINT_COUNT,
  WEEKDAY_OPTIONS,
} from "@/lib/constants";
import type { BodyRuleType } from "@/lib/types";

type PersonalSettingsDefaults = {
  displayName: string;
  focusMode: "gain" | "cut";
  studyMinutes: number;
  screenTimeMinutes: number;
  bodyRuleType: BodyRuleType;
  bodyLabel: string;
  bodyDays: number[];
  bodyCheckpointCount: number;
};

type PersonalSettingsFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaults: PersonalSettingsDefaults;
  footerCopy: string;
  submitLabel: string;
};

export function PersonalSettingsForm({
  action,
  defaults,
  footerCopy,
  submitLabel,
}: PersonalSettingsFormProps) {
  const [bodyRuleType, setBodyRuleType] = useState<BodyRuleType>(defaults.bodyRuleType);

  return (
    <form action={action} className="grid gap-6">
      <section className="glass-card rounded-[2rem] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">1. Thông tin của bạn</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-[var(--muted)]">
            <span>Tên hiển thị</span>
            <input
              required
              name="displayName"
              defaultValue={defaults.displayName}
              className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <label className="space-y-2 text-sm text-[var(--muted)]">
            <span>Mục tiêu Body</span>
            <select
              name="focusMode"
              defaultValue={defaults.focusMode}
              className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            >
              <option value="gain">Tăng cân / bulk</option>
              <option value="cut">Giảm cân / cut</option>
            </select>
          </label>
        </div>
      </section>

      <section className="glass-card rounded-[2rem] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">2. Rule mỗi ngày</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-[var(--muted)]">
            <span>Mục tiêu học mỗi ngày (phút)</span>
            <input
              required
              min={15}
              max={600}
              step={5}
              type="number"
              name="studyMinutes"
              defaultValue={defaults.studyMinutes}
              className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <label className="space-y-2 text-sm text-[var(--muted)]">
            <span>Giới hạn điện thoại (phút)</span>
            <input
              required
              min={15}
              max={720}
              step={5}
              type="number"
              name="screenTimeMinutes"
              defaultValue={defaults.screenTimeMinutes}
              className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="space-y-2 text-sm text-[var(--muted)]">
            <span>Cách chấm mục Body</span>
            <select
              name="bodyRuleType"
              value={bodyRuleType}
              onChange={(event) => setBodyRuleType(event.target.value as BodyRuleType)}
              className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            >
              {BODY_RULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="block text-xs leading-6 text-[var(--muted)]">
              {BODY_RULE_OPTIONS.find((option) => option.value === bodyRuleType)?.helper}
            </span>
          </label>

          {bodyRuleType === "nutrition" ? (
            <label className="space-y-2 text-sm text-[var(--muted)]">
              <span>Số checkpoint mỗi ngày</span>
              <input
                required
                type="number"
                min={MIN_NUTRITION_CHECKPOINT_COUNT}
                max={MAX_NUTRITION_CHECKPOINT_COUNT}
                step={1}
                name="bodyCheckpointCount"
                defaultValue={defaults.bodyCheckpointCount}
                className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>
          ) : null}

          <label className="space-y-2 text-sm text-[var(--muted)]">
            <span>Tên ngắn cho mục Body</span>
            <input
              required
              name="bodyLabel"
              defaultValue={defaults.bodyLabel}
              className="w-full rounded-2xl border border-black/10 bg-white/75 px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>

          <div className="space-y-3 text-sm text-[var(--muted)]">
            <span className="block">Những ngày áp dụng</span>
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
                    defaultChecked={defaults.bodyDays.includes(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">{footerCopy}</p>
        <button
          type="submit"
          className="rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
