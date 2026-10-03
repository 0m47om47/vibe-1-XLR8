import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { ObjectId } from "mongodb";
import { config } from "./config";
import { db } from "./db";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session for the user and sets the HTTP-only cookie on the response. */
export async function createSession(userId: ObjectId): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.sessionTtlDays * 24 * 60 * 60 * 1000);

  const { sessions } = await db();
  await sessions.insertOne({ _id: hashToken(token), userId, createdAt: now, expiresAt });

  (await cookies()).set(config.sessionCookieName, token, {
    httpOnly: true, // not readable from JavaScript → not stealable via XSS
    secure: config.isProduction, // HTTPS-only in production
    sameSite: "lax", // not sent on cross-site POSTs → CSRF protection for mutations
    path: "/",
    expires: expiresAt,
  });
}

/** Resolves the session cookie to a user id, or null. */
export async function readSessionUserId(): Promise<ObjectId | null> {
  const token = (await cookies()).get(config.sessionCookieName)?.value;
  if (!token || token.length > 128) return null;

  const { sessions } = await db();
  // The TTL monitor runs about once a minute, so also check expiry explicitly.
  const session = await sessions.findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  return session?.userId ?? null;
}

/** Deletes the server-side session (if any) and clears the cookie. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(config.sessionCookieName)?.value;
  if (token) {
    const { sessions } = await db();
    await sessions.deleteOne({ _id: hashToken(token) });
  }
  jar.set(config.sessionCookieName, "", {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
