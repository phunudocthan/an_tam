"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="glass-card soft-ring flex w-full max-w-md flex-col gap-4 rounded-[2rem] p-6"
      onSubmit={(event) => {
        event.preventDefault();

        startTransition(async () => {
          setMessage(null);

          const supabase = createClient();
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          setMessage(
            error
              ? "Magic link chưa gửi được. Kiểm tra lại email hoặc cấu hình Supabase."
              : "Link đăng nhập đã được gửi. Mở mail và quay lại đây nhé.",
          );
        });
      }}
    >
      <label className="space-y-2 text-sm text-[var(--muted)]">
        <span>Email của bạn</span>
        <input
          required
          autoFocus
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-base text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Đang gửi link..." : "Nhận magic link"}
      </button>

      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </form>
  );
}
