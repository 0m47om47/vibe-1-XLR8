const { ObjectId, MongoServerError } = require("mongodb");
const { db } = require("../lib/db");
const { ApiError, conflict } = require("../lib/errors");
const { getDummyHash, hashPassword, verifyPassword } = require("../lib/password");
const { nameKey } = require("../lib/validation");

async function registerUser(input) {
  const { users } = await db();
  const now = new Date();
  const user = {
    _id: new ObjectId(),
    name: input.name,
    nameKey: nameKey(input.name),
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    accountStatus: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  try {
    await users.insertOne(user);
  } catch (err) {
    // The unique index is the source of truth (no check-then-insert race).
    if (err instanceof MongoServerError && err.code === 11000) {
      throw conflict("An account with this email already exists", { email: "Email is already registered" });
    }
    throw err;
  }
  return user;
}

async function authenticate(input) {
  const { users } = await db();
  const user = await users.findOne({ email: input.email });
  // Always run one hash verification so timing does not reveal whether the email exists.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) throw new ApiError(401, "UNAUTHENTICATED", "Invalid email or password");
  return user;
}

module.exports = { registerUser, authenticate };
