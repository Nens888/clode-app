"use client";

import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { useEffect, useState } from "react";

const trends = [
  { tag: "#супермилккотики", posts: "9,5 тыс. постов" },
  { tag: "#сос", posts: "8,8 тыс. постов" },
  { tag: "#крэш", posts: "6,4 тыс. постов" },
  { tag: "#пукс", posts: "4,3 тыс. постов" },
  { tag: "#мем", posts: "2,9 тыс. постов" },
];

export function RightSidebar() {
  const [me, setMe] = useState<{ username: string; displayName: string; avatarUrl: string | null } | null>(null);

  useEffect(() => {
    // Всегда показываем профиль 'dev' (твой профиль) для всех пользователей
    fetch("/api/profile/dev")
      .then((r) => r.json())
      .then((d) => {
        if (d.username) {
          setMe({
            username: d.username,
            displayName: d.displayName,
            avatarUrl: d.avatarUrl,
          });
        }
      })
      .catch(() => {});
  }, []);
  return (
    <div className="sticky top-10 space-y-4">
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4">
          <AccountSwitcher />
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4">
          <div className="text-sm font-semibold text-white/90">Тренды</div>
          <div className="mt-3 space-y-3">
            {trends.map((t, idx) => (
              <div key={t.tag} className="flex items-start gap-3">
                <div className="w-5 text-xs text-white/35">{idx + 1}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white/85">
                    {t.tag}
                  </div>
                  <div className="text-xs text-white/40">{t.posts}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4">
          <div className="text-sm font-semibold text-white/90">Рекомендации</div>
          <div className="mt-3 space-y-3">
            {me ? (
              <div className="flex items-center justify-between gap-4">
                <Link
                  href={`/profile/${me.username}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="grid size-9 place-items-center overflow-hidden rounded-full bg-white/5 text-base">
                    {me.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🫧"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/85">
                      {me.displayName}
                    </div>
                    <div className="truncate text-xs text-white/40">@{me.username}</div>
                  </div>
                </Link>
                <Link
                  href={`/profile/${me.username}`}
                  className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  Читать
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </GlassCard>

      <div className="space-y-2 px-2 text-xs text-white/30">
        <div>Условия использования</div>
        <div>Конфиденциальность</div>
        <div>Cookies</div>
        <div>© 2025 Cloude</div>
      </div>
    </div>
  );
}
