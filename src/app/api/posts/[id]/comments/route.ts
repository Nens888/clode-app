import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";

type CommentRow = {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  author:
    | {
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      }
    | {
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

function normalize<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("post_comments")
    .select(
      "id,text,created_at,user_id,author:users!post_comments_user_id_fkey(username,display_name,avatar_url)",
    )
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  const comments = ((data ?? []) as unknown as CommentRow[]).map((c) => {
    const author = normalize(c.author);
    return {
      id: c.id,
      text: c.text,
      createdAt: c.created_at,
      userId: c.user_id,
      author: {
        username: author?.username ?? "unknown",
        displayName: author?.display_name ?? `@${author?.username ?? ""}`,
        avatarUrl: author?.avatar_url ?? null,
      },
    };
  });

  return NextResponse.json({ comments });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = (await req.json()) as { text?: string };
    const text = (body.text ?? "").trim();

    if (!text) {
      return NextResponse.json({ error: "Комментарий пустой" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: post } = await supabase
      .from("posts")
      .select("id,author_id")
      .eq("id", id)
      .maybeSingle();

    if (!post?.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: comment, error } = await supabase
      .from("post_comments")
      .insert({ post_id: id, user_id: session.userId, text })
      .select("id,text,created_at,user_id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (post.author_id !== session.userId) {
      await supabase.from("notifications").insert({
        user_id: post.author_id,
        actor_id: session.userId,
        type: "comment",
        post_id: id,
        comment_id: comment.id,
      });
    }

    return NextResponse.json({ ok: true, comment });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
