"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = useMemo(() => searchParams.get("mode"), [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem("auth_email") ?? "";
    setEmail(saved);
  }, []);

  return (
    <div className="py-10">
      <AuthCard title="Подтверждение" subtitle="Введи код из письма">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);

            const token = code.trim();
            const value = email.trim();

            if (!value) {
              setError("Не найден email. Вернись назад и введи почту ещё раз");
              return;
            }

            if (token.length < 6) {
              setError("Код должен быть 6 символов");
              return;
            }

            setLoading(true);
            try {
              const supabase = createSupabaseBrowserClient();
              const { error: verifyError } = await supabase.auth.verifyOtp({
                email: value,
                token,
                type: "email",
              });

              if (verifyError) throw verifyError;

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
            <div className="text-xs text-white/45">Код</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              className="mt-2 w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm tracking-[0.25em] text-white/90 placeholder:text-white/35 outline-none"
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
            {loading ? "Проверяем..." : "Подтвердить"}
          </button>

          <div className="text-center text-sm text-white/45">
            {mode === "signin" ? "Нет письма?" : "Уже есть аккаунт?"} {" "}
            <Link
              href={mode === "signin" ? "/auth/sign-in" : "/auth/sign-in"}
              className="text-white/80 hover:text-white"
            >
              Вернуться
            </Link>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
