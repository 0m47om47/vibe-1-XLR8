import { db } from "./db";
import { forbidden, unauthenticated } from "./errors";
import { readSessionUserId } from "./session";
import type { UserDoc, UserRole } from "@/models/User";

/** The authenticated user as loaded from the database — never includes the password hash. */
export type CurrentUser = Omit<UserDoc, "passwordHash">;

/**
 * Identity always comes from the session cookie → database lookup.
 * Client-supplied user ids are never trusted.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await readSessionUserId();
  if (!userId) return null;
  const { users } = await db();
  return users.findOne({ _id: userId }, { projection: { passwordHash: 0 } });
}

/** Throws 401 when there is no valid session. */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

/** Throws 401 when logged out, 403 when the user's role is not allowed. */
export async function requireRole(...roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw forbidden(`This action is only available to: ${roles.join(", ").toLowerCase()}`);
  }
  return user;
}

export const requireRider = () => requireRole("RIDER");
export const requirePassenger = () => requireRole("STUDENT", "EMPLOYEE");
