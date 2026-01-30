import { GlassCard } from "@/components/GlassCard";
import { CreatePost } from "@/components/CreatePost";
import { PostCard } from "@/components/PostCard";
import { ProfileEditPanel } from "@/components/ProfileEditPanel";
import { ProfileMediaSection } from "@/components/ProfileMediaSection";
import { Tabs } from "@/components/Tabs";
import { FollowButton } from "@/components/FollowButton";
import { MessageButton } from "@/components/MessageButton";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";
import type { Post } from "@/store/feedStore";
import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const normalized = username.startsWith("@") ? username.slice(1) : username;
  const session = await getServerSession();
  const supabase = createSupabaseAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("id,email,username,display_name,created_at,avatar_url,banner_url,verif,private")
    .eq("username", normalized)
    .maybeSingle();

  if (!user?.id) {
    return (
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-10 text-center text-sm text-white/40">
          Пользователь не найден
        </div>
      </GlassCard>
    );
  }

  const isMe = session?.userId === user.id;
  const isPrivate = Boolean(user.private);
  const created = new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "long",
  }).format(new Date(user.created_at));

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id);

  let amIFollowing = false;
  if (!isMe && session?.userId) {
    const { data: row } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", session.userId)
      .eq("following_id", user.id)
      .maybeSingle();
    amIFollowing = Boolean(row);
  }

  const canViewPosts = isMe || !isPrivate || amIFollowing;

  const postsData = canViewPosts
    ? (
        await supabase
          .from("posts")
          .select(
            "id,text,media_url,media_type,created_at,post_likes(count),post_comments(count),post_views(count)",
          )
          .eq("author_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ).data
    : null;

  const postIds = ((postsData ?? []) as any[]).map((p) => String(p.id));
  let likedSet = new Set<string>();
  if (session?.userId && postIds.length) {
    const { data: likedRows } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", session.userId)
      .in("post_id", postIds);
    likedSet = new Set((likedRows ?? []).map((r: any) => String(r.post_id)));
  }

  const posts: Post[] = ((postsData ?? []) as any[]).map((p) => ({
    id: String(p.id),
    authorName: user.display_name ?? `@${user.username}`,
    username: user.username,
    avatarUrl: user.avatar_url ?? null,
    verif: Boolean(user.verif),
    createdAt: String(p.created_at),
    text: String(p.text ?? ""),
    mediaUrl: p.media_url ?? null,
    mediaType: p.media_type ?? null,
    likes: p.post_likes?.[0]?.count ?? 0,
    comments: p.post_comments?.[0]?.count ?? 0,
    reposts: 0,
    views: p.post_views?.[0]?.count ?? 0,
    canDelete: isMe,
    likedByMe: likedSet.has(String(p.id)),
  }));

  return (
    <GlassCard className="overflow-hidden">
      <ProfileMediaSection
        isMe={isMe}
        avatarUrl={user.avatar_url}
        bannerUrl={user.banner_url}
        username={username}
      />

      <div className="px-5 pb-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white/90">
            <span className="inline-flex items-center gap-2">
              {user.display_name ?? `@${user.username}`}
              {user.verif ? (
                <BadgeCheck size={16} className="text-[#38bdf8]" />
              ) : null}
            </span>
          </h2>
          <div className="text-sm text-white/45">@{user.username}</div>
          <div className="mt-2 text-sm text-white/55">
            Присоединился {created}
          </div>
          <div className="flex gap-4">
            <div>{followingCount ?? 0} Подписки</div>
            <div>{followersCount ?? 0} Подписчики</div>
          </div>
        </div>
        {isMe ? (
          <div className="mb-4 flex items-center gap-2">
            <ProfileEditPanel
              initialDisplayName={user.display_name ?? ""}
              initialUsername={user.username}
              initialPrivate={Boolean(user.private)}
            />
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/[0.08] active:scale-[0.98]"
              aria-label="Действие"
            >
              ✦
            </button>
          </div>
        ) : null}
        {!isMe ? (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <FollowButton username={user.username} initialFollowing={amIFollowing} />
              {!Boolean(user.private) || amIFollowing ? (
                <MessageButton username={user.username} />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <Tabs
        items={[
          { label: "Посты", href: `/profile/${username}` },
          { label: "Понравившиеся", href: `/profile/${username}/likes` },
        ]}
      />

      {isMe ? (
        <div className="border-b border-white/[0.06]">
          <CreatePost />
        </div>
      ) : null}

      <div>
        {canViewPosts ? (
          posts.length ? (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          ) : (
            <div className="px-5 py-10 text-center text-sm text-white/40">
              {isMe ? "У вас пока нет постов" : "Пока нет постов"}
            </div>
          )
        ) : (
          <div className="px-5 py-10 text-center text-sm text-white/40">
            Этот профиль закрыт. Подпишитесь, чтобы увидеть посты.
          </div>
        )}
      </div>
    </GlassCard>
  );
}
