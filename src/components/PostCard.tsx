"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { Post } from "@/store/feedStore";
import { BadgeCheck, Eye, Heart, MessageCircle, Repeat2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedStore } from "@/store/feedStore";
import { PostCommentsModal } from "@/components/PostCommentsModal";

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

export function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const loadFeed = useFeedStore((s) => s.loadFeed);
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likes, setLikes] = useState(post.likes);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(post.comments);
  const [viewSent, setViewSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = () => setOpen(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (viewSent) return;
    const el = document.getElementById(`post-${post.id}`);
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          setViewSent(true);
          fetch(`/api/posts/${post.id}/view`, { method: "POST" }).catch(() => {});
          obs.disconnect();
        }
      },
      { threshold: [0.6] },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [post.id, viewSent]);

  return (
    <>
    <motion.article
      id={`post-${post.id}`}
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="border-b border-white/[0.06] px-5 py-4"
    >
      <div className="flex gap-3">
        <div className="mt-0.5 grid size-9 place-items-center overflow-hidden rounded-full bg-white/5 text-base">
          {post.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            "🫧"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/profile/${post.username}`} className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="truncate text-sm font-semibold text-white/90 hover:text-white">
                  {post.authorName}
                </div>
                {post.verif ? (
                  <BadgeCheck size={14} className="shrink-0 text-[#38bdf8]" />
                ) : null}
              </div>
              <div className="text-xs text-white/40">@{post.username} · {formatPostDate(post.createdAt)}</div>
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                className="grid size-8 place-items-center rounded-full text-white/50 transition hover:bg-white/[0.06] hover:text-white/80 active:scale-[0.96]"
                aria-label="Меню"
              >
                ···
              </button>

              {open && post.canDelete ? (
                <div
                  className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 shadow-[0_30px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={cn(
                      "w-full px-4 py-3 text-left text-sm text-white/85 transition",
                      "hover:bg-white/[0.06] active:bg-white/[0.08]",
                    )}
                    onClick={async () => {
                      setOpen(false);
                      const ok = window.confirm("Удалить пост?");
                      if (!ok) return;

                      await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
                      await loadFeed();
                      router.refresh();
                    }}
                  >
                    Удалить
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {post.text ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">
              {post.text}
            </p>
          ) : null}

          {post.mediaUrl && post.mediaType === "image" ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.mediaUrl}
                alt=""
                className="max-h-[520px] w-full bg-black/20 object-contain"
                loading="lazy"
              />
            </div>
          ) : null}

          {post.mediaUrl && post.mediaType === "video" ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <video
                src={post.mediaUrl}
                controls
                playsInline
                className="h-[320px] w-full object-cover"
              />
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-4 text-xs text-white/45">
            <Action
              icon={Heart}
              value={likes}
              active={liked}
              disabled={likeBusy}
              onClick={async () => {
                if (likeBusy) return;
                setLikeBusy(true);

                const nextLiked = !liked;
                setLiked(nextLiked);
                setLikes((v) => Math.max(0, v + (nextLiked ? 1 : -1)));

                try {
                  await fetch(`/api/posts/${post.id}/like`, {
                    method: nextLiked ? "POST" : "DELETE",
                  });
                  await loadFeed();
                  router.refresh();
                } finally {
                  setLikeBusy(false);
                }
              }}
            />
            <Action
              icon={MessageCircle}
              value={comments}
              onClick={() => setCommentsOpen(true)}
            />
            <Action icon={Repeat2} value={post.reposts} />
            <div className="ml-auto flex items-center gap-2">
              <Eye size={14} />
              <span>{formatNumber(post.views)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
    <PostCommentsModal
      postId={post.id}
      post={{
        authorName: post.authorName,
        username: post.username,
        avatarUrl: post.avatarUrl,
        createdAt: post.createdAt,
        text: post.text,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        likes,
        comments,
        reposts: post.reposts,
        views: post.views,
      }}
      open={commentsOpen}
      onClose={() => setCommentsOpen(false)}
      onCountChange={(count) => {
        setComments(count);
        void loadFeed();
        router.refresh();
      }}
    />
    </>
  );
}

function Action({
  icon: Icon,
  value,
  active,
  disabled,
  onClick,
}: {
  icon: typeof Heart;
  value: number;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full px-2 py-1 transition",
        "hover:bg-white/[0.06] hover:text-white/80 active:scale-[0.98]",
        active && "text-[#ff4d6d]",
        disabled && "opacity-60",
      )}
    >
      <Icon size={14} />
      <span>{formatNumber(value)}</span>
    </button>
  );
}

function formatNumber(value: number) {
  if (value >= 1000000) return `${Math.round(value / 100000) / 10}M`;
  if (value >= 10000) return `${Math.round(value / 100) / 10}K`;
  return new Intl.NumberFormat("ru-RU").format(value);
}
