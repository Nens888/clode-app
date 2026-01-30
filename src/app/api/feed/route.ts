import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";

type FeedRow = {
  id: string;
  author_id: string;
  text: string;
  created_at: string;
  media_url?: string | null;
  media_type?: "image" | "video" | null;
  author:
    | {
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        verif?: boolean | null;
      }
    | {
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        verif?: boolean | null;
      }[]
    | null;
  post_likes?: { count: number }[];
  post_comments?: { count: number }[];
  post_views?: { count: number }[];
};

function normalizeAuthor(row: FeedRow) {
  if (!row.author) return null;
  return Array.isArray(row.author) ? row.author[0] ?? null : row.author;
}

function mapRow(row: FeedRow) {
  const author = normalizeAuthor(row);
  return {
    id: row.id,
    authorName: author?.display_name ?? `@${author?.username ?? ""}`,
    username: author?.username ?? "unknown",
    avatarUrl: author?.avatar_url ?? null,
    verif: Boolean(author?.verif),
    createdAt: row.created_at,
    text: row.text,
    mediaUrl: row.media_url ?? null,
    mediaType: row.media_type ?? null,
    likes: row.post_likes?.[0]?.count ?? 0,
    comments: row.post_comments?.[0]?.count ?? 0,
    reposts: 0,
    views: row.post_views?.[0]?.count ?? 0,
    canDelete: false,
    likedByMe: false,
  };
}

export async function GET(req: Request) {
  const session = await getServerSession();
  const supabase = createSupabaseAdminClient();

  const url = new URL(req.url);
  const onlyFollowing = url.searchParams.get("onlyFollowing") === "1";
  const limit = 50;

  let followingIds: string[] = [];
  if (session) {
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", session.userId);

    followingIds = (following ?? []).map((r: any) => r.following_id as string);
  }

  const select =
    "id,author_id,text,media_url,media_type,created_at,author:users!posts_author_id_fkey(username,display_name,avatar_url,verif),post_likes(count),post_comments(count),post_views(count)";

  let followingPosts: FeedRow[] = [];
  if (followingIds.length) {
    const { data } = await supabase
      .from("posts")
      .select(select)
      .in("author_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    followingPosts = (data ?? []) as unknown as FeedRow[];
  }

  let mergedRows: FeedRow[] = followingPosts;

  if (!onlyFollowing) {
    const remaining = Math.max(0, limit - followingPosts.length);

    const { data: freshData } = await supabase
      .from("posts")
      .select(select)
      .order("created_at", { ascending: false })
      .limit(remaining ? remaining : limit);

    const freshPosts = ((freshData ?? []) as unknown as FeedRow[]).filter((p) => {
      if (!followingIds.length) return true;
      return !followingIds.includes(p.author_id);
    });

    mergedRows = [...followingPosts, ...freshPosts].slice(0, limit);
  }

  const baseItems = mergedRows.map((row) => {
    const item = mapRow(row);
    return {
      ...item,
      canDelete: Boolean(session?.userId && row.author_id === session.userId),
    };
  });

  if (!session?.userId || !baseItems.length) {
    return NextResponse.json({ posts: baseItems });
  }

  const ids = baseItems.map((p) => p.id);
  const { data: likedRows } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", session.userId)
    .in("post_id", ids);

  const likedSet = new Set((likedRows ?? []).map((r: any) => String(r.post_id)));
  const merged = baseItems.map((p) => ({ ...p, likedByMe: likedSet.has(p.id) }));

  return NextResponse.json({ posts: merged });
}
