import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

async function ensureParticipant(supabase: ReturnType<typeof createSupabaseAdminClient>, messageId: string, userId: string) {
  const { data: msg } = await supabase
    .from("messages")
    .select("conversation_id")
    .eq("id", messageId)
    .maybeSingle();

  if (!msg?.conversation_id) return false;

  const { data: cp } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", String((msg as any).conversation_id))
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(cp);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;
  const supabase = createSupabaseAdminClient();

  const ok = await ensureParticipant(supabase, messageId, session.userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { count } = await supabase
    .from("message_likes")
    .select("*", { count: "exact", head: true })
    .eq("message_id", messageId);

  const { data: mine } = await supabase
    .from("message_likes")
    .select("user_id")
    .eq("message_id", messageId)
    .eq("user_id", session.userId)
    .maybeSingle();

  return NextResponse.json({ likes: count ?? 0, likedByMe: Boolean(mine) }, { status: 200 });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;
  const supabase = createSupabaseAdminClient();

  const ok = await ensureParticipant(supabase, messageId, session.userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("message_likes")
    .upsert({ message_id: messageId, user_id: session.userId }, { onConflict: "message_id,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;
  const supabase = createSupabaseAdminClient();

  const ok = await ensureParticipant(supabase, messageId, session.userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("message_likes")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", session.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
