import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;
  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") ?? "me").toLowerCase();

  const supabase = createSupabaseAdminClient();

  const { data: msg, error: loadErr } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,deleted_for,deleted_at")
    .eq("id", messageId)
    .maybeSingle();

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }

  if (!msg?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ensure user is participant
  const { data: cp } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", String((msg as any).conversation_id))
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!cp) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (scope === "all") {
    if (String((msg as any).sender_id) !== session.userId) {
      return NextResponse.json({ error: "Only sender can delete for all" }, { status: 403 });
    }

    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString(), deleted_by: session.userId })
      .eq("id", messageId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // scope=me
  const existing = (((msg as any).deleted_for as string[] | null) ?? []).map(String);
  if (!existing.includes(session.userId)) existing.push(session.userId);

  const { error } = await supabase
    .from("messages")
    .update({ deleted_for: existing })
    .eq("id", messageId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
