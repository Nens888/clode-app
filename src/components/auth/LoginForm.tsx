"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { cn } from "@/lib/cn";
import { LogIn, Mail, Lock, ArrowRight } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const canSubmit = Boolean(email.trim()) && Boolean(password) && !loading;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0ea5e9]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <AuthCard title="С возвращением" subtitle="Войдите в свой аккаунт">
        <form className="space-y-5" onSubmit={async (e) => {
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
          }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9]/20 to-purple-500/20 border border-white/[0.08]">
              <LogIn className="w-7 h-7 text-[#0ea5e9]" />
            </div>
          </div>

          {/* Email */}
          <div className="relative">
            <div className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
              focused === "email" ? "text-[#0ea5e9]" : "text-white/40"
            )}>
              <Mail className="w-5 h-5" />
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              placeholder="Email"
              type="email"
              autoComplete="email"
              className={cn(
                "w-full rounded-2xl border bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white/90 placeholder:text-white/30 outline-none transition-all",
                focused === "email" ? "border-[#0ea5e9]/50 bg-white/[0.06]" : "border-white/[0.06]"
              )}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
              focused === "password" ? "text-[#0ea5e9]" : "text-white/40"
            )}>
              <Lock className="w-5 h-5" />
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              placeholder="Пароль"
              type="password"
              autoComplete="current-password"
              className={cn(
                "w-full rounded-2xl border bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white/90 placeholder:text-white/30 outline-none transition-all",
                focused === "password" ? "border-[#0ea5e9]/50 bg-white/[0.06]" : "border-white/[0.06]"
              )}
            />
          </div>

          {error ? (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "w-full rounded-2xl bg-[#0ea5e9] px-5 py-3.5 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2",
              "hover:bg-[#0284c7] active:scale-[0.99]",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0ea5e9]",
              loading && "animate-pulse",
            )}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Входим...
              </>
            ) : (
              <>
                Войти
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex justify-center gap-1 text-sm text-white/45">
            <span>Нет аккаунта?</span>
            <Link href="/auth/register" className="text-[#0ea5e9] hover:text-[#38bdf8] transition-colors">
              Регистрация
            </Link>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
