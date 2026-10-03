import type { ObjectId } from "mongodb";

export const USER_ROLES = ["STUDENT", "EMPLOYEE", "RIDER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles that can request rides (and self-register). */
export const PASSENGER_ROLES = ["STUDENT", "EMPLOYEE"] as const satisfies readonly UserRole[];

export type AccountStatus = "ACTIVE" | "PENDING" | "SUSPENDED";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  /** Normalised name (lower-case, single spaces) used to match passenger records to this user. */
  nameKey: string;
  /** Always stored lower-case; unique. */
  email: string;
  /** scrypt hash — never returned by the API. */
  passwordHash: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** The safe, public shape of a user. */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
};

export function toPublicUser(user: Pick<UserDoc, "_id" | "name" | "email" | "role" | "accountStatus" | "createdAt">): PublicUser {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus ?? "ACTIVE",
    createdAt: user.createdAt.toISOString(),
  };
}
