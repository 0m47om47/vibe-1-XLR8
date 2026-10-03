import { ObjectId, type Filter, type Sort } from "mongodb";
import type { CurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { ApiError, badRequest, invalidState, notFound } from "@/lib/errors";
import { clashOverlappingPendingRequests, findConflictingTrip, tripWindow } from "@/lib/clashDetection";
import { withTotoReservation } from "@/lib/totoLock";
import type { CreateRequestInput } from "@/lib/validation";
import { toRequestDTO, type RequestDTO, type RequestStatus, type RideRequestDoc } from "@/models/RideRequest";
import { toTripDTO, type TripDTO, type TripDoc } from "@/models/Trip";

const CLASH_REASON = "The Toto is already booked for an overlapping time. It can run only one trip at a time.";

// ------------------------------------------------------------------ create

export type CreateRequestResult = { request: RequestDTO; clashed: boolean };

/**
 * Creates a ride request. If the Toto is already reserved (ACCEPTED/IN_PROGRESS
 * trip) for an overlapping window, the request is stored immediately as CLASHED.
 * Runs under the Toto lock so the check cannot race with a concurrent accept.
 */
export async function createRideRequest(user: CurrentUser, input: CreateRequestInput): Promise<CreateRequestResult> {
  const { rideRequests, trips } = await db();
  const duration = config.tripDurationMinutes;
  const window = tripWindow(input.scheduledAt, duration);

  const doc = await withTotoReservation(async (session) => {
    const now = new Date();
    const conflictingTrip = await findConflictingTrip(trips, window, session);
    const request: RideRequestDoc = {
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

export type ListRequestsOptions = { status?: RequestStatus; upcomingOnly?: boolean; limit: number };

/** Students/employees see only their own requests; the rider sees everyone's. */
export async function listRideRequests(user: CurrentUser, opts: ListRequestsOptions): Promise<RequestDTO[]> {
  const { rideRequests } = await db();
  const now = new Date();
  const filter: Filter<RideRequestDoc> = {};
  if (user.role !== "RIDER") filter.requesterId = user._id;
  if (opts.status) filter.status = opts.status;
  if (opts.upcomingOnly) filter.scheduledAt = { $gt: now };

  // Work queues read soonest-first; everything else newest-first.
  const sort: Sort = opts.status === "PENDING" || opts.upcomingOnly ? { scheduledAt: 1 } : { scheduledAt: -1 };
  const docs = await rideRequests.find(filter, { sort, limit: opts.limit }).toArray();
  return docs.map((d) => toRequestDTO(d, now));
}

async function loadVisibleRequest(user: CurrentUser, id: ObjectId): Promise<RideRequestDoc> {
  const { rideRequests } = await db();
  const doc = await rideRequests.findOne({ _id: id });
  // Someone else's request answers 404, not 403, so ids cannot be probed.
  if (!doc || (user.role !== "RIDER" && !doc.requesterId.equals(user._id))) throw notFound("Ride request");
  return doc;
}

export async function getRideRequest(
  user: CurrentUser,
  id: ObjectId,
): Promise<{ request: RequestDTO; trip: TripDTO | null }> {
  const doc = await loadVisibleRequest(user, id);
  let trip: TripDoc | null = null;
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
export async function cancelRideRequest(user: CurrentUser, id: ObjectId): Promise<RequestDTO> {
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

export type AcceptResult =
  | { outcome: "ACCEPTED"; request: RequestDTO; trip: TripDTO; clashedRequestIds: string[] }
  | { outcome: "CLASHED"; request: RequestDTO; conflictingTripId: string };

/**
 * Rider accepts a PENDING request and reserves the Toto for its window.
 *
 * Inside one transaction holding the Toto lock (see lib/totoLock.ts):
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
export async function acceptRideRequest(rider: CurrentUser, id: ObjectId): Promise<AcceptResult> {
  const { rideRequests, trips } = await db();

  return withTotoReservation<AcceptResult>(async (session) => {
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
        request: toRequestDTO(clashed!, now),
        conflictingTripId: conflictingTrip._id.toHexString(),
      };
    }

    const trip: TripDoc = {
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
