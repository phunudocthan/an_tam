import { HeartHandshake } from "lucide-react";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ legacy_message?: string }>;
}) {
  const params = await searchParams;
  const legacyMessage = typeof params.legacy_message === "string" ? params.legacy_message : null;

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-[30rem]">
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm text-[var(--muted)]">
            <HeartHandshake className="size-4" />
            An Tam
          </div>

          <h1 className="display-type mt-5 text-5xl font-semibold leading-none text-[var(--foreground)] sm:text-6xl">
            Vào lại nhịp của hai người.
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[var(--muted)] sm:text-base">
            Nhập mật khẩu riêng của bạn để vào app.
          </p>
        </div>

        <LoginForm legacyMessage={legacyMessage} />
      </div>
    </main>
  );
}
