import { HeartHandshake, Sparkles } from "lucide-react";
import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-5 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="glass-card rounded-[2.5rem] px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm text-[var(--muted)]">
            <HeartHandshake className="size-4" />
            Private couple accountability app
          </div>
          <h1 className="display-type max-w-2xl text-4xl leading-tight font-semibold text-[var(--foreground)] sm:text-6xl">
            Khác mục tiêu, nhưng vẫn giữ cùng một nhịp.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            An Tam không cố biến hai người thành cùng một kiểu kỷ luật. Mỗi người có target riêng, nhưng ngày chỉ thật sự
            trọn khi cả hai đều có mặt và chịu trách nhiệm với phần của mình.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Study", "Học đều và có proof ngắn hạn khi cần thi cử."],
              ["Screen time", "Ít màn hình hơn nhưng không làm app thành máy phán xét."],
              ["Body", "Bulk hay cut đều được, miễn là vẫn đi cùng một nhịp."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[1.75rem] border border-black/8 bg-white/60 p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-between gap-5">
          <LoginForm />
          <div className="glass-card rounded-[2rem] p-5 text-sm leading-6 text-[var(--muted)]">
            <div className="mb-3 flex items-center gap-2 text-[var(--foreground)]">
              <Sparkles className="size-4" />
              <span className="font-semibold">Loop chính của MVP</span>
            </div>
            <p>Mỗi ngày đi qua ba việc: cập nhật từng mục, submit ngày, rồi chờ nhau. Shared streak chỉ tăng khi cả hai đều qua ngày.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
