import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

function mustAuth(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function canMessageUser(supabase: ReturnType<typeof createSupabaseAdminClient>, meId: string, otherId: string) {
  if (meId === otherId) return true;

  const { data: other } = await supabase
    .from("users")
    .select("private")
    .eq("id", otherId)
    .maybeSingle();

  const isPrivate = Boolean((other as any)?.private);
  if (!isPrivate) return true;

  const { data: row } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", meId)
    .eq("following_id", otherId)
    .maybeSingle();

  return Boolean(row);
}

export async function GET() {
  const session = await getServerSession();
  const authErr = mustAuth(session);
  if (authErr) return authErr;

  const supabase = createSupabaseAdminClient();

  const { data: cps, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id,pinned,last_read_at")
    .eq("user_id", session!.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const convIds = (cps ?? []).map((r: any) => r.conversation_id);
  if (!convIds.length) {
    return NextResponse.json({ chats: [] }, { status: 200 });
  }

  const { data: others, error: othersErr } = await supabase
    .from("conversation_participants")
    .select("conversation_id,user_id")
    .in("conversation_id", convIds)
    .neq("user_id", session!.userId);

  if (othersErr) {
    return NextResponse.json({ error: othersErr.message }, { status: 500 });
  }

  const otherIdByConv = new Map<string, string>();
  for (const r of others ?? []) {
    otherIdByConv.set(String((r as any).conversation_id), String((r as any).user_id));
  }

  const otherIds = Array.from(new Set(Array.from(otherIdByConv.values())));

  const { data: otherUsers, error: usersErr } = await supabase
    .from("users")
    .select("id,username,display_name,avatar_url,verif")
    .in("id", otherIds);

  if (usersErr) {
    return NextResponse.json({ error: usersErr.message }, { status: 500 });
  }

  const otherUserById = new Map<string, any>();
  for (const u of otherUsers ?? []) {
    otherUserById.set(String((u as any).id), u);
  }

  const { data: lastMessages } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,type,text,voice_url,media_url,media_mime,created_at,deleted_at,deleted_for")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  const lastByConv = new Map<string, any>();
  for (const m of lastMessages ?? []) {
    const convId = String((m as any).conversation_id);
    if (lastByConv.has(convId)) continue;
    if ((m as any).deleted_at) continue;
    const deletedFor = ((m as any).deleted_for as string[] | null) ?? [];
    if (deletedFor.includes(session!.userId)) continue;
    lastByConv.set(convId, m);
  }

  const chats = await Promise.all(
    (cps ?? []).map(async (cp: any) => {
      const convId = String(cp.conversation_id);
      const otherId = otherIdByConv.get(convId);
      const otherUser = otherId ? otherUserById.get(otherId) : null;

      const last = lastByConv.get(convId) ?? null;
      const lastReadAt = cp.last_read_at ? new Date(String(cp.last_read_at)) : null;

      // unread count
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", convId)
        .neq("sender_id", session!.userId)
        .is("deleted_at", null)
        .not("deleted_for", "cs", `{${session!.userId}}`)
        .gt("created_at", lastReadAt ? lastReadAt.toISOString() : "1970-01-01T00:00:00.000Z");

      return {
        id: convId,
        pinned: Boolean(cp.pinned),
        unread: unreadCount ?? 0,
        other: otherUser
          ? {
              username: String(otherUser.username),
              displayName:
                (otherUser.display_name as string | null) ?? `@${otherUser.username}`,
              avatarUrl: (otherUser.avatar_url as string | null) ?? null,
              verif: Boolean(otherUser.verif),
            }
          : null,
        lastMessage: last
          ? {
              id: String(last.id),
              type: String(last.type),
              text: (last.text as string | null) ?? null,
              voiceUrl: (last.voice_url as string | null) ?? null,
              mediaUrl: (last.media_url as string | null) ?? null,
              mediaMime: (last.media_mime as string | null) ?? null,
              createdAt: String(last.created_at),
              senderId: String(last.sender_id),
            }
          : null,
      };
    }),
  );

  chats.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at;
  });

  return NextResponse.json({ chats }, { status: 200 });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  const authErr = mustAuth(session);
  if (authErr) return authErr;

  const { username } = (await req.json()) as { username?: string };
  const targetUsername = String(username ?? "").trim().replace(/^@/, "");
  if (!targetUsername) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: otherUser } = await supabase
    .from("users")
    .select("id,username,private")
    .eq("username", targetUsername)
    .maybeSingle();

  if (!otherUser?.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const allowed = await canMessageUser(supabase, session!.userId, String(otherUser.id));
  if (!allowed) {
    return NextResponse.json({ error: "User profile is private" }, { status: 403 });
  }

  // find existing conversation
  const { data: myCps } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", session!.userId);

  const myConvIds = (myCps ?? []).map((r: any) => r.conversation_id);

  let conversationId: string | null = null;
  if (myConvIds.length) {
    const { data: otherCps } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", String(otherUser.id))
      .in("conversation_id", myConvIds);

    conversationId = otherCps?.[0]?.conversation_id ? String(otherCps[0].conversation_id) : null;
  }

  if (!conversationId) {
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (convErr) {
      return NextResponse.json({ error: convErr.message }, { status: 500 });
    }

    conversationId = String(conv.id);

    const { error: cpErr } = await supabase.from("conversation_participants").insert([
      { conversation_id: conversationId, user_id: session!.userId },
      { conversation_id: conversationId, user_id: String(otherUser.id) },
    ]);

    if (cpErr) {
      return NextResponse.json({ error: cpErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ conversationId }, { status: 200 });
}
