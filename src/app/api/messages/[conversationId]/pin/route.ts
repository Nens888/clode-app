import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const { pinned } = (await req.json()) as { pinned?: boolean };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("conversation_participants")
    .update({ pinned: Boolean(pinned) })
    .eq("conversation_id", conversationId)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
