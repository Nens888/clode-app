"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export function FollowButton({
  username,
  initialFollowing,
}: {
  username: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className={cn(
        "rounded-full px-4 py-2 text-xs font-semibold transition active:scale-[0.98]",
        following
          ? "bg-white/[0.06] text-white/80 hover:bg-white/[0.08]"
          : "bg-[#0ea5e9]/70 text-white hover:bg-[#0ea5e9]/85",
        busy && "opacity-60",
      )}
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        const next = !following;
        setFollowing(next);

        try {
          const res = await fetch(`/api/follows/${encodeURIComponent(username)}`, {
            method: next ? "POST" : "DELETE",
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok) throw new Error(data.error ?? "Ошибка");
          router.refresh();
        } catch {
          setFollowing(!next);
        } finally {
          setBusy(false);
        }
      }}
    >
      {following ? "Отписаться" : "Подписаться"}
    </button>
  );
}
