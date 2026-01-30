import { create } from "zustand";

export type Post = {
  id: string;
  authorName: string;
  username: string;
  avatarUrl: string | null;
  verif?: boolean;
  createdAt: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  likes: number;
  comments: number;
  reposts: number;
  views: number;
  canDelete?: boolean;
  likedByMe?: boolean;
};

type FeedState = {
  draft: string;
  posts: Post[];
  setDraft: (value: string) => void;
  setPosts: (posts: Post[]) => void;
  loadFeed: (opts?: { onlyFollowing?: boolean }) => Promise<void>;
  publish: (file?: File | null) => Promise<void>;
};

export const useFeedStore = create<FeedState>((set, get) => ({
  draft: "",
  posts: [],
  setDraft: (value) => set({ draft: value }),
  setPosts: (posts) => set({ posts }),
  loadFeed: async (opts) => {
    const onlyFollowing = Boolean(opts?.onlyFollowing);
    const url = onlyFollowing ? "/api/feed?onlyFollowing=1" : "/api/feed";
    const res = await fetch(url);
    const data = (await res.json()) as { posts?: Post[] };
    set({ posts: data.posts ?? [] });
  },
  publish: async (file) => {
    const text = get().draft.trim();
    const hasFile = Boolean(file);
    if (!text && !hasFile) return;

    set({ draft: "" });

    const form = new FormData();
    form.append("text", text);
    if (file) form.append("file", file);

    await fetch("/api/posts", {
      method: "POST",
      body: form,
    });

    await get().loadFeed();
  },
}));
