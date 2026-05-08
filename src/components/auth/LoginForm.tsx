"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const canSubmit = Boolean(email.trim()) && Boolean(password) && !loading;

  const features = [
    { icon: "💬", title: "Чаты", desc: "Общайся с друзьями" },
    { icon: "👥", title: "Группы", desc: "Создавай сообщества" },
    { icon: "🔒", title: "Конфиденциальность", desc: "Только ты решаешь кто видит" },
    { icon: "📱", title: "Синхронизация", desc: "Работает везде" },
  ];

  return (
    <div className="min-h-screen px-6 py-10 flex items-center justify-center">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Левая колонка - форма (основная) */}
        <div className="w-full lg:w-[420px]">
          <div className="mb-6 text-center lg:text-left">
            <h1 className="text-2xl font-semibold text-white">С возвращением</h1>
            <p className="mt-1 text-sm text-white/50">Войди в свой аккаунт</p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl">
            {/* Декоративное свечение */}
            <div className="pointer-events-none absolute -top-20 -left-20 h-40 w-40 rounded-full bg-[#0ea5e9]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-[#6366f1]/15 blur-3xl" />

            <form className="relative space-y-5" onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                setLoading(true);
                try {
                  const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                  });

                  const data = (await res.json()) as { ok?: boolean; error?: string };
                  if (!res.ok) throw new Error(data.error ?? "Ошибка");

                  router.push("/");
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Ошибка");
                } finally {
                  setLoading(false);
                }
              }}>
              {/* Email */}
              <div className="relative">
                <div className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-colors",
                  focused === "email" ? "text-[#0ea5e9]" : "text-white/40"
                )}>✉</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  placeholder="Email"
                  type="email"
                  autoComplete="email"
                  className={cn(
                    "w-full rounded-2xl border bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white/90 placeholder:text-white/30 outline-none transition-all",
                    focused === "email" ? "border-[#0ea5e9]/50 bg-white/[0.06]" : "border-white/[0.06]"
                  )}
                />
              </div>

              {/* Пароль */}
              <div className="relative">
                <div className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-colors",
                  focused === "password" ? "text-[#0ea5e9]" : "text-white/40"
                )}>🔒</div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="Пароль"
                  type="password"
                  autoComplete="current-password"
                  className={cn(
                    "w-full rounded-2xl border bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white/90 placeholder:text-white/30 outline-none transition-all",
                    focused === "password" ? "border-[#0ea5e9]/50 bg-white/[0.06]" : "border-white/[0.06]"
                  )}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "w-full rounded-2xl bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] px-5 py-3.5 text-sm font-semibold text-white transition-all",
                  "hover:shadow-lg hover:shadow-[#0ea5e9]/25 hover:scale-[1.01] active:scale-[0.99]",
                  (!canSubmit || loading) && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Входим...
                  </span>
                ) : "Войти"}
              </button>

              <div className="text-center text-sm text-white/40">
                Нет аккаунта?{" "}
                <Link href="/auth/register" className="text-[#0ea5e9] hover:text-[#38bdf8]">
                  Регистрация
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Правая колонка - информация */}
        <div className="hidden w-full space-y-5 lg:block lg:w-72">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white/90">С возвращением</h2>
            <p className="text-sm text-white/50">Рады видеть тебя снова</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0ea5e9]/15 text-base">
                  {f.icon}
                </div>
                <div className="text-xs font-medium text-white/70">{f.title}</div>
                <div className="text-[10px] text-white/35 leading-tight">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-xs text-white/45">
              Нет аккаунта?{" "}
              <Link href="/auth/register" className="text-[#0ea5e9]/80 hover:text-[#0ea5e9]">
                Регистрация
              </Link>
            </div>
          </div>
        </div>

        {/* Мобильная версия */}
        <div className="lg:hidden w-full">
          <div className="grid grid-cols-2 gap-3">
            {features.slice(0, 2).map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0ea5e9]/15 text-sm">
                  {f.icon}
                </div>
                <div className="text-xs text-white/70">{f.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
