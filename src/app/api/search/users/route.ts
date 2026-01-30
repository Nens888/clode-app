import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  const session = await getServerSession();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ users: [] }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();
  const like = `%${q}%`;

  const { data, error } = await supabase
    .from("users")
    .select(
      "id,username,display_name,avatar_url,verif,followers:follows!follows_following_id_fkey(count)",
    )
    .or(`username.ilike.${like},display_name.ilike.${like}`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as any[];
  const ids = rows.map((u) => String(u.id)).filter(Boolean);

  let followingSet = new Set<string>();
  if (session?.userId && ids.length) {
    const { data: followingRows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", session.userId)
      .in("following_id", ids);
    followingSet = new Set((followingRows ?? []).map((r: any) => String(r.following_id)));
  }

  const users = rows.map((u: any) => ({
    username: String(u.username),
    displayName: (u.display_name as string | null) ?? `@${u.username}`,
    avatarUrl: (u.avatar_url as string | null) ?? null,
    verif: Boolean(u.verif),
    followersCount: u.followers?.[0]?.count ?? 0,
    amIFollowing: followingSet.has(String(u.id)),
  }));

  return NextResponse.json({ users }, { status: 200 });
}
