"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function MessageButton({
  username,
  disabled,
}: {
  username: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        disabled={Boolean(disabled) || busy}
        onClick={async () => {
          setError(null);
          setBusy(true);
          try {
            const res = await fetch("/api/messages/chats", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username }),
            });
            const data = (await res.json()) as { conversationId?: string; error?: string };
            if (!res.ok) throw new Error(data.error ?? "Ошибка");
            if (!data.conversationId) throw new Error("No conversationId");
            router.push(`/messages?c=${encodeURIComponent(data.conversationId)}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Ошибка");
          } finally {
            setBusy(false);
          }
        }}
        className={cn(
          "rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition",
          "hover:bg-white/[0.08] active:scale-[0.98]",
          (Boolean(disabled) || busy) && "cursor-not-allowed opacity-60 hover:bg-white/5 active:scale-100",
        )}
      >
        {busy ? "Открываю..." : "Написать"}
      </button>
      {error ? <div className="mt-2 text-xs text-red-300/90">{error}</div> : null}
    </div>
  );
}
