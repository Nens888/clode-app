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

  const { data, error } = await supabase
    .from("message_comments")
    .select("id,text,created_at,user_id")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = Array.from(new Set((data ?? []).map((c: any) => String(c.user_id))));
  const { data: users } = await supabase
    .from("users")
    .select("id,username,display_name,avatar_url,verif")
    .in("id", userIds);

  const byId = new Map<string, any>();
  for (const u of users ?? []) byId.set(String((u as any).id), u);

  const comments = (data ?? []).map((c: any) => {
    const u = byId.get(String(c.user_id));
    return {
      id: String(c.id),
      text: String(c.text),
      createdAt: String(c.created_at),
      user: u
        ? {
            username: String(u.username),
            displayName: (u.display_name as string | null) ?? `@${u.username}`,
            avatarUrl: (u.avatar_url as string | null) ?? null,
            verif: Boolean(u.verif),
          }
        : { username: "unknown", displayName: "Unknown", avatarUrl: null, verif: false },
    };
  });

  return NextResponse.json({ comments }, { status: 200 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;
  const { text } = (await req.json()) as { text?: string };
  const t = String(text ?? "").trim();
  if (!t) return NextResponse.json({ error: "Empty" }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  const ok = await ensureParticipant(supabase, messageId, session.userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("message_comments")
    .insert({ message_id: messageId, user_id: session.userId, text: t })
    .select("id,text,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { comment: { id: String(data.id), text: String(data.text), createdAt: String(data.created_at) } },
    { status: 200 },
  );
}
