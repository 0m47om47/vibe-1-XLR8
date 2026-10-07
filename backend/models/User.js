const USER_ROLES = ["STUDENT", "EMPLOYEE", "RIDER", "ADMIN"];

/** Roles that can request rides (and self-register). */
const PASSENGER_ROLES = ["STUDENT", "EMPLOYEE"];

/** The safe, public shape of a user (never includes passwordHash). */
function toPublicUser(user) {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus ?? "ACTIVE",
    createdAt: user.createdAt.toISOString(),
  };
}

module.exports = { USER_ROLES, PASSENGER_ROLES, toPublicUser };
