import { jwtVerify, SignJWT } from "jose";

const COOKIE_NAME = "clode_session";

function getSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_JWT_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export function sessionCookieName() {
  return COOKIE_NAME;
}

export async function signSessionToken(payload: {
  userId: string;
  email: string;
}) {
  const secret = getSecret();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);

  const userId = payload.userId;
  const email = payload.email;

  if (typeof userId !== "string" || typeof email !== "string") {
    throw new Error("Invalid session token");
  }

  return { userId, email };
}
