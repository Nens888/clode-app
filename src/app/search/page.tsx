"use client";

import { GlassCard } from "@/components/GlassCard";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";

const hashtags = [
  { tag: "#супермилккотики", posts: "9,5 тыс. постов" },
  { tag: "#сос", posts: "8,8 тыс. постов" },
  { tag: "#крэш", posts: "6,4 тыс. постов" },
  { tag: "#пукс", posts: "4,3 тыс. постов" },
  { tag: "#креш", posts: "3,3 тыс. постов" },
  { tag: "#kresh", posts: "3,2 тыс. постов" },
  { tag: "#живойуголоклучшийдесервер", posts: "3 тыс. постов" },
  { tag: "#мем", posts: "2,9 тыс. постов" },
  { tag: "#ноужизаметъ", posts: "2,8 тыс. постов" },
  { tag: "#пукед", posts: "2,6 тыс. постов" },
];

const whoToRead = [
  { name: "Developer", username: "dev", followers: "50,8K подписчиков", avatar: "🦎" },
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<
    {
      username: string;
      displayName: string;
      avatarUrl: string | null;
      verif: boolean;
      followersCount: number;
      amIFollowing: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [devProfile, setDevProfile] = useState<{ username: string; displayName: string; avatarUrl: string | null; followersCount: number } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recent-search-profiles");
      if (stored) {
        setRecent(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Save recent searches to localStorage
  const saveRecent = (username: string) => {
    setRecent((prev) => {
      const filtered = prev.filter((u) => u !== username);
      const updated = [username, ...filtered].slice(0, 10);
      try {
        localStorage.setItem("recent-search-profiles", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    // Загружаем профиль 'dev' для блока "Кого читать"
    fetch("/api/profile/dev")
      .then((r) => r.json())
      .then((d) => {
        if (d.username) {
          setDevProfile({
            username: d.username,
            displayName: d.displayName,
            avatarUrl: d.avatarUrl,
            followersCount: d.followersCount ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = q.trim();
    if (!query) {
      setUsers([]);
      return;
    }

    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search/users?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d: { users?: any[] }) => {
          if (cancelled) return;
          setUsers((d.users ?? []) as any);
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-5 py-4">
        <input
          placeholder="Поиск пользователей и хэштегов"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-full border border-white/[0.06] bg-white/[0.04] px-4 py-2 text-sm text-white/85 placeholder:text-white/35 outline-none"
        />
      </div>

      {q.trim() ? (
        <div className="border-t border-white/[0.06] px-5 py-4">
          <div className="text-sm font-semibold text-white/90">Пользователи</div>
          {loading ? (
            <div className="mt-3 text-sm text-white/40">Поиск…</div>
          ) : users.length ? (
            <div className="mt-3 space-y-3">
              {users.map((u) => (
                <div
                  key={u.username}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <Link
                    href={`/profile/${u.username}`}
                    onClick={() => saveRecent(u.username)}
                    className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-90"
                  >
                    <div className="grid size-9 place-items-center overflow-hidden rounded-full bg-white/5 text-base">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "🫧"
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-white/90">
                          {u.displayName}
                        </div>
                        {u.verif ? <BadgeCheck size={14} className="text-[#38bdf8]" /> : null}
                      </div>
                      <div className="text-xs text-white/40">@{u.username}</div>
                      <div className="text-xs text-white/30">{u.followersCount} подписчиков</div>
                    </div>
                  </Link>

                  <FollowButton username={u.username} initialFollowing={u.amIFollowing} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/40">Ничего не найдено</div>
          )}
        </div>
      ) : null}

      <div className="border-t border-white/[0.06] px-5 py-4">
        <div className="text-sm font-semibold text-white/90">Недавние</div>
        <div className="mt-3 space-y-3">
          {recent.length ? (
            recent.map((username) => (
              <Link
                key={username}
                href={`/profile/${username}`}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.03]"
              >
                <div className="grid size-9 place-items-center overflow-hidden rounded-full bg-white/5 text-base">
                  <div className="text-xs text-white/35">@</div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white/90">
                    @{username}
                  </div>
                  <div className="text-xs text-white/40">Перейти в профиль</div>
                </div>
              </Link>
            ))
          ) : (
            <div className="mt-3 text-sm text-white/40">Нет недавних поисков</div>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-5 py-4">
        <div className="text-sm font-semibold text-white/90">Кого читать</div>
        <div className="mt-3 space-y-3">
          {devProfile ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center overflow-hidden rounded-full bg-white/5">
                  {devProfile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={devProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "🫧"
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/85">{devProfile.displayName}</div>
                  <div className="text-xs text-white/40">@{devProfile.username}</div>
                  <div className="text-xs text-white/30">{devProfile.followersCount} подписчиков</div>
                </div>
              </div>
              <Link
                href={`/profile/${devProfile.username}`}
                className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] active:scale-[0.98]"
              >
                Читать
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
