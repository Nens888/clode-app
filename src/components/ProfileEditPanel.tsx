"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

function normalizeUsername(input: string) {
  let v = input.trim().toLowerCase();
  if (v.startsWith("@")) v = v.slice(1);
  return v;
}

function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

export function ProfileEditPanel({
  initialDisplayName,
  initialUsername,
  initialPrivate,
}: {
  initialDisplayName: string;
  initialUsername: string;
  initialPrivate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [privateProfile, setPrivateProfile] = useState(initialPrivate);
  const [status, setStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = useMemo(() => normalizeUsername(username), [username]);

  useEffect(() => {
    let cancelled = false;

    if (!open) return;

    if (!normalized) {
      setStatus("invalid");
      return;
    }

    if (!isValidUsername(normalized)) {
      setStatus("invalid");
      return;
    }

    if (normalized === initialUsername) {
      setStatus("available");
      return;
    }

    setStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/username?username=${encodeURIComponent(normalized)}`,
        );
        const data = (await res.json()) as { available?: boolean };
        if (cancelled) return;
        setStatus(data.available ? "available" : "taken");
      } catch {
        if (cancelled) return;
        setStatus("idle");
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, normalized, initialUsername]);

  const canSave =
    Boolean(displayName.trim()) &&
    (status === "available" || normalized === initialUsername) &&
    !loading &&
    (displayName.trim() !== initialDisplayName ||
      normalized !== initialUsername ||
      privateProfile !== initialPrivate);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen((v) => !v);
        }}
        className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] active:scale-[0.98]"
      >
        Редактировать
      </button>

      {open ? (
        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="grid gap-3">
            <div>
              <div className="text-xs text-white/45">Имя</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm text-white/90 outline-none"
              />
            </div>

            <div>
              <div className="text-xs text-white/45">Username</div>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3">
                <div className="text-sm text-white/35">@</div>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent text-sm text-white/90 outline-none"
                />
                <div className="text-xs text-white/40">
                  {status === "checking" ? "..." : null}
                  {status === "available" ? "Ок" : null}
                  {status === "taken" ? "Занято" : null}
                  {status === "invalid" ? "Неверно" : null}
                </div>
              </div>
              <div className="mt-2 text-xs text-white/35">3-20: a-z, 0-9, _</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-white/45">Закрытый профиль</div>
              <button
                type="button"
                onClick={() => setPrivateProfile(!privateProfile)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  privateProfile ? "bg-[#0ea5e9]/70" : "bg-white/10",
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                    privateProfile ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>

            {error ? <div className="text-sm text-red-300/90">{error}</div> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDisplayName(initialDisplayName);
                  setUsername(initialUsername);
                  setPrivateProfile(initialPrivate);
                  setError(null);
                  setOpen(false);
                }}
                className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] active:scale-[0.98]"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={async () => {
                  setError(null);
                  setLoading(true);
                  try {
                    const res = await fetch("/api/profile/update", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        displayName: displayName.trim(),
                        username: normalized,
                        private: privateProfile,
                      }),
                    });

                    const data = (await res.json()) as { ok?: boolean; error?: string };
                    if (!res.ok) throw new Error(data.error ?? "Ошибка");

                    setOpen(false);
                    router.refresh();
                    router.push(`/profile/${normalized}`);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Ошибка");
                  } finally {
                    setLoading(false);
                  }
                }}
                className={cn(
                  "rounded-full bg-[#0ea5e9]/70 px-4 py-2 text-xs font-semibold text-white transition",
                  "hover:bg-[#0ea5e9]/85 active:scale-[0.98]",
                  !canSave && "opacity-60",
                )}
              >
                {loading ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
