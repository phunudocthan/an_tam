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
    <main className="page-shell px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="glass-card relative hidden overflow-hidden rounded-[2.75rem] p-6 sm:p-8 lg:block lg:min-h-[34rem] lg:p-10">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm text-[var(--muted)]">
              <HeartHandshake className="size-4" />
              An Tam
            </div>

            <h1 className="display-type mt-6 max-w-xl text-5xl font-semibold leading-[0.95] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
              Vào lại nhịp chung.
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-[var(--muted)] sm:text-base">
              Chỉ cần đúng mật khẩu của mình là vào lại được ngay. Không email, không magic link, không bước thừa.
            </p>
          </div>

          <div className="relative z-10 mt-10 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[2rem] border border-black/8 bg-white/68 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Đăng nhập</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">Mỗi người một mật khẩu riêng.</p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Vào đúng mình, rồi quay lại Today board.</p>
            </div>

            <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,249,242,0.68))] p-5">
              <div className="grid gap-3">
                <IdentityCard title="Bạn" subtitle="Một mật khẩu riêng" />
                <div className="flex items-center gap-3 px-2 text-[11px] uppercase tracking-[0.26em] text-[var(--muted)]">
                  <span className="h-px flex-1 bg-black/10" />
                  Cùng một nhịp
                  <span className="h-px flex-1 bg-black/10" />
                </div>
                <IdentityCard title="Người còn lại" subtitle="Một mật khẩu khác" />
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -left-10 bottom-8 size-40 rounded-full bg-[rgba(212,124,113,0.12)] blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 size-56 rounded-full bg-[rgba(15,118,110,0.10)] blur-3xl" />
        </section>

        <section className="w-full lg:justify-self-end lg:pl-4">
          <div className="mb-5 text-center lg:mb-6 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm text-[var(--muted)] lg:hidden">
              <HeartHandshake className="size-4" />
              An Tam
            </div>

            <h1 className="display-type mt-5 text-5xl font-semibold leading-none text-[var(--foreground)] sm:text-6xl lg:hidden">
              Vào lại nhịp chung.
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[var(--muted)] sm:text-base lg:hidden">
              Nhập đúng mật khẩu riêng của bạn để vào app.
            </p>
          </div>

          <LoginForm legacyMessage={legacyMessage} />
        </section>
      </div>
    </main>
  );
}

function IdentityCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/8 bg-white/72 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{subtitle}</p>
    </div>
  );
}
