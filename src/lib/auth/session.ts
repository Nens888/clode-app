import { cookies } from "next/headers";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/jwt";

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
