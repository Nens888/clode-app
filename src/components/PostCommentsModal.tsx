"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Eye, Heart, MessageCircle, Repeat2 } from "lucide-react";

type UiComment = {
  id: string;
  text: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
};

type PostPreview = {
  authorName: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  likes: number;
  comments: number;
  reposts: number;
  views: number;
};

export function PostCommentsModal({
  postId,
  post,
  open,
  onClose,
  onCountChange,
}: {
  postId: string;
  post: PostPreview;
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<UiComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const previewLimit = 4;
  const visibleComments = showAll ? items : items.slice(0, previewLimit);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setShowAll(false);

    fetch(`/api/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((d: { comments?: UiComment[] }) => {
        const next = d.comments ?? [];
        setItems(next);
        onCountChange?.(next.length);
      })
      .catch(() => setError("Не удалось загрузить комментарии"))
      .finally(() => setLoading(false));
  }, [open, postId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }, 0);
    return () => clearTimeout(t);
  }, [open, items.length]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/65 px-4"
      onPointerDown={onClose}
    >
      <div
        className={cn(
          "w-full max-w-[560px] overflow-hidden rounded-3xl border border-white/[0.10] bg-black/55",
          "shadow-[0_50px_140px_rgba(0,0,0,0.85)] backdrop-blur-2xl",
        )}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="text-sm font-semibold text-white/90">Пост</div>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/[0.08] active:scale-[0.98]"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-5">
          <div className="flex gap-3">
            <Link
              href={`/profile/${post.username}`}
              className="mt-0.5 grid size-10 place-items-center overflow-hidden rounded-full bg-white/5 text-base"
            >
              {post.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                "🫧"
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${post.username}`}
                  className="truncate text-sm font-semibold text-white/90 hover:text-white"
                >
                  {post.authorName}
                </Link>
                <span className="truncate text-xs text-white/40">
                  @{post.username} · {formatPostDate(post.createdAt)}
                </span>
              </div>
              {post.text ? (
                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/90">
                  {post.text}
                </div>
              ) : null}

              {post.mediaUrl && post.mediaType === "image" ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.mediaUrl}
                    alt=""
                    className="max-h-[420px] w-full bg-black/20 object-contain"
                  />
                </div>
              ) : null}

              {post.mediaUrl && post.mediaType === "video" ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  <video
                    src={post.mediaUrl}
                    controls
                    playsInline
                    className="max-h-[420px] w-full bg-black/20 object-contain"
                  />
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-4 text-xs text-white/45">
                <Metric icon={Heart} value={post.likes} />
                <Metric icon={MessageCircle} value={post.comments} />
                <Metric icon={Repeat2} value={post.reposts} />
                <div className="ml-auto flex items-center gap-2">
                  <Eye size={14} />
                  <span>{formatNumber(post.views)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-white/90">
              Комментарии
              <span className="ml-2 text-xs font-normal text-white/45">{items.length}</span>
            </div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-white/75">
              Популярные
            </div>
          </div>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-auto px-6 py-4">
          {loading ? (
            <div className="py-10 text-center text-sm text-white/40">Загружаем…</div>
          ) : items.length ? (
            <div className="space-y-4">
              {visibleComments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Link
                    href={`/profile/${c.author.username}`}
                    className="mt-0.5 grid size-9 place-items-center overflow-hidden rounded-full bg-white/5 text-base"
                  >
                    {c.author.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🫧"
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${c.author.username}`}
                        className="text-sm font-semibold text-white/90 hover:text-white"
                      >
                        {c.author.displayName}
                      </Link>
                      <span className="text-xs text-white/40">@{c.author.username}</span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/85">
                      {c.text}
                    </div>
                  </div>
                </div>
              ))}

              {!showAll && items.length > previewLimit ? (
                <div className="pt-2">
                  <button
                    type="button"
                    className="text-sm text-white/45 hover:text-white/70 transition"
                    onClick={() => setShowAll(true)}
                  >
                    Показать ещё {items.length - previewLimit} комментариев
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-white/40">
              Пока нет комментариев
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.08] bg-white/[0.015] px-6 py-4">
          {error ? <div className="mb-2 text-xs text-red-300/90">{error}</div> : null}
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Написать комментарий…"
              rows={2}
              autoFocus
              className="min-h-[46px] flex-1 resize-none rounded-2xl border border-white/[0.04] bg-white/[0.015] px-4 py-3 text-sm text-white/90 placeholder:text-white/35 outline-none"
            />
            <button
              type="button"
              disabled={busy || !draft.trim()}
              className={cn(
                "rounded-full bg-[#0ea5e9]/70 px-5 py-3 text-xs font-semibold text-white transition",
                "hover:bg-[#0ea5e9]/85 active:scale-[0.98]",
                (busy || !draft.trim()) && "opacity-60",
              )}
              onClick={async () => {
                const text = draft.trim();
                if (!text) return;

                setBusy(true);
                setError(null);
                try {
                  const res = await fetch(`/api/posts/${postId}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text }),
                  });
                  const data = (await res.json()) as { ok?: boolean; error?: string };
                  if (!res.ok) throw new Error(data.error ?? "Ошибка");

                  setDraft("");
                  const refreshed = await fetch(`/api/posts/${postId}/comments`).then((r) =>
                    r.json(),
                  );
                  const next = (refreshed as { comments?: UiComment[] }).comments ?? [];
                  setItems(next);
                  onCountChange?.(next.length);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Ошибка");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "..." : "Отправить"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Metric({
  icon: Icon,
  value,
}: {
  icon: typeof Heart;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full px-2 py-1">
      <Icon size={14} />
      <span>{formatNumber(value)}</span>
    </div>
  );
}

function formatPostDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins} мин`;
  if (diffHours < 24) return `${diffHours} ч`;
  if (diffDays < 7) return `${diffDays} д`;

  // Если больше недели — показать дату и время
  const day = d.getDate();
  const month = d.toLocaleString("ru", { month: "long" });
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${hours}:${minutes}`;
}

function formatNumber(n: number) {
  if (n >= 1000000) return `${Math.round(n / 100000) / 10}M`;
  if (n >= 10000) return `${Math.round(n / 100) / 10}K`;
  return new Intl.NumberFormat("ru-RU").format(n);
}
