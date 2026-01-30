import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";

type NotificationRow = {
  id: string;
  type: "like" | "comment" | "follow";
  created_at: string;
  read_at: string | null;
  post_id: string | null;
  comment_id: string | null;
  actor: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    verif?: boolean | null;
  } | {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    verif?: boolean | null;
  }[] | null;
  post: { id: string; text: string } | { id: string; text: string }[] | null;
};

function normalize<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ notifications: [], unread: 0 }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();

  const select =
    "id,type,created_at,read_at,post_id,comment_id,actor:users!notifications_actor_id_fkey(username,display_name,avatar_url,verif),post:posts(id,text)";

  const { data } = await supabase
    .from("notifications")
    .select(select)
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = ((data ?? []) as unknown as NotificationRow[]).map((n) => {
    const actor = normalize(n.actor);
    const post = normalize(n.post);

    const title =
      n.type === "like"
        ? "лайкнул(а) ваш пост"
        : n.type === "comment"
          ? "оставил(а) комментарий"
          : "подписался(ась) на вас";

    return {
      id: n.id,
      type: n.type,
      createdAt: n.created_at,
      readAt: n.read_at,
      actor: {
        username: actor?.username ?? "unknown",
        displayName: actor?.display_name ?? `@${actor?.username ?? ""}`,
        avatarUrl: actor?.avatar_url ?? null,
        verif: Boolean(actor?.verif),
      },
      post: post ? { id: post.id, text: post.text } : null,
    };
  });

  const unread = notifications.reduce((acc, n) => acc + (n.readAt ? 0 : 1), 0);
  return NextResponse.json({ notifications, unread }, { status: 200 });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { ids?: string[]; all?: boolean };
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const all = Boolean(body.all);

    if (!all && !ids.length) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const supabase = createSupabaseAdminClient();

    const q = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", session.userId);

    const { error } = all ? await q.is("read_at", null) : await q.in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
