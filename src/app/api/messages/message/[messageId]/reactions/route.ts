import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

async function ensureParticipant(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  messageId: string,
  userId: string,
) {
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

  const { data: all, error } = await supabase
    .from("message_reactions")
    .select("user_id,emoji")
    .eq("message_id", messageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  let myReaction: string | null = null;

  for (const r of all ?? []) {
    const emoji = String((r as any).emoji);
    counts[emoji] = (counts[emoji] ?? 0) + 1;
    if (String((r as any).user_id) === session.userId) myReaction = emoji;
  }

  return NextResponse.json({ reactions: counts, myReaction }, { status: 200 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;
  const { emoji } = (await req.json()) as { emoji?: string };
  const e = String(emoji ?? "").trim();

  if (!e) return NextResponse.json({ error: "Missing emoji" }, { status: 400 });
  if (e.length > 16) return NextResponse.json({ error: "Emoji too long" }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  const ok = await ensureParticipant(supabase, messageId, session.userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("message_reactions")
    .upsert(
      { message_id: messageId, user_id: session.userId, emoji: e },
      { onConflict: "message_id,user_id" },
    );

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
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", session.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
