const { db } = require("./db");
const { forbidden, unauthenticated } = require("./errors");
const { readSessionUserId } = require("./session");

/**
 * Identity always comes from the session cookie → database lookup.
 * Client-supplied user ids are never trusted.
 * Returns the user without its password hash, or null.
 */
async function getCurrentUser(req) {
  const userId = await readSessionUserId(req);
  if (!userId) return null;
  const { users } = await db();
  return users.findOne({ _id: userId }, { projection: { passwordHash: 0 } });
}

/** Throws 401 when there is no valid session. */
async function requireAuth(req) {
  const user = await getCurrentUser(req);
  if (!user) throw unauthenticated();
  return user;
}

/** Throws 401 when logged out, 403 when the user's role is not allowed. */
async function requireRole(req, ...roles) {
  const user = await requireAuth(req);
  if (!roles.includes(user.role)) {
    throw forbidden(`This action is only available to: ${roles.join(", ").toLowerCase()}`);
  }
  return user;
}

const requireRider = (req) => requireRole(req, "RIDER");
const requirePassenger = (req) => requireRole(req, "STUDENT", "EMPLOYEE");
const requireAdmin = (req) => requireRole(req, "ADMIN");

module.exports = { getCurrentUser, requireAuth, requireRole, requireRider, requirePassenger, requireAdmin };
