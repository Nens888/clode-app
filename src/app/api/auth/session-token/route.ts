import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/jwt";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (!token) {
    return NextResponse.json({ token: null }, { status: 200 });
  }

  try {
    await verifySessionToken(token);
    return NextResponse.json({ token }, { status: 200 });
  } catch {
    return NextResponse.json({ token: null }, { status: 200 });
  }
}
