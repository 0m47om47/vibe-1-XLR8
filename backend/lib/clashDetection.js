const { config } = require("./config");
const { ACTIVE_TRIP_STATUSES } = require("../models/Trip");

/**
 * OVERLAP DEFINITION
 * ------------------
 * A trip occupies the half-open interval [start, end) where
 *   start = scheduledAt
 *   end   = scheduledAt + estimatedDurationMinutes   (default 30, TRIP_DURATION_MINUTES)
 *
 * Two trips overlap when   newStart < existingEnd  AND  newEnd > existingStart.
 *
 * Because the interval is half-open, back-to-back trips (10:00–10:30 and
 * 10:30–11:00) do NOT overlap. Only trips that hold the Toto — ACCEPTED or
 * IN_PROGRESS — can cause a clash; PENDING, CLASHED, CANCELLED and COMPLETED
 * records never block anyone.
 *
 * All clash checks run on the server inside withTotoReservation(); the
 * frontend is never trusted for this.
 */

function tripWindow(scheduledAt, durationMinutes = config.tripDurationMinutes) {
  return { start: scheduledAt, end: new Date(scheduledAt.getTime() + durationMinutes * 60_000) };
}

/** Pure overlap predicate (also used by tests). */
function windowsOverlap(a, b) {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

/** MongoDB filter for documents whose [scheduledAt, endsAt) overlaps the window. */
function overlapFilter(window) {
  return { scheduledAt: { $lt: window.end }, endsAt: { $gt: window.start } };
}

/** Finds an ACCEPTED / IN_PROGRESS trip of the Toto that overlaps the window. */
function findConflictingTrip(trips, window, session) {
  return trips.findOne(
    {
      vehicleId: config.vehicleId,
      status: { $in: [...ACTIVE_TRIP_STATUSES] },
      ...overlapFilter(window),
    },
    { session, sort: { scheduledAt: 1 } },
  );
}

/**
 * After a trip is accepted, every other PENDING request that overlaps it can no
 * longer be served → mark them CLASHED in the same transaction.
 */
async function clashOverlappingPendingRequests(rideRequests, trip, session, now) {
  const filter = {
    _id: { $ne: trip.requestId },
    status: "PENDING",
    ...overlapFilter({ start: trip.scheduledAt, end: trip.endsAt }),
  };
  const losers = await rideRequests.find(filter, { session, projection: { _id: 1 } }).toArray();
  if (losers.length === 0) return [];

  const ids = losers.map((r) => r._id);
  await rideRequests.updateMany(
    { _id: { $in: ids }, status: "PENDING" },
    {
      $set: {
        status: "CLASHED",
        clashedWithTripId: trip._id,
        statusReason: "Another trip was accepted for an overlapping time. The Toto can run only one trip at a time.",
        updatedAt: now,
      },
    },
    { session },
  );
  return ids;
}

module.exports = { tripWindow, windowsOverlap, overlapFilter, findConflictingTrip, clashOverlappingPendingRequests };
