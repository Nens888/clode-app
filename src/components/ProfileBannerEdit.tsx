"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function ProfileBannerEdit({
  bannerUrl,
  onUpdated,
}: {
  bannerUrl: string | null;
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
      const res = await fetch("/api/profile/banner", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { bannerUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (!data.bannerUrl) throw new Error("No URL returned");
      onUpdated(data.bannerUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload error");
    } finally {
      setBusy(false);
    }

    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div
      className="relative h-full cursor-pointer"
      onClick={() => fileRef.current?.click()}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent" />
      <div className="absolute inset-0 opacity-20 [background:radial-gradient(600px_200px_at_20%_10%,rgba(34,211,238,0.45),transparent_55%)]" />
      <div className="absolute inset-0 opacity-20 [background:radial-gradient(600px_220px_at_85%_15%,rgba(99,102,241,0.35),transparent_55%)]" />
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bannerUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : null}
      {busy ? (
        <div className="absolute inset-0 grid place-items-center bg-black/60 text-sm font-semibold text-white">
          Загрузка...
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
      {error ? (
        <div className="absolute bottom-4 left-4 rounded bg-black/80 px-2 py-1 text-xs text-red-300/90">
          {error}
        </div>
      ) : null}
    </div>
  );
}
