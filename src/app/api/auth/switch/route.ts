import { NextResponse } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/jwt";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string };
    const token = body.token ?? "";

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const session = await verifySessionToken(token);

    const res = NextResponse.json({ ok: true, session });
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
      { error: e instanceof Error ? e.message : "Invalid token" },
      { status: 400 },
    );
  }
}
