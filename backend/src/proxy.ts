import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every /api request.
 *
 * - CORS: only needed if a browser calls this API directly from another origin.
 *   The default setup avoids that (the frontend proxies /api/* to this server,
 *   so cookies stay first-party). If FRONTEND_ORIGIN is set, that single origin
 *   is allowed with credentials — never a wildcard.
 * - CSRF defence in depth: the session cookie is SameSite=Lax; additionally any
 *   state-changing request that carries an Origin header must come from this
 *   host or FRONTEND_ORIGIN.
 *
 * Authentication/authorisation is NOT done here — every route handler calls
 * requireAuth()/requireRole(), which check the session against the database.
 */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const frontend = process.env.FRONTEND_ORIGIN;
  if (frontend && origin === frontend) return origin;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (host && new URL(origin).host === host) return origin;
  } catch {
    // malformed Origin header → treated as foreign
  }
  return null;
}

function withCors(res: NextResponse, origin: string | null): NextResponse {
  if (origin && origin === process.env.FRONTEND_ORIGIN) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigin(req);

  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (allowed) {
      res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type");
      res.headers.set("Access-Control-Max-Age", "600");
    }
    return withCors(res, allowed);
  }

  if (MUTATING.has(req.method) && origin && !allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "Cross-origin request blocked" } },
      { status: 403 },
    );
  }

  return withCors(NextResponse.next(), allowed);
}

export const config = {
  matcher: "/api/:path*",
};
