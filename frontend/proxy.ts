import { NextResponse, type NextRequest } from "next/server";

/**
 * Protected pages: redirect to /login when there is no session cookie at all.
 * This is only a fast first gate — the real check happens on every API call,
 * where the backend validates the session and the user's role. AppLayout also
 * re-checks the session and role on the client.
 */
const SESSION_COOKIE = "toto_session";

export function proxy(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/request", "/requests", "/my-trips", "/rides/:path*", "/rider/:path*"],
};
