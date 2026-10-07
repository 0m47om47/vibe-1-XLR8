const { createHash, randomBytes } = require("node:crypto");
const { config } = require("./config");
const { db } = require("./db");

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session for the user and sets the HTTP-only cookie on the response. */
async function createSession(res, userId) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.sessionTtlDays * 24 * 60 * 60 * 1000);

  const { sessions } = await db();
  await sessions.insertOne({ _id: hashToken(token), userId, createdAt: now, expiresAt });

  res.cookie(config.sessionCookieName, token, {
    httpOnly: true, // not readable from JavaScript → not stealable via XSS
    secure: config.isProduction, // HTTPS-only in production
    sameSite: "lax", // not sent on cross-site POSTs → CSRF protection for mutations
    path: "/",
    expires: expiresAt,
  });
}

/** Resolves the session cookie to a user id, or null. */
async function readSessionUserId(req) {
  const token = req.cookies?.[config.sessionCookieName];
  if (!token || token.length > 128) return null;

  const { sessions } = await db();
  // The TTL monitor runs about once a minute, so also check expiry explicitly.
  const session = await sessions.findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  return session?.userId ?? null;
}

/** Deletes the server-side session (if any) and clears the cookie. */
async function destroySession(req, res) {
  const token = req.cookies?.[config.sessionCookieName];
  if (token) {
    const { sessions } = await db();
    await sessions.deleteOne({ _id: hashToken(token) });
  }
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
  });
}

module.exports = { createSession, readSessionUserId, destroySession };
