import type { ObjectId } from "mongodb";

/**
 * Server-side session. The browser only holds a random token in an HTTP-only
 * cookie; the database stores its SHA-256 hash, so a leaked database dump cannot
 * be replayed as live sessions. Logout deletes the document (real revocation),
 * and a TTL index removes expired sessions automatically.
 */
export interface SessionDoc {
  /** SHA-256 hex digest of the session token. */
  _id: string;
  userId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
}
