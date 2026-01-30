"use client";

import { CreatePost } from "@/components/CreatePost";
import { GlassCard } from "@/components/GlassCard";
import { PostCard } from "@/components/PostCard";
import { Tabs } from "@/components/Tabs";
import { useFeedStore } from "@/store/feedStore";
import { useEffect } from "react";

export default function Home() {
  const posts = useFeedStore((s) => s.posts);
  const loadFeed = useFeedStore((s) => s.loadFeed);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  return (
    <div className="space-y-4">
      <GlassCard>
        <CreatePost />
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <Tabs
          items={[
            { label: "Популярное", href: "/" },
            { label: "Подписки", href: "/following" },
          ]}
        />

        <div>
          {posts.length ? (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          ) : (
            <div className="px-5 py-10 text-center text-sm text-white/40">
              Пока пусто
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
