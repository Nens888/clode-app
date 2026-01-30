import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";

function normalizeUsername(input: string) {
  let v = input.trim().toLowerCase();
  if (v.startsWith("@")) v = v.slice(1);
  return v;
}

function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("username") ?? "";
  const username = normalizeUsername(raw);

  if (!username) {
    return NextResponse.json({ available: false, reason: "empty" }, { status: 400 });
  }

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { available: false, reason: "invalid" },
      { status: 200 },
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  return NextResponse.json({ available: !data?.id });
}
