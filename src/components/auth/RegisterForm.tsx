"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { cn } from "@/lib/cn";

function normalizeUsername(input: string) {
  let v = input.trim().toLowerCase();
  if (v.startsWith("@")) v = v.slice(1);
  return v;
}

function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [focused, setFocused] = useState<string | null>(null);

  const normalized = useMemo(() => normalizeUsername(username), [username]);

  useEffect(() => {
    let cancelled = false;

    if (!normalized) {
      setUsernameStatus("idle");
      return;
    }

    if (!isValidUsername(normalized)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/username?username=${encodeURIComponent(normalized)}`,
        );
        const data = (await res.json()) as { available?: boolean };
        if (cancelled) return;
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        if (cancelled) return;
        setUsernameStatus("idle");
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [normalized]);

  const canSubmit =
    Boolean(email.trim()) &&
    Boolean(displayName.trim()) &&
    Boolean(password) &&
    Boolean(normalized) &&
    usernameStatus === "available" &&
    !loading;

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
            <h1 className="text-2xl font-semibold text-white">Создать аккаунт</h1>
            <p className="mt-1 text-sm text-white/50">Присоединяйся к clode</p>
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
                  const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email,
                      password,
                      username: normalized,
                      displayName: displayName.trim(),
                    }),
                  });

                  const data = (await res.json()) as { ok?: boolean; error?: string };
                  if (!res.ok) throw new Error(data.error ?? "Ошибка");

                  localStorage.setItem("auth_email", email.trim().toLowerCase());
                  localStorage.setItem("auth_username", normalized);
                  localStorage.setItem("auth_display_name", displayName.trim());
                  router.push("/auth/verify");
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

              {/* Имя */}
              <div className="relative">
                <div className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-colors",
                  focused === "displayName" ? "text-[#0ea5e9]" : "text-white/40"
                )}>☺</div>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onFocus={() => setFocused("displayName")}
                  onBlur={() => setFocused(null)}
                  placeholder="Имя"
                  autoComplete="name"
                  className={cn(
                    "w-full rounded-2xl border bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white/90 placeholder:text-white/30 outline-none transition-all",
                    focused === "displayName" ? "border-[#0ea5e9]/50 bg-white/[0.06]" : "border-white/[0.06]"
                  )}
                />
              </div>

              {/* Username */}
              <div className="relative">
                <div className={cn(
                  "absolute left-4 top-1/3 -translate-y-1/2 text-base leading-none transition-colors",
                  focused === "username" ? "text-[#0ea5e9]" : "text-white/40"
                )}>@</div>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  placeholder="Username"
                  autoComplete="off"
                  className={cn(
                    "w-full rounded-2xl border bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white/90 placeholder:text-white/30 outline-none transition-all",
                    focused === "username" ? "border-[#0ea5e9]/50 bg-white/[0.06]" : "border-white/[0.06]"
                  )}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs">
                  <span className={cn(
                    usernameStatus === "available" && "text-green-400",
                    usernameStatus === "taken" && "text-red-400",
                    usernameStatus === "invalid" && "text-red-400",
                    usernameStatus === "checking" && "text-white/40",
                  )}>
                    {usernameStatus === "checking" && "..."}
                    {usernameStatus === "available" && "✓ Свободно"}
                    {usernameStatus === "taken" && "✕ Занято"}
                    {usernameStatus === "invalid" && "✕"}
                  </span>
                </div>
                <div className="mt-2 pl-1 text-[10px] text-white/30">3-20 символов: a-z, 0-9, _</div>
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
                  autoComplete="new-password"
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
                    Создаём...
                  </span>
                ) : "Создать аккаунт"}
              </button>

              <div className="text-center text-sm text-white/40">
                Уже есть аккаунт?{" "}
                <Link href="/auth/login" className="text-[#0ea5e9] hover:text-[#38bdf8]">
                  Войти
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Правая колонка - информация */}
        <div className="hidden w-full space-y-5 lg:block lg:w-72">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white/90">Добро пожаловать</h2>
            <p className="text-sm text-white/50">Присоединяйся к clode</p>
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
              Уже есть аккаунт?{" "}
              <Link href="/auth/login" className="text-[#0ea5e9]/80 hover:text-[#0ea5e9]">
                Войти
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
