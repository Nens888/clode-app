import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
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

  if (post.author_id !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
