import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

function mustAuth(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function ensureParticipant(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  conversationId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function canMessageUser(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  meId: string,
  otherId: string,
) {
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await getServerSession();
  const authErr = mustAuth(session);
  if (authErr) return authErr;

  const { conversationId } = await params;

  const supabase = createSupabaseAdminClient();
  const ok = await ensureParticipant(supabase, conversationId, session!.userId);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

  const { data: messages, error } = await supabase
    .from("messages")
    .select(
      "id,conversation_id,sender_id,type,text,voice_url,voice_duration_ms,media_url,media_mime,created_at,deleted_at,deleted_for",
    )
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .not("deleted_for", "cs", `{${session!.userId}}`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messageIds = (messages ?? []).map((m: any) => String(m.id));

  const { data: reactions } = messageIds.length
    ? await supabase
        .from("message_reactions")
        .select("message_id,user_id,emoji")
        .in("message_id", messageIds)
    : { data: [] as any[] };

  const reactionsByMessageId = new Map<
    string,
    { counts: Record<string, number>; myEmoji: string | null }
  >();

  for (const r of reactions ?? []) {
    const mid = String((r as any).message_id);
    const uid = String((r as any).user_id);
    const emoji = String((r as any).emoji);
    const entry = reactionsByMessageId.get(mid) ?? { counts: {}, myEmoji: null };
    entry.counts[emoji] = (entry.counts[emoji] ?? 0) + 1;
    if (uid === session!.userId) entry.myEmoji = emoji;
    reactionsByMessageId.set(mid, entry);
  }

  // load other participant
  const { data: otherCp } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", session!.userId)
    .maybeSingle();

  const otherId = otherCp?.user_id ? String(otherCp.user_id) : null;
  const other = otherId
    ? (
        await supabase
          .from("users")
          .select("username,display_name,avatar_url,verif")
          .eq("id", otherId)
          .maybeSingle()
      ).data
    : null;

  return NextResponse.json(
    {
      conversationId,
      other: other
        ? {
            username: String((other as any).username),
            displayName:
              ((other as any).display_name as string | null) ??
              `@${(other as any).username}`,
            avatarUrl: ((other as any).avatar_url as string | null) ?? null,
            verif: Boolean((other as any).verif),
          }
        : null,
      messages: (messages ?? []).map((m: any) => ({
        id: String(m.id),
        senderId: String(m.sender_id),
        type: String(m.type),
        text: (m.text as string | null) ?? null,
        voiceUrl: (m.voice_url as string | null) ?? null,
        voiceDurationMs: (m.voice_duration_ms as number | null) ?? null,
        mediaUrl: (m.media_url as string | null) ?? null,
        mediaMime: (m.media_mime as string | null) ?? null,
        createdAt: String(m.created_at),
        reactions: reactionsByMessageId.get(String(m.id))?.counts ?? {},
        myReaction: reactionsByMessageId.get(String(m.id))?.myEmoji ?? null,
      })),
    },
    { status: 200 },
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await getServerSession();
  const authErr = mustAuth(session);
  if (authErr) return authErr;

  const { conversationId } = await params;
  const supabase = createSupabaseAdminClient();

  const ok = await ensureParticipant(supabase, conversationId, session!.userId);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // check private-profile rule for other user
  const { data: otherCp } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", session!.userId)
    .maybeSingle();
  const otherId = otherCp?.user_id ? String(otherCp.user_id) : null;
  if (otherId) {
    const allowed = await canMessageUser(supabase, session!.userId, otherId);
    if (!allowed) {
      return NextResponse.json({ error: "User profile is private" }, { status: 403 });
    }
  }

  const contentType = req.headers.get("content-type") ?? "";

  // text/json
  if (contentType.includes("application/json")) {
    const { text } = (await req.json()) as { text?: string };
    const t = String(text ?? "").trim();
    if (!t) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: session!.userId,
        type: "text",
        text: t,
      })
      .select("id,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: {
          id: String(msg.id),
          senderId: session!.userId,
          type: "text",
          text: t,
          createdAt: String(msg.created_at),
        },
      },
      { status: 200 },
    );
  }

  // multipart (voice)
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const kind = String(form.get("kind") ?? "voice");
    const file = form.get("file") as File | null;
    const durationMs = Number(form.get("durationMs") ?? 0);

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";

    // media attachment
    if (kind === "media") {
      const isImage = mime.startsWith("image/");
      const isVideo = mime.startsWith("video/");
      if (!isImage && !isVideo) {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
      }

      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File too large (max ${isVideo ? "50" : "10"}MB)` },
          { status: 400 },
        );
      }

      const supabaseStorage = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const ext = (file.name.split(".").pop() ?? "").toLowerCase() || (isVideo ? "mp4" : "jpg");
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const filePath = `${session!.userId}/${fileName}`;

      const { error: uploadError } = await supabaseStorage.storage
        .from("dm_media")
        .upload(filePath, file, { upsert: false, contentType: mime });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: publicUrlData } = supabaseStorage.storage
        .from("dm_media")
        .getPublicUrl(filePath);
      const mediaUrl = publicUrlData.publicUrl;

      const { data: msg, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: session!.userId,
          type: "media",
          media_url: mediaUrl,
          media_mime: mime,
        })
        .select("id,created_at,media_url,media_mime")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          message: {
            id: String(msg.id),
            senderId: session!.userId,
            type: "media",
            mediaUrl: (msg as any).media_url,
            mediaMime: (msg as any).media_mime,
            createdAt: String(msg.created_at),
          },
        },
        { status: 200 },
      );
    }

    // voice attachment
    const voiceMime = mime || "audio/webm";

    const supabaseStorage = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const ext = (file.name.split(".").pop() ?? "webm").toLowerCase() || "webm";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const filePath = `${session!.userId}/${fileName}`;

    const { error: uploadError } = await supabaseStorage.storage
      .from("voices")
      .upload(filePath, file, { upsert: false, contentType: voiceMime });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseStorage.storage
      .from("voices")
      .getPublicUrl(filePath);

    const voiceUrl = publicUrlData.publicUrl;

    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: session!.userId,
        type: "voice",
        voice_url: voiceUrl,
        voice_duration_ms: Number.isFinite(durationMs) ? durationMs : null,
      })
      .select("id,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: {
          id: String(msg.id),
          senderId: session!.userId,
          type: "voice",
          voiceUrl,
          voiceDurationMs: Number.isFinite(durationMs) ? durationMs : null,
          createdAt: String(msg.created_at),
        },
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
}
