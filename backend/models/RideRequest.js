const LOCATIONS = ["College", "Station", "Office"];

/**
 * Request lifecycle. PENDING → ACCEPTED → IN_PROGRESS → COMPLETED,
 * or PENDING → CLASHED, or PENDING/ACCEPTED → CANCELLED.
 * IN_PROGRESS/COMPLETED mirror the linked trip so a requester sees one status.
 */
const REQUEST_STATUSES = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLASHED", "CANCELLED"];

function toRequestDTO(doc, now = new Date()) {
  // Request status is kept in sync with its trip inside the same transactions.
  const tripStatus = doc.tripId ? (doc.status === "CANCELLED" ? "CANCELLED" : doc.status) : null;
  return {
    id: doc._id.toHexString(),
    requester: { id: doc.requesterId.toHexString(), name: doc.requesterName, role: doc.requesterRole },
    from: doc.from,
    to: doc.to,
    scheduledAt: doc.scheduledAt.toISOString(),
    endsAt: doc.endsAt.toISOString(),
    estimatedDurationMinutes: doc.estimatedDurationMinutes,
    passengers: doc.passengers.map((p) => ({ id: p._id.toHexString(), name: p.name })),
    passengerCount: doc.passengers.length,
    status: doc.status,
    tripId: doc.tripId?.toHexString() ?? null,
    tripStatus,
    clashedWithTripId: doc.clashedWithTripId?.toHexString() ?? null,
    statusReason: doc.statusReason,
    isPast: doc.scheduledAt.getTime() <= now.getTime(),
    cancelledAt: doc.cancelledAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

module.exports = { LOCATIONS, REQUEST_STATUSES, toRequestDTO };
