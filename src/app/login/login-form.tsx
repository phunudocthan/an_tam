"use client";

import { LockKeyhole, ShieldAlert } from "lucide-react";
import { useActionState } from "react";
import { loginWithPasswordAction, type PasswordLoginState } from "@/app/actions";

const initialState: PasswordLoginState = {
  error: null,
};

export function LoginForm({ legacyMessage }: { legacyMessage: string | null }) {
  const [state, formAction, isPending] = useActionState(loginWithPasswordAction, initialState);

  return (
    <div className="glass-card soft-ring w-full max-w-md rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Đăng nhập</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Chỉ cần đúng pass là vào.</h2>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white/80 p-3">
          <LockKeyhole className="size-5 text-[var(--accent)]" />
        </div>
      </div>

      <div className="mb-5 rounded-[1.5rem] border border-black/8 bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
        App này chỉ có 2 mật khẩu cố định. Mỗi mật khẩu map thẳng vào 1 người, nên không cần username, email, hay magic link.
      </div>

      <form action={formAction} className="space-y-4">
        <label className="block space-y-2 text-sm text-[var(--muted)]">
          <span>Mật khẩu</span>
          <input
            required
            autoFocus
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu cố định"
            className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-base text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        {legacyMessage ? (
          <div className="flex items-start gap-2 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>{legacyMessage}</p>
          </div>
        ) : null}

        {state.error ? (
          <div className="flex items-start gap-2 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isPending ? "Đang vào app..." : "Vào app"}
        </button>
      </form>
    </div>
  );
}
