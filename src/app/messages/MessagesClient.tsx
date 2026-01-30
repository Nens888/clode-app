"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  BadgeCheck,
  File as FileIcon,
  Mic,
  Pause,
  Smile,
  Pin,
  PinOff,
  Play,
  Send,
  Trash2,
  X,
} from "lucide-react";

type Chat = {
  id: string;
  pinned: boolean;
  unread: number;
  other: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    verif: boolean;
  } | null;
  lastMessage: {
    id: string;
    type: string;
    text: string | null;
    voiceUrl: string | null;
    createdAt: string;
    senderId: string;
  } | null;
};

type Message = {
  id: string;
  senderId: string;
  type: "text" | "voice" | "media";
  text: string | null;
  voiceUrl: string | null;
  voiceDurationMs: number | null;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  createdAt: string;
  reactions?: Record<string, number>;
  myReaction?: string | null;
};

type Me = { id: string; username: string };

function formatVoiceDuration(ms: number | null) {
  const s = Math.max(0, Math.floor((ms ?? 0) / 1000));
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

type MediaModalState =
  | null
  | {
      messageId: string;
      url: string;
      mime: string;
    };

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatListTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 60) return `${Math.max(1, mins)} мин`;
  if (hours < 24) return `${hours} ч`;
  if (days === 1) return "вчера";
  if (days < 7) return `${days} д`;
  const dd = d.getDate();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${dd}.${mm}`;
}

function VoiceBubble({
  url,
  durationMs,
}: {
  url: string;
  durationMs: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const tick = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrent(a.currentTime);
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => stopRaf();
  }, []);

  const total = Math.max(1, Math.floor((durationMs ?? 0) / 1000) || 1);
  const cur = Math.min(total, Math.max(0, Math.floor(current)));

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => {
          const a = audioRef.current;
          if (!a) return;
          if (a.paused) {
            void a.play();
          } else {
            a.pause();
          }
        }}
        className="grid size-9 place-items-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/[0.08] active:scale-[0.98]"
        aria-label={playing ? "Пауза" : "Воспроизвести"}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={total}
          value={cur}
          onChange={(e) => {
            const a = audioRef.current;
            if (!a) return;
            a.currentTime = Number(e.target.value);
            setCurrent(a.currentTime);
          }}
          className="w-full accent-white/70"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-white/45">
          <span>{formatVoiceDuration(cur * 1000)}</span>
          <span>{formatVoiceDuration(durationMs)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          stopRaf();
          rafRef.current = requestAnimationFrame(tick);
        }}
        onPause={() => {
          setPlaying(false);
          stopRaf();
        }}
        onEnded={() => {
          setPlaying(false);
          stopRaf();
          setCurrent(0);
          const a = audioRef.current;
          if (a) a.currentTime = 0;
        }}
        className="hidden"
      />
    </div>
  );
}

export function MessagesClient() {
  const search = useSearchParams();
  const selectedId = search.get("c");

  const [me, setMe] = useState<Me | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<Chat["other"]>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [pendingDeleted, setPendingDeleted] = useState<Set<string>>(() => new Set());
  const pendingDeletedRef = useRef(pendingDeleted);
  useEffect(() => {
    pendingDeletedRef.current = pendingDeleted;
  }, [pendingDeleted]);

  const [text, setText] = useState("");
  const [chatQuery, setChatQuery] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<
    | null
    | {
        file: File;
        url: string;
        kind: "image" | "video";
      }
  >(null);

  const [mediaModal, setMediaModal] = useState<MediaModalState>(null);
  const [mediaLikes, setMediaLikes] = useState<{ likes: number; likedByMe: boolean } | null>(
    null,
  );
  const [mediaComments, setMediaComments] = useState<
    {
      id: string;
      text: string;
      createdAt: string;
      user: {
        username: string;
        displayName: string;
        avatarUrl: string | null;
        verif: boolean;
      };
    }[]
  >([]);
  const [mediaCommentText, setMediaCommentText] = useState("");

  const [menuForMessage, setMenuForMessage] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<
    | null
    | {
        messageId: string;
        x: number;
        y: number;
        canDeleteAll: boolean;
      }
  >(null);

  const [recState, setRecState] = useState<
    | { mode: "idle" }
    | { mode: "recording"; startedAt: number; recorder: MediaRecorder; chunks: Blob[] }
    | { mode: "preview"; blob: Blob; url: string; durationMs: number }
  >({ mode: "idle" });

  const listRef = useRef<HTMLDivElement | null>(null);

  const selectedIdRef = useRef<string | null>(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const messagesCacheRef = useRef(new Map<string, Message[]>());
  const otherCacheRef = useRef(new Map<string, Chat["other"]>());
  const messagesFetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!mediaModal) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [likesRes, commentsRes] = await Promise.all([
          fetch(`/api/messages/media/${encodeURIComponent(mediaModal.messageId)}/likes`),
          fetch(`/api/messages/media/${encodeURIComponent(mediaModal.messageId)}/comments`),
        ]);
        const likesData = (await likesRes.json()) as { likes?: number; likedByMe?: boolean };
        const commentsData = (await commentsRes.json()) as { comments?: any[] };
        if (cancelled) return;
        setMediaLikes({ likes: likesData.likes ?? 0, likedByMe: Boolean(likesData.likedByMe) });
        setMediaComments((commentsData.comments ?? []) as any);
      } catch {
        if (cancelled) return;
        setMediaLikes({ likes: 0, likedByMe: false });
        setMediaComments([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [mediaModal]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { user?: any | null }) => {
        if (d.user?.id && d.user?.username) setMe({ id: String(d.user.id), username: String(d.user.username) });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingChats(true);
    fetch("/api/messages/chats")
      .then((r) => r.json())
      .then((d) => setChats((d.chats ?? []) as Chat[]))
      .finally(() => setLoadingChats(false));
  }, []);

  useEffect(() => {
    const onClick = () => {
      setMenuForMessage(null);
      setCtxMenu(null);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCtxMenu(null);
        setMenuForMessage(null);
        setEmojiOpen(false);
        setAttachOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [setEmojiOpen, setAttachOpen]);

  const reloadChats = async () => {
    try {
      const r = await fetch("/api/messages/chats");
      const d = await r.json();
      setChats((d.chats ?? []) as Chat[]);
    } catch {}
  };

  const reloadMessages = async (
    conversationId: string,
    opts?: { silent?: boolean; signal?: AbortSignal },
  ) => {
    try {
      if (!opts?.silent) setLoadingMessages(true);
      const r = await fetch(`/api/messages/${encodeURIComponent(conversationId)}?limit=200`, {
        signal: opts?.signal,
      });
      const d = await r.json();
      const incoming = (d.messages ?? []) as Message[];
      const nextMessages = incoming.filter((m) => !pendingDeletedRef.current.has(m.id));
      const nextOther = (d.other ?? null) as Chat["other"];

      messagesCacheRef.current.set(conversationId, nextMessages);
      otherCacheRef.current.set(conversationId, nextOther);

      if (selectedIdRef.current === conversationId) {
        setMessages(nextMessages);
        setOther(nextOther);
      }
    } catch {}
    finally {
      if (!opts?.silent && selectedIdRef.current === conversationId) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    if (!me?.id) return;

    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      supabase = null;
    }

    if (!supabase) {
      const id = window.setInterval(() => {
        if (!selectedIdRef.current) return;
        void reloadMessages(selectedIdRef.current, { silent: true });
        void reloadChats();
      }, 4000);
      return () => window.clearInterval(id);
    }

    const channel = supabase
      .channel(`dm:${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const evt = payload.eventType;
          const newRow = (payload as any).new as any | null;
          const oldRow = (payload as any).old as any | null;

          const row = (newRow ?? oldRow) as any;
          const id = row?.id ? String(row.id) : null;
          if (!id) return;

          if (evt === "INSERT" && newRow) {
            const deletedAt = (newRow as any).deleted_at;
            const deletedFor = (((newRow as any).deleted_for as string[] | null) ?? []).map(String);
            if (deletedAt) return;
            if (deletedFor.includes(me.id)) return;
            if (pendingDeletedRef.current.has(id)) return;

            const msg: Message = {
              id,
              senderId: String((newRow as any).sender_id),
              type: String((newRow as any).type) as any,
              text: ((newRow as any).text as string | null) ?? null,
              voiceUrl: ((newRow as any).voice_url as string | null) ?? null,
              voiceDurationMs: ((newRow as any).voice_duration_ms as number | null) ?? null,
              mediaUrl: ((newRow as any).media_url as string | null) ?? null,
              mediaMime: ((newRow as any).media_mime as string | null) ?? null,
              createdAt: String((newRow as any).created_at),
              reactions: {},
              myReaction: null,
            };

            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              const next = [...prev, msg];
              messagesCacheRef.current.set(selectedId, next);
              return next;
            });
            return;
          }

          if (evt === "UPDATE" && newRow) {
            const deletedAt = (newRow as any).deleted_at;
            const deletedFor = (((newRow as any).deleted_for as string[] | null) ?? []).map(String);
            if (deletedAt || deletedFor.includes(me.id)) {
              setMessages((prev) => {
                const next = prev.filter((m) => m.id !== id);
                messagesCacheRef.current.set(selectedId, next);
                return next;
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const newRow = (payload as any).new as any | null;
          const oldRow = (payload as any).old as any | null;

          const row = (newRow ?? oldRow) as any;
          const messageId = row?.message_id ? String(row.message_id) : null;
          if (!messageId) return;

          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === messageId);
            if (idx === -1) return prev;

            const next = [...prev];
            const m = next[idx];

            const counts = { ...(m.reactions ?? {}) };
            const myId = me.id;

            const evt = payload.eventType;
            if (evt === "INSERT" && newRow) {
              const emoji = String((newRow as any).emoji);
              counts[emoji] = (counts[emoji] ?? 0) + 1;
              if (String((newRow as any).user_id) === myId) {
                next[idx] = { ...m, reactions: counts, myReaction: emoji };
              } else {
                next[idx] = { ...m, reactions: counts };
              }
            }

            if (evt === "DELETE" && oldRow) {
              const emoji = String((oldRow as any).emoji);
              counts[emoji] = Math.max(0, (counts[emoji] ?? 0) - 1);
              if (counts[emoji] === 0) delete counts[emoji];
              if (String((oldRow as any).user_id) === myId) {
                next[idx] = { ...m, reactions: counts, myReaction: null };
              } else {
                next[idx] = { ...m, reactions: counts };
              }
            }

            if (evt === "UPDATE" && newRow && oldRow) {
              const oldEmoji = String((oldRow as any).emoji);
              const newEmoji = String((newRow as any).emoji);
              if (oldEmoji !== newEmoji) {
                counts[oldEmoji] = Math.max(0, (counts[oldEmoji] ?? 0) - 1);
                if (counts[oldEmoji] === 0) delete counts[oldEmoji];
                counts[newEmoji] = (counts[newEmoji] ?? 0) + 1;
              }
              if (String((newRow as any).user_id) === myId) {
                next[idx] = { ...m, reactions: counts, myReaction: newEmoji };
              } else {
                next[idx] = { ...m, reactions: counts };
              }
            }

            messagesCacheRef.current.set(selectedId, next);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId, me?.id]);

  const setReaction = async (messageId: string, emoji: string) => {
    if (!selectedId) return;
    setMenuForMessage(null);
    setCtxMenu(null);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const prevEmoji = m.myReaction ?? null;
        const nextCounts = { ...(m.reactions ?? {}) };
        if (prevEmoji) {
          nextCounts[prevEmoji] = Math.max(0, (nextCounts[prevEmoji] ?? 0) - 1);
          if (nextCounts[prevEmoji] === 0) delete nextCounts[prevEmoji];
        }
        nextCounts[emoji] = (nextCounts[emoji] ?? 0) + 1;
        return { ...m, reactions: nextCounts, myReaction: emoji };
      }),
    );

    try {
      const res = await fetch(`/api/messages/message/${encodeURIComponent(messageId)}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) {
        await reloadMessages(selectedId);
      }
    } catch {}
  };

  const clearReaction = async (messageId: string) => {
    if (!selectedId) return;
    setMenuForMessage(null);
    setCtxMenu(null);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const prevEmoji = m.myReaction ?? null;
        if (!prevEmoji) return m;
        const nextCounts = { ...(m.reactions ?? {}) };
        nextCounts[prevEmoji] = Math.max(0, (nextCounts[prevEmoji] ?? 0) - 1);
        if (nextCounts[prevEmoji] === 0) delete nextCounts[prevEmoji];
        return { ...m, reactions: nextCounts, myReaction: null };
      }),
    );

    try {
      const res = await fetch(`/api/messages/message/${encodeURIComponent(messageId)}/reactions`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await reloadMessages(selectedId);
      }
    } catch {}
  };

  const sendMedia = async () => {
    if (!selectedId) return;
    if (!pendingMedia) return;

    const form = new FormData();
    form.append("kind", "media");
    form.append("file", pendingMedia.file);

    const res = await fetch(`/api/messages/${encodeURIComponent(selectedId)}`, {
      method: "POST",
      body: form,
    });

    if (res.ok) {
      const d = await res.json();
      if (d.message) setMessages((prev) => [...prev, d.message]);
      void reloadChats();
      URL.revokeObjectURL(pendingMedia.url);
      setPendingMedia(null);
      setAttachOpen(false);
    }
  };

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setOther(null);
      const empty = new Set<string>();
      setPendingDeleted(empty);
      return;
    }

    const cachedMessages = messagesCacheRef.current.get(selectedId);
    const cachedOther = otherCacheRef.current.get(selectedId);
    if (cachedMessages) {
      setMessages(cachedMessages.filter((m) => !pendingDeletedRef.current.has(m.id)));
      setOther((cachedOther ?? null) as Chat["other"]);
    } else {
      setMessages([]);
      setOther(null);
    }

    if (messagesFetchAbortRef.current) messagesFetchAbortRef.current.abort();
    const controller = new AbortController();
    messagesFetchAbortRef.current = controller;
    void reloadMessages(selectedId, { silent: Boolean(cachedMessages), signal: controller.signal });

    fetch(`/api/messages/${encodeURIComponent(selectedId)}/read`, { method: "POST" }).catch(() => {});
  }, [selectedId]);

  const pinned = useMemo(() => chats.filter((c) => c.pinned), [chats]);
  const regular = useMemo(() => chats.filter((c) => !c.pinned), [chats]);

  const sortedChats = useMemo(() => [...pinned, ...regular], [pinned, regular]);

  const filteredChats = useMemo(() => {
    const q = chatQuery.trim().toLowerCase();
    if (!q) return sortedChats;
    return sortedChats.filter((c) => {
      const name = (c.other?.displayName ?? "").toLowerCase();
      const username = (c.other?.username ?? "").toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [sortedChats, chatQuery]);

  const togglePin = async (conversationId: string, nextPinned: boolean) => {
    setChats((prev) => prev.map((c) => (c.id === conversationId ? { ...c, pinned: nextPinned } : c)));
    try {
      await fetch(`/api/messages/${encodeURIComponent(conversationId)}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: nextPinned }),
      });
    } catch {}
  };

  const deleteMessage = async (messageId: string, scope: "me" | "all") => {
    if (!selectedId) return;
    setMenuForMessage(null);
    setCtxMenu(null);
    try {
      setPendingDeleted((prev) => {
        const next = new Set(prev);
        next.add(messageId);
        return next;
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      const res = await fetch(`/api/messages/message/${encodeURIComponent(messageId)}?scope=${scope}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setPendingDeleted((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
        await reloadMessages(selectedId);
      }
    } catch {}
  };

  const sendText = async () => {
    if (!selectedId) return;
    const t = text.trim();
    if (!t) return;
    setText("");
    const res = await fetch(`/api/messages/${encodeURIComponent(selectedId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.message) setMessages((prev) => [...prev, d.message]);
      void reloadChats();
    }
  };

  const startRecording = async () => {
    if (!selectedId) return;
    if (recState.mode !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        const durationMs = Date.now() - startedAt;
        setRecState({ mode: "preview", blob, url, durationMs });
      };
      const startedAt = Date.now();
      recorder.start();
      setRecState({ mode: "recording", startedAt, recorder, chunks });
    } catch {
      setRecState({ mode: "idle" });
    }
  };

  const stopRecording = () => {
    if (recState.mode !== "recording") return;
    recState.recorder.stop();
  };

  const discardRecording = () => {
    if (recState.mode === "preview") {
      URL.revokeObjectURL(recState.url);
    }
    setRecState({ mode: "idle" });
  };

  const sendVoice = async () => {
    if (!selectedId) return;
    if (recState.mode !== "preview") return;
    const { blob, durationMs } = recState;
    discardRecording();

    const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
    const form = new FormData();
    form.append("file", file);
    form.append("durationMs", String(durationMs));

    const res = await fetch(`/api/messages/${encodeURIComponent(selectedId)}`, {
      method: "POST",
      body: form,
    });
    if (res.ok) {
      const d = await res.json();
      if (d.message) setMessages((prev) => [...prev, d.message]);
      void reloadChats();
    }
  };

  const scrollToBottom = (smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    if (!selectedId) return;
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < 220) {
      scrollToBottom(false);
    }
  }, [messages.length, selectedId]);

  return (
    <div className={cn("grid gap-4", "h-[calc(100vh-180px)]", "overflow-hidden", "lg:grid-cols-[320px_1fr]")}>
      <GlassCard className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <div className="text-base font-semibold text-white/90">Сообщения</div>
          <div className="mt-3">
            <input
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              placeholder="Поиск чатов"
              className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/35 outline-none"
            />
          </div>
          {loadingChats ? <div className="mt-3 text-sm text-white/40">Загрузка…</div> : null}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hidden">
          {filteredChats.map((c) => (
            <Link
              key={c.id}
              href={`/messages?c=${encodeURIComponent(c.id)}`}
              className={cn(
                "group flex items-center justify-between gap-3 px-4 py-2.5",
                "border-b border-white/[0.06] transition",
                "hover:bg-white/[0.03]",
                selectedId === c.id && "bg-white/[0.03]",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-[3px] rounded-full",
                    c.unread ? "bg-[#0ea5e9]/70" : "bg-transparent",
                  )}
                />

                <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 text-base">
                  {c.other?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.other.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "🫧"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold text-white/90">
                      {c.other?.displayName ?? "Чат"}
                    </div>
                    {c.other?.verif ? <BadgeCheck size={14} className="shrink-0 text-[#38bdf8]" /> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="truncate text-xs text-white/40">
                      {c.lastMessage?.type === "voice"
                        ? "Голосовое"
                        : c.lastMessage?.type === "media"
                          ? "Медиа"
                          : c.lastMessage?.text ?? ""}
                    </div>
                    <div className="shrink-0 text-[11px] text-white/30">
                      {c.lastMessage?.createdAt ? formatListTime(c.lastMessage.createdAt) : ""}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void togglePin(c.id, !c.pinned);
                  }}
                  className={cn(
                    "grid size-9 place-items-center rounded-full text-white/45 transition",
                    "hover:bg-white/[0.06] hover:text-white/80 active:scale-[0.96]",
                    "opacity-0 group-hover:opacity-100",
                    c.pinned && "opacity-100",
                  )}
                  aria-label={c.pinned ? "Открепить" : "Закрепить"}
                  title={c.pinned ? "Открепить" : "Закрепить"}
                >
                  {c.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>

                {c.unread ? (
                  <div className="grid min-w-6 place-items-center rounded-full bg-[#0ea5e9]/60 px-2 py-1 text-[11px] font-semibold text-white">
                    {c.unread}
                  </div>
                ) : null}
              </div>
            </Link>
          ))}

          {!loadingChats && !chats.length ? (
            <div className="px-5 py-10 text-center text-sm text-white/40">Пока нет чатов</div>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="flex h-full flex-col overflow-hidden">
        {selectedId ? (
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 place-items-center overflow-hidden rounded-full bg-white/5">
                  {other?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "🫧"
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white/90">
                    {other?.displayName ?? "Чат"}
                  </div>
                  {other ? (
                    <Link href={`/profile/${other.username}`} className="text-xs text-white/40 hover:text-white/60">
                      @{other.username}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="text-xs text-white/35">{loadingMessages ? "Загрузка…" : ""}</div>
            </div>
          </div>
        ) : null}

        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hidden">
          {!selectedId ? (
            <div className="grid h-full place-items-center">
              <div className="max-w-md text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                  <div className="text-2xl">💬</div>
                </div>
                <div className="mt-4 text-xl font-semibold text-white/90">Выберите чат</div>
                <div className="mt-2 text-sm text-white/45">
                  Открой диалог слева или нажми «Написать» на профиле.
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link
                    href="/search"
                    className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] active:scale-[0.98]"
                  >
                    Найти людей
                  </Link>
                  <Link
                    href="/profile/dev"
                    className="rounded-full bg-[#0ea5e9]/70 px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0ea5e9]/85 active:scale-[0.98]"
                  >
                    Написать Dev
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {!loadingMessages && selectedId && !messages.length ? (
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="text-base font-semibold text-white/90">Пустой чат</div>
              <div className="mt-2 text-sm text-white/45">
                Начни диалог — отправь сообщение или голосовое.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setText("Привет!")}
                  className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  <span className="mr-2">👋</span>Привет
                </button>
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  <span className="mr-2">🎤</span>Голос
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/40"
                  title="Скоро"
                >
                  <span className="mr-2">📎</span>Файл
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {messages.map((m) => {
              const mine = Boolean(me?.id) && m.senderId === me!.id;
              const isMedia = m.type === "media";
              const reactions = m.reactions ?? {};
              const reactionEntries = Object.entries(reactions).filter(([, c]) => (c ?? 0) > 0);
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("flex max-w-[78%] flex-col", mine ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "relative w-full rounded-3xl",
                        isMedia ? "p-0 bg-transparent" : "px-4 py-3",
                        !isMedia &&
                          (mine
                            ? "bg-[#0ea5e9]/25 text-white/95"
                            : "border border-white/[0.08] bg-white/[0.03] text-white/90"),
                      )}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!selectedId) return;
                        setMenuForMessage(null);
                        setCtxMenu({
                          messageId: m.id,
                          x: e.clientX,
                          y: e.clientY,
                          canDeleteAll: Boolean(me?.id) && m.senderId === me!.id,
                        });
                      }}
                    >
                      {m.type === "voice" ? (
                        <div>
                          {m.voiceUrl ? (
                            <VoiceBubble url={m.voiceUrl} durationMs={m.voiceDurationMs} />
                          ) : (
                            <div className="text-sm text-white/60">(голосовое)</div>
                          )}
                        </div>
                      ) : m.type === "media" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!m.mediaUrl) return;
                            setMediaCommentText("");
                            setMediaModal({
                              messageId: m.id,
                              url: m.mediaUrl,
                              mime: m.mediaMime ?? "application/octet-stream",
                            });
                          }}
                          className="block w-full overflow-hidden rounded-3xl"
                          aria-label="Открыть медиа"
                        >
                          {m.mediaUrl && (m.mediaMime ?? "").startsWith("video/") ? (
                            <video
                              src={m.mediaUrl}
                              playsInline
                              muted
                              className="max-h-[360px] w-full bg-black object-contain"
                            />
                          ) : m.mediaUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.mediaUrl}
                              alt=""
                              className="max-h-[360px] w-full bg-black object-contain"
                            />
                          ) : (
                            <div className="p-4 text-sm text-white/60">(медиа)</div>
                          )}
                        </button>
                      ) : (
                        <div className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
                          {m.text}
                        </div>
                      )}

                      <div className={cn("mt-2 text-[11px] text-white/45", mine && "text-right")}>
                        {formatMsgTime(m.createdAt)}
                      </div>
                    </div>

                    {reactionEntries.length ? (
                      <div className={cn("mt-1 flex flex-wrap gap-1", mine && "justify-end")}>
                        {reactionEntries
                          .sort((a, b) => b[1] - a[1])
                          .map(([emoji, count]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                m.myReaction === emoji
                                  ? void clearReaction(m.id)
                                  : void setReaction(m.id, emoji)
                              }
                              className={cn(
                                "rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-1 text-[11px] text-white/80",
                                "transition hover:bg-white/[0.06]",
                                m.myReaction === emoji && "border-[#0ea5e9]/60 bg-[#0ea5e9]/15",
                              )}
                            >
                              {emoji}
                              <span className="ml-1 text-white/60">{count}</span>
                            </button>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedId ? (
          <div className="border-t border-white/[0.06] px-5 py-4">
            {pendingMedia ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
                  {pendingMedia.kind === "video" ? (
                    <video
                      src={pendingMedia.url}
                      controls
                      playsInline
                      className="max-h-[260px] w-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingMedia.url}
                      alt=""
                      className="max-h-[260px] w-full object-contain"
                    />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(pendingMedia.url);
                      setPendingMedia(null);
                      setAttachOpen(false);
                    }}
                    className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08]"
                  >
                    Удалить
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendMedia()}
                    className="rounded-full bg-[#0ea5e9]/70 px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0ea5e9]/85"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            ) : recState.mode === "preview" ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-xs font-semibold text-white/80">Голосовое</div>
                <div className="mt-2">
                  <audio controls src={recState.url} className="w-full" />
                </div>
                <div className="mt-2 text-xs text-white/35">{formatVoiceDuration(recState.durationMs)}</div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={discardRecording}
                    className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08]"
                  >
                    Удалить
                  </button>
                  <button
                    type="button"
                    onClick={sendVoice}
                    className="rounded-full bg-[#0ea5e9]/70 px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0ea5e9]/85"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachOpen((v) => !v);
                      setEmojiOpen(false);
                    }}
                    className="grid size-11 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/75 transition hover:bg-white/[0.06] active:scale-[0.98]"
                    aria-label="Прикрепить"
                  >
                    <FileIcon size={18} />
                  </button>

                  {attachOpen ? (
                    <div
                      className="absolute bottom-14 left-0 z-20 w-64 overflow-hidden rounded-3xl border border-white/[0.10] bg-black/60 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="block cursor-pointer rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 text-sm text-white/75 transition hover:bg-white/[0.04]">
                        Выбрать фото/видео
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const kind = f.type.startsWith("video/") ? "video" : "image";
                            const url = URL.createObjectURL(f);
                            setPendingMedia({ file: f, url, kind });
                            setAttachOpen(false);
                          }}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEmojiOpen(false);
                    setAttachOpen(false);
                    if (recState.mode === "recording") stopRecording();
                    else void startRecording();
                  }}
                  className={cn(
                    "grid size-11 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/80 transition",
                    "hover:bg-white/[0.06] active:scale-[0.98]",
                  )}
                  aria-label={recState.mode === "recording" ? "Остановить" : "Записать"}
                >
                  <Mic size={18} />
                </button>

                <div className="min-w-0 flex-1">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={other ? `Сообщение ${other.displayName}…` : "Сообщение…"}
                    className={cn(
                      "w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm text-white/90 outline-none",
                      "transition-shadow focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]",
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void sendText();
                      }
                    }}
                  />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmojiOpen((v) => !v);
                      setAttachOpen(false);
                    }}
                    className="grid size-9 place-items-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/[0.08] active:scale-[0.98]"
                    aria-label="Смайлики"
                  >
                    <Smile size={16} />
                  </button>

                  {emojiOpen ? (
                    <div
                      className="absolute bottom-12 right-0 z-20 w-56 overflow-hidden rounded-3xl border border-white/[0.10] bg-black/60 p-2 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-8 gap-1">
                        {[
                          "😀",
                          "😁",
                          "😂",
                          "🥹",
                          "😍",
                          "😘",
                          "😎",
                          "😭",
                          "😡",
                          "🤯",
                          "😴",
                          "🤝",
                          "👍",
                          "🔥",
                          "💙",
                          "✨",
                          "🎉",
                          "🙏",
                          "👀",
                          "💬",
                          "🎧",
                          "🎤",
                          "📎",
                          "🌙",
                        ].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setText((t) => (t ? `${t}${em}` : em));
                              setEmojiOpen(false);
                            }}
                            className="grid size-7 place-items-center rounded-xl text-base transition hover:bg-white/[0.06]"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={!text.trim()}
                  onClick={() => void sendText()}
                  className={cn(
                    "grid size-11 place-items-center rounded-full bg-[#0ea5e9]/70 text-white transition",
                    "hover:bg-[#0ea5e9]/85 active:scale-[0.98]",
                    !text.trim() && "cursor-not-allowed opacity-60 hover:bg-[#0ea5e9]/70 active:scale-100",
                  )}
                  aria-label="Отправить"
                >
                  <Send size={18} />
                </button>
              </div>
            )}

            <style jsx global>{`
              @keyframes dmBars {
                0% {
                  transform: scaleY(0.4);
                  opacity: 0.55;
                }
                100% {
                  transform: scaleY(1.2);
                  opacity: 1;
                }
              }

              .scrollbar-hidden {
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
              .scrollbar-hidden::-webkit-scrollbar {
                width: 0;
                height: 0;
              }
            `}</style>
          </div>
        ) : null}
      </GlassCard>

      {mediaModal ? (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              setMediaModal(null);
              setMediaLikes(null);
              setMediaComments([]);
            }}
          />
          <div className="absolute inset-0 grid place-items-center px-6 py-8">
            <div className="w-full max-w-[980px] overflow-hidden rounded-3xl border border-white/[0.10] bg-black/60 shadow-[0_18px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <div className="grid max-h-[80vh] grid-cols-1 gap-0 lg:grid-cols-[1fr_340px]">
                <div className="relative bg-black">
                  <button
                    type="button"
                    onClick={() => {
                      setMediaModal(null);
                      setMediaLikes(null);
                      setMediaComments([]);
                    }}
                    className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-black/40 text-white/80 transition hover:bg-black/55 active:scale-[0.98]"
                    aria-label="Закрыть"
                  >
                    <X size={18} />
                  </button>

                  {mediaModal.mime.startsWith("video/") ? (
                    <video src={mediaModal.url} controls playsInline className="max-h-[80vh] w-full object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaModal.url} alt="" className="max-h-[80vh] w-full object-contain" />
                  )}
                </div>

                <div className="flex flex-col border-t border-white/[0.08] lg:border-l lg:border-t-0">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="text-sm font-semibold text-white/90">Реакции</div>
                    <button
                      type="button"
                      onClick={async () => {
                        const liked = Boolean(mediaLikes?.likedByMe);
                        setMediaLikes((prev) =>
                          prev
                            ? { likes: Math.max(0, prev.likes + (liked ? -1 : 1)), likedByMe: !liked }
                            : { likes: liked ? 0 : 1, likedByMe: !liked },
                        );

                        await fetch(`/api/messages/media/${encodeURIComponent(mediaModal.messageId)}/likes`, {
                          method: liked ? "DELETE" : "POST",
                        });
                      }}
                      className={cn(
                        "rounded-full px-4 py-2 text-xs font-semibold transition",
                        mediaLikes?.likedByMe
                          ? "bg-[#ff4d6d]/70 text-white hover:bg-[#ff4d6d]/85"
                          : "bg-white/5 text-white/80 hover:bg-white/[0.08]",
                      )}
                    >
                      ❤ {mediaLikes?.likes ?? 0}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="space-y-3">
                      {mediaComments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                        >
                          <div className="text-xs font-semibold text-white/80">{c.user.displayName}</div>
                          <div className="mt-1 whitespace-pre-wrap break-words text-sm text-white/85 [overflow-wrap:anywhere]">
                            {c.text}
                          </div>
                        </div>
                      ))}
                      {!mediaComments.length ? <div className="text-sm text-white/40">Комментариев нет</div> : null}
                    </div>
                  </div>

                  <div className="border-t border-white/[0.08] px-5 py-4">
                    <div className="flex items-center gap-2">
                      <input
                        value={mediaCommentText}
                        onChange={(e) => setMediaCommentText(e.target.value)}
                        placeholder="Комментарий…"
                        className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm text-white/90 outline-none"
                      />
                      <button
                        type="button"
                        disabled={!mediaCommentText.trim()}
                        onClick={async () => {
                          const t = mediaCommentText.trim();
                          if (!t) return;
                          setMediaCommentText("");

                          const res = await fetch(
                            `/api/messages/media/${encodeURIComponent(mediaModal.messageId)}/comments`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ text: t }),
                            },
                          );
                          if (res.ok) {
                            const commentsRes = await fetch(
                              `/api/messages/media/${encodeURIComponent(mediaModal.messageId)}/comments`,
                            );
                            const commentsData = (await commentsRes.json()) as { comments?: any[] };
                            setMediaComments((commentsData.comments ?? []) as any);
                          }
                        }}
                        className={cn(
                          "grid size-11 place-items-center rounded-full bg-[#0ea5e9]/70 text-white transition",
                          "hover:bg-[#0ea5e9]/85 active:scale-[0.98]",
                          !mediaCommentText.trim() &&
                            "cursor-not-allowed opacity-60 hover:bg-[#0ea5e9]/70 active:scale-100",
                        )}
                        aria-label="Отправить"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {ctxMenu ? (
        <div
          className="fixed z-[120]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-44 overflow-hidden rounded-2xl border border-white/[0.10] bg-black/70 p-1 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="flex flex-wrap gap-1 px-1 py-1">
              {["👍", "❤️", "😂", "😮", "😢", "👎"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => void setReaction(ctxMenu.messageId, emoji)}
                  className="grid size-8 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-sm text-white/90 transition hover:bg-white/[0.06]"
                  aria-label={`Реакция ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void clearReaction(ctxMenu.messageId)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-white/70 transition hover:bg-white/[0.06]"
            >
              <Smile size={14} />
              Убрать реакцию
            </button>

            <button
              type="button"
              onClick={() => void deleteMessage(ctxMenu.messageId, "me")}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/[0.06]"
            >
              <Trash2 size={14} />
              Удалить у себя
            </button>
            {ctxMenu.canDeleteAll ? (
              <button
                type="button"
                onClick={() => void deleteMessage(ctxMenu.messageId, "all")}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/[0.06]"
              >
                <Trash2 size={14} />
                Удалить у всех
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="hidden">{menuForMessage}</div>
    </div>
  );
}
