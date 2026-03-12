import { HeartHandshake, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/app/login/login-form";

const principles = [
  "Login phải nhanh hơn việc đoán xem email nào mới nhất.",
  "Không để UX auth phá vỡ daily loop của 2 người.",
  "Với app private cho 2 người, pass cố định hợp lý hơn magic link.",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ legacy_message?: string }>;
}) {
  const params = await searchParams;
  const legacyMessage = typeof params.legacy_message === "string" ? params.legacy_message : null;

  return (
    <main className="page-shell px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-card flex flex-col justify-between rounded-[2.5rem] p-6 sm:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-[var(--muted)]">
              <HeartHandshake className="size-4" />
              Private couple accountability app
            </div>

            <h1 className="display-type mt-6 max-w-3xl text-4xl font-semibold leading-tight text-[var(--foreground)] sm:text-6xl">
              Login này phải đơn giản như việc mở cửa nhà.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              Tôi đã bỏ flow magic link. Với một app chỉ có 2 người dùng thật, việc bật mở email, gặp 429, rồi mất link cũ là
              tra tấn UX không cần thiết. Từ giờ mỗi người có 1 pass cố định, nhập đúng là vào.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <InfoCard
              icon={KeyRound}
              title="2 pass, 2 người"
              copy="Mỗi pass map thẳng vào một tài khoản riêng. Không cần username."
            />
            <InfoCard
              icon={Lock}
              title="Không 429"
              copy="Không còn resend, không còn chờ mail, không còn bị ratelimit của Supabase auth."
            />
            <InfoCard
              icon={ShieldCheck}
              title="Đúng tinh thần MVP"
              copy="Private, nhanh, ít ma sát. Dùng thử cho 2 người dùng hằng ngày."
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <LoginForm legacyMessage={legacyMessage} />

          <div className="glass-card rounded-[2rem] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Nguyên tắc login</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
              {principles.map((principle) => (
                <div key={principle} className="rounded-[1.25rem] border border-black/8 bg-white/70 px-4 py-3">
                  {principle}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-black/8 bg-white/65 p-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/85 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        <Icon className="size-4" />
        {title}
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{copy}</p>
    </div>
  );
}
