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

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null;
  const frontend = process.env.FRONTEND_ORIGIN;
  if (frontend && origin === frontend) return origin;
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  try {
    if (host && new URL(origin).host === host) return origin;
  } catch {
    // malformed Origin header → treated as foreign
  }
  return null;
}

function withCors(res, origin) {
  if (origin && origin === process.env.FRONTEND_ORIGIN) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Vary", "Origin");
  }
}

function corsAndCsrf(req, res, next) {
  const origin = req.headers.origin;
  const allowed = allowedOrigin(req);

  if (req.method === "OPTIONS") {
    withCors(res, allowed);
    if (allowed) {
      res.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Max-Age", "600");
    }
    return res.status(204).end();
  }

  if (MUTATING.has(req.method) && origin && !allowed) {
    return res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "Cross-origin request blocked" } });
  }

  withCors(res, allowed);
  next();
}

module.exports = { corsAndCsrf };
