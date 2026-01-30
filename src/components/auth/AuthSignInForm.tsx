"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="py-10">
      <AuthCard title="Вход" subtitle="Войти по коду из письма">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);

            const value = email.trim();
            if (!value) {
              setError("Введи email");
              return;
            }

            setLoading(true);
            try {
              const supabase = createSupabaseBrowserClient();
              const { error: signInError } = await supabase.auth.signInWithOtp({
                email: value,
                options: { shouldCreateUser: false },
              });

              if (signInError) throw signInError;

              localStorage.setItem("auth_email", value);
              router.push("/auth/verify");
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

          {error ? (
            <div className="text-sm text-red-300/90">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full rounded-2xl bg-[#0ea5e9]/70 px-5 py-3 text-sm font-semibold text-white transition",
              "hover:bg-[#0ea5e9]/85 active:scale-[0.99]",
              loading && "opacity-60",
            )}
          >
            {loading ? "Отправляем..." : "Получить код"}
          </button>

          <div className="text-center text-sm text-white/45">
            Нет аккаунта?{" "}
            <Link href="/auth/sign-up" className="text-white/80 hover:text-white">
              Создать
            </Link>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
