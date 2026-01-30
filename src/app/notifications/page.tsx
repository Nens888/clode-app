"use client";

import { GlassCard } from "@/components/GlassCard";
import { Tabs } from "@/components/Tabs";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";

type UiNotification = {
  id: string;
  type: "like" | "comment" | "follow";
  createdAt: string;
  readAt: string | null;
  actor: { username: string; displayName: string; avatarUrl: string | null; verif?: boolean };
  post: { id: string; text: string } | null;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<UiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d: { notifications?: UiNotification[] }) => {
        if (cancelled) return;
        setItems(d.notifications ?? []);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const unreadIds = items.filter((x) => !x.readAt).map((x) => x.id);
    if (!unreadIds.length) return;

    setItems((prev) => prev.map((x) => (x.readAt ? x : { ...x, readAt: "now" })));
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).finally(() => {
      window.dispatchEvent(new Event("clode:notifications-updated"));
    });
  }, [items]);

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-5 py-4">
        <h1 className="text-sm font-semibold text-white/90">Уведомления</h1>
      </div>
      <Tabs
        items={[
          { label: "Все", href: "/notifications" },
          { label: "Упоминания", href: "/notifications/mentions" },
        ]}
      />

      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
            <div className="text-white/25">🔔</div>
            <div className="text-sm text-white/40">Загружаем…</div>
          </div>
        ) : items.length ? (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={cn(
                "w-full border-b border-white/[0.06] px-5 py-4 text-left transition",
                "hover:bg-white/[0.03]",
                !n.readAt && "bg-white/[0.02]",
              )}
              onClick={async () => {
                if (!n.readAt) {
                  setItems((prev) =>
                    prev.map((x) =>
                      x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x,
                    ),
                  );
                  await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: [n.id] }),
                  });
                }
              }}
            >
              <div className="flex items-start gap-3">
                <Link
                  href={`/profile/${n.actor.username}`}
                  className="mt-0.5 grid size-9 place-items-center overflow-hidden rounded-full bg-white/5 text-base"
                  onClick={(e) => e.stopPropagation()}
                >
                  {n.actor.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.actor.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "🫧"
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white/85">
                    <Link
                      href={`/profile/${n.actor.username}`}
                      className="hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {n.actor.displayName}
                    </Link>
                    {n.actor.verif ? (
                      <BadgeCheck size={14} className="ml-2 inline-block text-[#38bdf8]" />
                    ) : null}
                    <span className="ml-2 text-xs font-normal text-white/40">@{n.actor.username}</span>
                  </div>
                  <div className="mt-1 text-sm text-white/70">
                    {n.type === "like"
                      ? "лайкнул(а) ваш пост"
                      : n.type === "comment"
                        ? "оставил(а) комментарий"
                        : "подписался(ась) на вас"}
                  </div>
                  {n.post?.text ? (
                    <div className="mt-2 line-clamp-2 text-xs text-white/40">
                      {n.post.text}
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
            <div className="text-white/25">🔔</div>
            <div className="text-sm text-white/40">Нет уведомлений</div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
