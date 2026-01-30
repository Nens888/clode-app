"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { cn } from "@/lib/cn";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen px-6 py-10 flex items-center justify-center">
      <AuthCard title="Вход" subtitle="Почта + пароль">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
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
          <div>
            <div className="text-xs text-white/45">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mail.com"
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/35 outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-white/45">Пароль</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/35 outline-none"
            />
          </div>

          {error ? <div className="text-sm text-red-300/90">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full rounded-2xl bg-[#0ea5e9]/70 px-5 py-3 text-sm font-semibold text-white transition",
              "hover:bg-[#0ea5e9]/85 active:scale-[0.99]",
              loading && "opacity-60",
            )}
          >
            {loading ? "Входим..." : "Войти"}
          </button>

          <div className="text-center text-sm text-white/45">
            Нет аккаунта?{" "}
            <Link href="/auth/register" className="text-white/80 hover:text-white">
              Регистрация
            </Link>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
