import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;
  const normalized = username.startsWith("@") ? username.slice(1) : username;

  const supabase = createSupabaseAdminClient();

  const { data: target } = await supabase
    .from("users")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  if (!target?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.id === session.userId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { error } = await supabase
    .from("follows")
    .upsert({ follower_id: session.userId, following_id: target.id }, { onConflict: "follower_id,following_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("notifications").insert({
    user_id: target.id,
    actor_id: session.userId,
    type: "follow",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;
  const normalized = username.startsWith("@") ? username.slice(1) : username;

  const supabase = createSupabaseAdminClient();

  const { data: target } = await supabase
    .from("users")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  if (!target?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", session.userId)
    .eq("following_id", target.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
