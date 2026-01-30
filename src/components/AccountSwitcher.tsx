"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type SavedAccount = {
  email: string;
  username: string;
  displayName: string;
  token: string;
  savedAt: number;
};

const STORAGE_KEY = "clode_accounts";

function readAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAccount[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a) =>
        a &&
        typeof a.email === "string" &&
        typeof a.username === "string" &&
        typeof a.displayName === "string" &&
        typeof a.token === "string",
    );
  } catch {
    return [];
  }
}

function writeAccounts(accounts: SavedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, 2)));
}

export function AccountSwitcher() {
  const router = useRouter();
  const [me, setMe] = useState<
    | {
        email: string;
        username: string;
        display_name: string;
      }
    | null
    | undefined
  >(undefined);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAccounts(readAccounts());
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { user?: any }) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  const meKey = useMemo(() => {
    if (!me) return null;
    return `${me.email}:${me.username}`;
  }, [me]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-white/90">Аккаунт</div>

      {me ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white/85">
              {me.display_name}
            </div>
            <div className="truncate text-xs text-white/40">@{me.username}</div>
          </div>
          <button
            type="button"
            disabled={busy}
            className={cn(
              "rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition",
              "hover:bg-white/[0.08] active:scale-[0.98]",
              busy && "opacity-60",
            )}
            onClick={async () => {
              setError(null);
              setBusy(true);
              try {
                await fetch("/api/auth/logout", { method: "POST" });
                setMe(null);
                router.push("/auth/login");
                router.refresh();
              } catch {
                setError("Не удалось выйти");
              } finally {
                setBusy(false);
              }
            }}
          >
            Выйти
          </button>
        </div>
      ) : (
        <div className="text-xs text-white/40">Не авторизован</div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-white/45">Быстрое переключение (до 2)</div>
        <button
          type="button"
          disabled={busy || !me || accounts.length >= 2}
          className={cn(
            "rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition",
            "hover:bg-white/[0.08] active:scale-[0.98]",
            (busy || !me || accounts.length >= 2) && "opacity-60",
          )}
          onClick={async () => {
            if (!me) return;
            setError(null);
            setBusy(true);
            try {
              const t = await fetch("/api/auth/session-token").then((r) => r.json());
              const token = (t as { token?: string | null }).token;
              if (!token) throw new Error("No token");

              const next: SavedAccount = {
                email: me.email,
                username: me.username,
                displayName: me.display_name,
                token,
                savedAt: Date.now(),
              };

              const existing = readAccounts().filter(
                (a) => `${a.email}:${a.username}` !== `${next.email}:${next.username}`,
              );

              const merged = [next, ...existing].slice(0, 2);
              writeAccounts(merged);
              setAccounts(merged);
            } catch {
              setError("Не удалось добавить аккаунт");
            } finally {
              setBusy(false);
            }
          }}
        >
          Добавить
        </button>
      </div>

      <div className="space-y-2">
        {accounts.map((a) => {
          const key = `${a.email}:${a.username}`;
          const active = meKey ? key === meKey : false;

          return (
            <div
              key={key}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3",
                active && "border-white/[0.12] bg-white/[0.04]",
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white/85">
                  {a.displayName}
                </div>
                <div className="truncate text-xs text-white/40">@{a.username}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || active}
                  className={cn(
                    "rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition",
                    "hover:bg-white/[0.08] active:scale-[0.98]",
                    (busy || active) && "opacity-60",
                  )}
                  onClick={async () => {
                    setError(null);
                    setBusy(true);
                    try {
                      const res = await fetch("/api/auth/switch", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token: a.token }),
                      });
                      const data = (await res.json()) as { ok?: boolean; error?: string };
                      if (!res.ok) throw new Error(data.error ?? "Ошибка");

                      router.refresh();
                      router.push(`/profile/${a.username}`);
                      fetch("/api/me")
                        .then((r) => r.json())
                        .then((d: { user?: any }) => setMe(d.user ?? null))
                        .catch(() => setMe(null));
                    } catch {
                      setError("Не удалось переключить аккаунт");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {active ? "Текущий" : "Перейти"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={cn(
                    "grid size-9 place-items-center rounded-full bg-white/5 text-xs font-semibold text-white/70 transition",
                    "hover:bg-white/[0.08] active:scale-[0.98]",
                    busy && "opacity-60",
                  )}
                  aria-label="Удалить"
                  onClick={() => {
                    const next = readAccounts().filter(
                      (x) => `${x.email}:${x.username}` !== key,
                    );
                    writeAccounts(next);
                    setAccounts(next);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}

        {!accounts.length ? (
          <div className="text-xs text-white/40">Нет сохранённых аккаунтов</div>
        ) : null}
      </div>

      {error ? <div className="text-xs text-red-300/90">{error}</div> : null}
    </div>
  );
}
