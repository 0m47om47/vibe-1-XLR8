/**
 * Server-side session document shape (no logic here):
 * { _id: sha256(token), userId, createdAt, expiresAt }.
 * The browser only holds a random token in an HTTP-only cookie; the database
 * stores its SHA-256 hash, so a leaked database dump cannot be replayed as
 * live sessions. Logout deletes the document (real revocation), and a TTL
 * index removes expired sessions automatically.
 */
module.exports = {};
