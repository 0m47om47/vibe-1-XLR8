const { ObjectId } = require("mongodb");
const { config } = require("../lib/config");
const { db } = require("../lib/db");
const { ApiError, badRequest, invalidState, notFound } = require("../lib/errors");
const { clashOverlappingPendingRequests, findConflictingTrip, tripWindow } = require("../lib/clashDetection");
const { withTotoReservation } = require("../lib/totoLock");
const { toRequestDTO } = require("../models/RideRequest");
const { toTripDTO } = require("../models/Trip");

const CLASH_REASON = "The Toto is already booked for an overlapping time. It can run only one trip at a time.";

// ------------------------------------------------------------------ create

/**
 * Creates a ride request. If the Toto is already reserved (ACCEPTED/IN_PROGRESS
 * trip) for an overlapping window, the request is stored immediately as CLASHED.
 * Runs under the Toto lock so the check cannot race with a concurrent accept.
 */
async function createRideRequest(user, input) {
  const { rideRequests, trips } = await db();
  const duration = config.tripDurationMinutes;
  const window = tripWindow(input.scheduledAt, duration);

  const doc = await withTotoReservation(async (session) => {
    const now = new Date();
    const conflictingTrip = await findConflictingTrip(trips, window, session);
    const request = {
      _id: new ObjectId(),
      requesterId: user._id,
      requesterName: user.name,
      requesterRole: user.role,
      from: input.from,
      to: input.to,
      scheduledAt: window.start,
      endsAt: window.end,
      estimatedDurationMinutes: duration,
      passengers: input.passengers.map((p) => ({
        _id: new ObjectId(),
        name: p.name,
        nameKey: p.nameKey,
        // Link the passenger entry to the requester's account when it is them.
        userId: p.nameKey === user.nameKey ? user._id : null,
      })),
      status: conflictingTrip ? "CLASHED" : "PENDING",
      tripId: null,
      clashedWithTripId: conflictingTrip?._id ?? null,
      statusReason: conflictingTrip ? CLASH_REASON : null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await rideRequests.insertOne(request, { session });
    return request;
  });

  return { request: toRequestDTO(doc), clashed: doc.status === "CLASHED" };
}

// ------------------------------------------------------------------ read

/** Students/employees see only their own requests; the rider sees everyone's. */
async function listRideRequests(user, opts) {
  const { rideRequests } = await db();
  const now = new Date();
  const filter = {};
  if (user.role !== "RIDER") filter.requesterId = user._id;
  if (opts.status) filter.status = opts.status;
  if (opts.upcomingOnly) filter.scheduledAt = { $gt: now };

  // Work queues read soonest-first; everything else newest-first.
  const sort = opts.status === "PENDING" || opts.upcomingOnly ? { scheduledAt: 1 } : { scheduledAt: -1 };
  const docs = await rideRequests.find(filter, { sort, limit: opts.limit }).toArray();
  return docs.map((d) => toRequestDTO(d, now));
}

/**
 * Visible to the rider, the requester, and anyone listed as a passenger (so a
 * passenger can open a trip from their history). Others get 404, not 403, so
 * ids cannot be probed.
 */
async function loadVisibleRequest(user, id) {
  const { rideRequests } = await db();
  const doc = await rideRequests.findOne({ _id: id });
  const visible =
    doc &&
    (user.role === "RIDER" ||
      doc.requesterId.equals(user._id) ||
      doc.passengers.some((p) => p.userId?.equals(user._id) || p.nameKey === user.nameKey));
  if (!visible) throw notFound("Ride request");
  return doc;
}

async function getRideRequest(user, id) {
  const doc = await loadVisibleRequest(user, id);
  let trip = null;
  if (doc.tripId) {
    const { trips } = await db();
    trip = await trips.findOne({ _id: doc.tripId });
  }
  return { request: toRequestDTO(doc), trip: trip ? toTripDTO(trip) : null };
}

// ------------------------------------------------------------------ cancel

/**
 * The requester may cancel while PENDING, or while ACCEPTED before pickup starts.
 * Cancelling an accepted request also cancels its trip, which frees the Toto.
 */
async function cancelRideRequest(user, id) {
  const { rideRequests, trips } = await db();

  const updated = await withTotoReservation(async (session) => {
    const now = new Date();
    const doc = await rideRequests.findOne({ _id: id }, { session });
    if (!doc || !doc.requesterId.equals(user._id)) throw notFound("Ride request");

    if (doc.status !== "PENDING" && doc.status !== "ACCEPTED") {
      throw invalidState(`A ${doc.status.toLowerCase().replace("_", " ")} request cannot be cancelled`);
    }

    if (doc.status === "ACCEPTED" && doc.tripId) {
      const res = await trips.updateOne(
        { _id: doc.tripId, status: "ACCEPTED" },
        { $set: { status: "CANCELLED", cancelledAt: now, updatedAt: now } },
        { session },
      );
      if (res.modifiedCount !== 1) throw invalidState("The trip has already started and can no longer be cancelled");
    }

    const after = await rideRequests.findOneAndUpdate(
      { _id: id, status: doc.status },
      { $set: { status: "CANCELLED", cancelledAt: now, statusReason: "Cancelled by requester", updatedAt: now } },
      { session, returnDocument: "after" },
    );
    if (!after) throw invalidState("The request changed while cancelling. Please refresh.");
    return after;
  });

  return toRequestDTO(updated);
}

// ------------------------------------------------------------------ accept (rider)

/**
 * Rider accepts a PENDING request and reserves the Toto for its window.
 *
 * Inside one transaction holding the Toto lock (see lib/totoLock.js):
 *   1. re-read the request (must still be PENDING),
 *   2. re-check for an overlapping ACCEPTED/IN_PROGRESS trip — immediately
 *      before the write, on data no concurrent transaction can change,
 *   3a. overlap  → mark THIS request CLASHED (committed), caller returns 409,
 *   3b. free     → insert the trip, mark the request ACCEPTED and mark every
 *                  other overlapping PENDING request CLASHED.
 *
 * Two simultaneous accepts for overlapping requests are therefore serialised:
 * exactly one creates a trip, the other observes it and becomes CLASHED.
 */
async function acceptRideRequest(rider, id) {
  const { rideRequests, trips } = await db();

  return withTotoReservation(async (session) => {
    const now = new Date();
    const request = await rideRequests.findOne({ _id: id }, { session });
    if (!request) throw notFound("Ride request");

    if (request.status === "CLASHED") {
      throw new ApiError(409, "TRIP_CLASH", "This request clashes with a trip that is already booked", {
        requestStatus: "CLASHED",
        conflictingTripId: request.clashedWithTripId?.toHexString() ?? null,
      });
    }
    if (request.status !== "PENDING") {
      throw invalidState(`Only pending requests can be accepted (this one is ${request.status})`);
    }
    if (request.scheduledAt.getTime() <= now.getTime()) {
      throw badRequest("The requested pickup time has already passed");
    }

    const window = { start: request.scheduledAt, end: request.endsAt };
    const conflictingTrip = await findConflictingTrip(trips, window, session);

    if (conflictingTrip) {
      const clashed = await rideRequests.findOneAndUpdate(
        { _id: id, status: "PENDING" },
        {
          $set: {
            status: "CLASHED",
            clashedWithTripId: conflictingTrip._id,
            statusReason: CLASH_REASON,
            updatedAt: now,
          },
        },
        { session, returnDocument: "after" },
      );
      return {
        outcome: "CLASHED",
        request: toRequestDTO(clashed, now),
        conflictingTripId: conflictingTrip._id.toHexString(),
      };
    }

    const trip = {
      _id: new ObjectId(),
      vehicleId: config.vehicleId,
      requestId: request._id,
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      riderId: rider._id,
      riderName: rider.name,
      from: request.from,
      to: request.to,
      scheduledAt: request.scheduledAt,
      endsAt: request.endsAt,
      estimatedDurationMinutes: request.estimatedDurationMinutes,
      passengers: request.passengers.map((p) => ({
        _id: p._id,
        name: p.name,
        nameKey: p.nameKey,
        userId: p.userId,
        boardingStatus: "PENDING",
        boardedAt: null,
        statusUpdatedAt: null,
      })),
      status: "ACCEPTED",
      acceptedAt: now,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await trips.insertOne(trip, { session });

    const accepted = await rideRequests.findOneAndUpdate(
      { _id: id, status: "PENDING" },
      { $set: { status: "ACCEPTED", tripId: trip._id, statusReason: null, updatedAt: now } },
      { session, returnDocument: "after" },
    );
    if (!accepted) throw invalidState("The request changed while accepting. Please refresh.");

    const clashedIds = await clashOverlappingPendingRequests(rideRequests, trip, session, now);

    return {
      outcome: "ACCEPTED",
      request: toRequestDTO(accepted, now),
      trip: toTripDTO(trip),
      clashedRequestIds: clashedIds.map((x) => x.toHexString()),
    };
  });
}

module.exports = { createRideRequest, listRideRequests, getRideRequest, cancelRideRequest, acceptRideRequest };
