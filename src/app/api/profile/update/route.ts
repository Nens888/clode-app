import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

function normalizeUsername(input: string) {
  let v = input.trim().toLowerCase();
  if (v.startsWith("@")) v = v.slice(1);
  return v;
}

function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { displayName, username, private: privateProfile } = (await req.json()) as {
      displayName: string;
      username: string;
      private?: boolean;
    };

    const supabase = createSupabaseAdminClient();

    // Validate username uniqueness
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .neq("id", session.userId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    // Update user profile
    const { error } = await supabase
      .from("users")
      .update({
        display_name: displayName,
        username,
        private: privateProfile ?? false,
      })
      .eq("id", session.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
