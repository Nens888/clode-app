import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { hashCode } from "@/lib/auth/code";
import { sessionCookieName, signSessionToken } from "@/lib/auth/jwt";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; code?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const code = (body.code ?? "").trim();

    const staticCode = (process.env.AUTH_STATIC_VERIFY_CODE ?? "").trim();
    const allowStatic = Boolean(staticCode) && process.env.NODE_ENV !== "production";

    if (!email || code.length < 6) {
      return NextResponse.json(
        { error: "Email и код обязательны" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, verified")
      .eq("email", email)
      .maybeSingle();

    if (!user?.id) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Dev helper: static unlimited code
    if (allowStatic && code === staticCode) {
      if (!user.verified) {
        await supabase.from("users").update({ verified: true }).eq("id", user.id);
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
    }

    const code_hash = hashCode(code);

    const { data: row } = await supabase
      .from("verification_codes")
      .select("id, expires_at, consumed_at")
      .eq("user_id", user.id)
      .eq("email", email)
      .eq("code_hash", code_hash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row?.id) {
      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    }

    if (row.consumed_at) {
      return NextResponse.json({ error: "Код уже использован" }, { status: 400 });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Код истёк" }, { status: 400 });
    }

    await supabase
      .from("verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    await supabase.from("users").update({ verified: true }).eq("id", user.id);

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
