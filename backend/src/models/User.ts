import type { ObjectId } from "mongodb";

export const USER_ROLES = ["STUDENT", "EMPLOYEE", "RIDER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles that can request rides (and self-register). */
export const PASSENGER_ROLES = ["STUDENT", "EMPLOYEE"] as const satisfies readonly UserRole[];

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
  createdAt: Date;
  updatedAt: Date;
}

/** The safe, public shape of a user. */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export function toPublicUser(user: Pick<UserDoc, "_id" | "name" | "email" | "role" | "createdAt">): PublicUser {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
