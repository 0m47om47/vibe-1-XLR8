import type { ObjectId } from "mongodb";
import type { UserRole } from "./User";

export const ROLE_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type RoleRequestStatus = (typeof ROLE_REQUEST_STATUSES)[number];

export interface RoleRequestDoc {
  _id: ObjectId;
  userId: ObjectId;
  userName: string;
  userEmail: string;
  currentRole: UserRole;
  requestedRole: UserRole;
  reason: string | null;
  status: RoleRequestStatus;
  /** Admin who reviewed the request. */
  reviewedBy: ObjectId | null;
  reviewerName: string | null;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RoleRequestDTO = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: UserRole;
  requestedRole: UserRole;
  reason: string | null;
  status: RoleRequestStatus;
  reviewedBy: string | null;
  reviewerName: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toRoleRequestDTO(doc: RoleRequestDoc): RoleRequestDTO {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    userName: doc.userName,
    userEmail: doc.userEmail,
    currentRole: doc.currentRole,
    requestedRole: doc.requestedRole,
    reason: doc.reason,
    status: doc.status,
    reviewedBy: doc.reviewedBy?.toHexString() ?? null,
    reviewerName: doc.reviewerName,
    rejectionReason: doc.rejectionReason,
    reviewedAt: doc.reviewedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
