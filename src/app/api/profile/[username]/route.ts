import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("username,display_name,avatar_url,banner_url,verif,private,followers:follows!follows_following_id_fkey(count)")
    .eq("username", username)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    username: data.username,
    displayName: (data.display_name as string | null) ?? `@${data.username}`,
    avatarUrl: (data.avatar_url as string | null) ?? null,
    bannerUrl: (data.banner_url as string | null) ?? null,
    verif: Boolean(data.verif),
    private: Boolean(data.private),
    followersCount: (data as any).followers?.[0]?.count ?? 0,
  });
}
