"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Bell, Home, Mail, Music, Search, User } from "lucide-react";
import { useEffect, useState } from "react";

const items = [
  { href: "/", icon: Home, label: "Лента" },
  { href: "/search", icon: Search, label: "Поиск" },
  { href: "/messages", icon: Mail, label: "Сообщения" },
  { href: "/music", icon: Music, label: "Музыка" },
  { href: "/notifications", icon: Bell, label: "Уведомления" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [meUsername, setMeUsername] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { user?: { username?: string } | null }) => {
        if (cancelled) return;
        setMeUsername(d.user?.username ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setMeUsername(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/messages/chats");
        const data = (await res.json()) as { chats?: { unread?: number }[] };
        if (cancelled) return;
        const total = (data.chats ?? []).reduce(
          (acc, c) => acc + (typeof c.unread === "number" ? c.unread : 0),
          0,
        );
        setUnreadMessages(total);
      } catch {
        if (cancelled) return;
        setUnreadMessages(0);
      }
    };

    void tick();
    const id = window.setInterval(tick, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = (await res.json()) as { unread?: number };
        if (cancelled) return;
        setUnread(typeof data.unread === "number" ? data.unread : 0);
      } catch {
        if (cancelled) return;
        setUnread(0);
      }
    };

    void tick();
    const id = window.setInterval(tick, 15000);

    const onUpdate = () => void tick();
    window.addEventListener("clode:notifications-updated", onUpdate);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("clode:notifications-updated", onUpdate);
    };
  }, []);

  const profileHref = meUsername ? `/profile/${meUsername}` : "/auth/login";
  const navItems = [...items, { href: profileHref, icon: User, label: "Профиль" }];

  return (
    <aside className="sticky top-10 flex flex-col items-center gap-6">
      <div className="select-none text-sm font-semibold tracking-wide text-white/70">
        Cloude
      </div>
      <nav className="flex w-[76px] flex-col items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl saturate-150">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative grid size-12 place-items-center rounded-full transition",
                "hover:bg-white/[0.06] active:scale-[0.96]",
                active && "bg-white/[0.08]",
              )}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={20} className={cn("text-white/75", active && "text-white")} />
              {item.href === "/notifications" && unread > 0 ? (
                <span className="absolute right-2 top-2 grid min-w-[18px] place-items-center rounded-full bg-[#ff4d6d] px-1.5 text-[10px] font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
              {item.href === "/messages" && unreadMessages > 0 ? (
                <span className="absolute right-2 top-2 grid min-w-[18px] place-items-center rounded-full bg-[#0ea5e9]/70 px-1.5 text-[10px] font-semibold text-white">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
