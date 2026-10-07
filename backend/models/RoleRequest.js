const ROLE_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

function toRoleRequestDTO(doc) {
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

module.exports = { ROLE_REQUEST_STATUSES, toRoleRequestDTO };
