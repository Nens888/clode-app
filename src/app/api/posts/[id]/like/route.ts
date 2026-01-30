import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: post } = await supabase
    .from("posts")
    .select("id,author_id")
    .eq("id", id)
    .maybeSingle();

  if (!post?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error: likeError } = await supabase
    .from("post_likes")
    .upsert({ post_id: id, user_id: session.userId }, { onConflict: "post_id,user_id" });

  if (likeError) {
    return NextResponse.json({ error: likeError.message }, { status: 500 });
  }

  if (post.author_id !== session.userId) {
    await supabase.from("notifications").insert({
      user_id: post.author_id,
      actor_id: session.userId,
      type: "like",
      post_id: id,
      comment_id: null,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", id)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
