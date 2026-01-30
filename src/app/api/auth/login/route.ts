import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { verifyPassword } from "@/lib/auth/password";
import { sessionCookieName, signSessionToken } from "@/lib/auth/jwt";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, password_hash, verified")
      .eq("email", email)
      .maybeSingle();

    if (!user?.id) {
      return NextResponse.json(
        { error: "Неверные данные" },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Неверные данные" },
        { status: 401 },
      );
    }

    if (!user.verified) {
      return NextResponse.json(
        { error: "Подтверди почту" },
        { status: 403 },
      );
    }

    const token = await signSessionToken({ userId: user.id, email });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
