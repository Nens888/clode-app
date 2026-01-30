import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabaseAdmin";
import { generateCode, hashCode } from "@/lib/auth/code";
import { hashPassword } from "@/lib/auth/password";
import { sendVerificationEmail } from "@/lib/email/unosend";

function normalizeUsername(input: string) {
  let v = input.trim().toLowerCase();
  if (v.startsWith("@")) v = v.slice(1);
  return v;
}

function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      username?: string;
      displayName?: string;
    };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const username = normalizeUsername(body.username ?? "");
    const display_name = (body.displayName ?? "").trim();

    if (!email || !password || !username || !display_name) {
      return NextResponse.json(
        { error: "Email, пароль, имя и username обязательны" },
        { status: 400 },
      );
    }

    if (display_name.length < 2 || display_name.length > 40) {
      return NextResponse.json(
        { error: "Имя должно быть 2-40 символов" },
        { status: 400 },
      );
    }

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "Username должен быть 3-20 символов: a-z, 0-9, _" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен быть минимум 6 символов" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const staticCode = (process.env.AUTH_STATIC_VERIFY_CODE ?? "").trim();
    const allowStatic = Boolean(staticCode);

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json(
        { error: "Пользователь уже существует" },
        { status: 409 },
      );
    }

    const { data: existingUsername } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername?.id) {
      return NextResponse.json(
        { error: "Username занят" },
        { status: 409 },
      );
    }

    const password_hash = await hashPassword(password);

    const { data: user, error: insertError } = await supabase
      .from("users")
      .insert({
        email,
        username,
        display_name,
        password_hash,
        verified: false,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    if (!allowStatic) {
      const code = generateCode();
      const code_hash = hashCode(code);
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: codeError } = await supabase.from("verification_codes").insert({
        user_id: user.id,
        email,
        code_hash,
        expires_at,
        consumed_at: null,
      });

      if (codeError) {
        return NextResponse.json(
          { error: codeError.message },
          { status: 500 },
        );
      }

      await sendVerificationEmail({ to: email, code });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
