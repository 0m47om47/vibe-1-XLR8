/**
 * ACCEPTED → IN_PROGRESS → COMPLETED. ACCEPTED → CANCELLED when the requester
 * cancels before pickup (frees the Toto; the record is kept for audit).
 */
const TRIP_STATUSES = ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

/** Trips in these states hold the Toto for their time window. */
const ACTIVE_TRIP_STATUSES = ["ACCEPTED", "IN_PROGRESS"];

const BOARDING_STATUSES = ["PENDING", "BOARDED", "MISSED"];

function summariseBoarding(passengers) {
  const summary = { total: passengers.length, boarded: 0, missed: 0, pending: 0 };
  for (const p of passengers) {
    if (p.boardingStatus === "BOARDED") summary.boarded++;
    else if (p.boardingStatus === "MISSED") summary.missed++;
    else summary.pending++;
  }
  return summary;
}

/**
 * A trip is the permanent, factual record of a Toto run. Passenger entries are
 * embedded: they are always read with the trip, bounded in size, and must stay
 * exactly as they were when the trip completed.
 */
function toTripDTO(doc, opts = {}) {
  const boarding = summariseBoarding(doc.passengers);
  return {
    id: doc._id.toHexString(),
    requestId: doc.requestId.toHexString(),
    requester: { id: doc.requesterId.toHexString(), name: doc.requesterName },
    rider: { id: doc.riderId.toHexString(), name: doc.riderName },
    from: doc.from,
    to: doc.to,
    scheduledAt: doc.scheduledAt.toISOString(),
    endsAt: doc.endsAt.toISOString(),
    estimatedDurationMinutes: doc.estimatedDurationMinutes,
    passengers: doc.passengers.map((p) => ({
      id: p._id.toHexString(),
      name: p.name,
      boardingStatus: p.boardingStatus,
      boardedAt: p.boardedAt?.toISOString() ?? null,
      statusUpdatedAt: p.statusUpdatedAt?.toISOString() ?? null,
    })),
    boarding,
    status: doc.status,
    // Server-computed so the UI never has to re-implement the rules.
    canStart: doc.status === "ACCEPTED" && !opts.anotherTripInProgress,
    canComplete: doc.status === "IN_PROGRESS" && boarding.pending === 0,
    acceptedAt: doc.acceptedAt.toISOString(),
    startedAt: doc.startedAt?.toISOString() ?? null,
    completedAt: doc.completedAt?.toISOString() ?? null,
    cancelledAt: doc.cancelledAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

module.exports = { TRIP_STATUSES, ACTIVE_TRIP_STATUSES, BOARDING_STATUSES, summariseBoarding, toTripDTO };
