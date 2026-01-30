"use client";

import { useFeedStore } from "@/store/feedStore";
import { cn } from "@/lib/cn";
import { ImageIcon, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";

export function CreatePost({ placeholder }: { placeholder?: string }) {
  const draft = useFeedStore((s) => s.draft);
  const setDraft = useFeedStore((s) => s.setDraft);
  const publish = useFeedStore((s) => s.publish);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { user?: { avatar_url?: string | null } | null }) => {
        if (cancelled) return;
        setAvatarUrl(d.user?.avatar_url ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setAvatarUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="px-6 py-5">
      <div className="flex items-start gap-3">
        <div className="mt-1 grid size-9 place-items-center overflow-hidden rounded-full bg-white/5 text-lg">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            "🫧"
          )}
        </div>
        <div
          className="flex-1"
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items?.length) return;

            for (const it of Array.from(items)) {
              if (it.kind !== "file") continue;
              const blob = it.getAsFile();
              if (!blob) continue;
              if (!blob.type?.startsWith("image/")) continue;

              const ext = blob.type.split("/")[1] || "png";
              const pasted = new File([blob], `pasted-${Date.now()}.${ext}`, {
                type: blob.type,
              });
              setFile(pasted);
              break;
            }
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder ?? "Что нового?"}
            className="w-full bg-transparent text-[15px] text-white/90 placeholder:text-white/35 outline-none"
          />

          {previewUrl ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              {file?.type?.startsWith("video/") ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="h-[280px] w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="max-h-[380px] w-full bg-black/20 object-contain"
                />
              )}
              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
                <div className="truncate text-xs text-white/45">{file?.name}</div>
                <button
                  type="button"
                  className="text-xs text-white/55 hover:text-white/80"
                  onClick={() => setFile(null)}
                >
                  Убрать
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[color:var(--accent)]">
              <button
                type="button"
                className={cn(
                  "grid size-9 place-items-center rounded-full transition",
                  "hover:bg-white/[0.06] active:scale-[0.96]",
                )}
                aria-label="Прикрепить"
                onClick={() => {
                  (document.getElementById("create-post-file") as HTMLInputElement | null)?.click();
                }}
              >
                <Paperclip size={16} />
              </button>
              <button
                type="button"
                className={cn(
                  "grid size-9 place-items-center rounded-full transition",
                  "hover:bg-white/[0.06] active:scale-[0.96]",
                )}
                aria-label="Добавить изображение"
                onClick={() => {
                  (document.getElementById("create-post-file") as HTMLInputElement | null)?.click();
                }}
              >
                <ImageIcon size={16} />
              </button>

              <input
                id="create-post-file"
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  e.currentTarget.value = "";
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                void publish(file);
                setFile(null);
              }}
              className={cn(
                "rounded-full bg-[#0ea5e9]/70 px-6 py-[10px] text-xs font-semibold text-white shadow-sm transition",
                "hover:bg-[#0ea5e9]/85 active:scale-[0.98]",
              )}
            >
              Опубликовать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
