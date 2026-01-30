import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never redirect API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  const token = request.cookies.get(sessionCookieName())?.value ?? null;
  const isAuthed = token
    ? await (async () => {
        try {
          await verifySessionToken(token);
          return true;
        } catch {
          return false;
        }
      })()
    : false;

  // If user is not authed: allow only auth pages
  if (!isAuthed && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/register";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // If user is authed: don't allow auth pages (send to home)
  if (isAuthed && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
