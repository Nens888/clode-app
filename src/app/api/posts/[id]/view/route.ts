import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { getServerSession } from "@/lib/auth/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Views can be tracked anonymously, but we currently dedupe per-user when logged in.
  if (!session) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("post_views")
    .upsert({ post_id: id, user_id: session.userId }, { onConflict: "post_id,user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
