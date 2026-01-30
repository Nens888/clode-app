"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function ProfileAvatarEdit({
  avatarUrl,
  onUpdated,
}: {
  avatarUrl: string | null;
  onUpdated: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { avatarUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (!data.avatarUrl) throw new Error("No URL returned");
      onUpdated(data.avatarUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload error");
    } finally {
      setBusy(false);
    }

    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="relative group">
      <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-white/5 text-2xl">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          "🫧"
        )}
      </div>
      <button
        type="button"
        disabled={busy}
        className="absolute inset-0 grid place-items-center rounded-full bg-black/60 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
        onClick={() => fileRef.current?.click()}
      >
        {busy ? "..." : "Заменить"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
      {error ? (
        <div className="absolute -bottom-6 left-0 text-xs text-red-300/90">
          {error}
        </div>
      ) : null}
    </div>
  );
}
