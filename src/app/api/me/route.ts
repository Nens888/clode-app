import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("username,display_name,avatar_url,banner_url,verif,private")
    .eq("id", session.userId)
    .single();

  if (error) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user: user ? { ...user, id: session.userId } : null });
}
