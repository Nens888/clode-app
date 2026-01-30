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

  return (
    <div className="min-h-screen px-6 py-10 flex items-center justify-center">
      <AuthCard title="Регистрация" subtitle="Почта + пароль, затем код на email">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
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
            <div className="text-xs text-white/45">Имя</div>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Как тебя зовут"
              autoComplete="name"
              className="mt-2 w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/35 outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-white/45">Username</div>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3">
              <div className="text-sm text-white/35">@</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="off"
                className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/35 outline-none"
              />
              <div className="text-xs text-white/40">
                {usernameStatus === "checking" ? "..." : null}
                {usernameStatus === "available" ? "Свободно" : null}
                {usernameStatus === "taken" ? "Занято" : null}
                {usernameStatus === "invalid" ? "Неверно" : null}
              </div>
            </div>
            <div className="mt-2 text-xs text-white/35">
              3-20 символов: a-z, 0-9, _
            </div>
          </div>

          <div>
            <div className="text-xs text-white/45">Пароль</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/35 outline-none"
            />
          </div>

          {error ? <div className="text-sm text-red-300/90">{error}</div> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "w-full rounded-2xl bg-[#0ea5e9]/70 px-5 py-3 text-sm font-semibold text-white transition",
              "hover:bg-[#0ea5e9]/85 active:scale-[0.99]",
              (!canSubmit || loading) && "opacity-60",
            )}
          >
            {loading ? "Создаём..." : "Создать аккаунт"}
          </button>

          <div className="text-center text-sm text-white/45">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="text-white/80 hover:text-white">
              Войти
            </Link>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
