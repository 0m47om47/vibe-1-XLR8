import { ObjectId, type Filter, type Sort } from "mongodb";
import type { CurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { ApiError, badRequest, invalidState, notFound } from "@/lib/errors";
import {
  assessPooling,
  clashOverlappingPendingRequests,
  findOverlappingTrip,
  tripWindow,
} from "@/lib/clashDetection";
import { withTotoReservation } from "@/lib/totoLock";
import type { CreateRequestInput } from "@/lib/validation";
import { toRequestDTO, type RequestDTO, type RequestStatus, type RideRequestDoc } from "@/models/RideRequest";
import { toTripDTO, type TripDTO, type TripDoc, type TripPassenger } from "@/models/Trip";

// ------------------------------------------------------------------ create

export type CreateRequestResult = {
  request: RequestDTO;
  clashed: boolean;
  /** Set when an accepted run already goes this way at this time and the request fits on it. */
  sharesTripId: string | null;
};

/**
 * Creates a ride request. If an accepted run overlaps it:
 *  - same route + time with enough seats → stays PENDING (the rider can add it to that run),
 *  - otherwise → stored immediately as CLASHED with the reason.
 * Runs under the Toto lock so the check cannot race with a concurrent accept.
 */
export async function createRideRequest(user: CurrentUser, input: CreateRequestInput): Promise<CreateRequestResult> {
  const { rideRequests, trips } = await db();
  const duration = config.tripDurationMinutes;
  const window = tripWindow(input.scheduledAt, duration);

  const { doc, sharesTripId } = await withTotoReservation(async (session) => {
    const now = new Date();
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
      status: "PENDING",
      tripId: null,
      clashedWithTripId: null,
      statusReason: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const overlapping = await findOverlappingTrip(trips, window, session);
    let shares: string | null = null;
    if (overlapping) {
      const decision = assessPooling(overlapping, request);
      if (decision.canJoin) {
        shares = overlapping._id.toHexString();
      } else {
        request.status = "CLASHED";
        request.clashedWithTripId = overlapping._id;
        request.statusReason = decision.reason;
      }
    }
    await rideRequests.insertOne(request, { session });
    return { doc: request, sharesTripId: shares };
  });

  return { request: toRequestDTO(doc), clashed: doc.status === "CLASHED", sharesTripId };
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

/**
 * Visible to the rider, the requester, and anyone listed as a passenger (so a
 * passenger can open a trip from their history). Others get 404, not 403, so
 * ids cannot be probed.
 */
async function loadVisibleRequest(user: CurrentUser, id: ObjectId): Promise<RideRequestDoc> {
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

/**
 * The request plus the run it rides on. On a shared run, students/employees only
 * see the passengers of this request (others are counted, not named).
 */
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
  return {
    request: toRequestDTO(doc),
    trip: trip ? toTripDTO(trip, user.role === "RIDER" ? {} : { visibleRequestIds: [doc._id] }) : null,
  };
}

// ------------------------------------------------------------------ cancel

/**
 * The requester may cancel while PENDING, or while ACCEPTED before pickup starts.
 * Cancelling an accepted request takes its passengers off the run (freeing their
 * seats); if nobody is left on the run, the run itself is cancelled and the Toto
 * is free for that window again.
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
      const trip = await trips.findOne({ _id: doc.tripId }, { session });
      if (!trip || trip.status !== "ACCEPTED") {
        throw invalidState("The trip has already started and can no longer be cancelled");
      }
      const remaining = trip.requests.filter((r) => !r.requestId.equals(id));
      await trips.updateOne(
        { _id: trip._id, status: "ACCEPTED" },
        remaining.length === 0
          ? { $set: { status: "CANCELLED", cancelledAt: now, updatedAt: now } }
          : {
              $pull: { requests: { requestId: id }, passengers: { requestId: id } },
              $set: { updatedAt: now },
            },
        { session },
      );
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
  | {
      /** NEW_TRIP = a new run was created; JOINED = added to an accepted run going the same way. */
      outcome: "NEW_TRIP" | "JOINED";
      request: RequestDTO;
      trip: TripDTO;
      clashedRequestIds: string[];
    }
  | { outcome: "CLASHED"; request: RequestDTO; conflictingTripId: string; reason: string };

function toTripPassengers(request: RideRequestDoc): TripPassenger[] {
  return request.passengers.map((p) => ({
    _id: p._id,
    name: p.name,
    nameKey: p.nameKey,
    userId: p.userId,
    requestId: request._id,
    requesterName: request.requesterName,
    boardingStatus: "PENDING",
    boardedAt: null,
    statusUpdatedAt: null,
  }));
}

/**
 * Rider accepts a PENDING request.
 *
 * Inside one transaction holding the Toto lock (see lib/totoLock.ts):
 *   1. re-read the request (must still be PENDING and in the future),
 *   2. find the run overlapping its window — immediately before the write, on
 *      data no concurrent transaction can change,
 *   3a. no run       → create a new run with this request,
 *   3b. a run that it can share (same route + time, seats left, not started)
 *                    → add its passengers to that run,
 *   3c. anything else → mark THIS request CLASHED (committed); caller returns 409,
 *   4. re-check every other overlapping PENDING request against the run: those
 *      that no longer fit (other route, or seats ran out) become CLASHED.
 *
 * Simultaneous accepts are serialised by the lock, so the seat count can never
 * go over capacity and two different runs can never overlap.
 */
export async function acceptRideRequest(rider: CurrentUser, id: ObjectId): Promise<AcceptResult> {
  const { rideRequests, trips } = await db();

  return withTotoReservation<AcceptResult>(async (session) => {
    const now = new Date();
    const request = await rideRequests.findOne({ _id: id }, { session });
    if (!request) throw notFound("Ride request");

    if (request.status === "CLASHED") {
      throw new ApiError(409, "TRIP_CLASH", request.statusReason ?? "This request clashes with a booked run", {
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

    const overlapping = await findOverlappingTrip(trips, { start: request.scheduledAt, end: request.endsAt }, session);

    let trip: TripDoc;
    let outcome: "NEW_TRIP" | "JOINED";

    if (overlapping) {
      const decision = assessPooling(overlapping, request);
      if (!decision.canJoin) {
        const clashed = await rideRequests.findOneAndUpdate(
          { _id: id, status: "PENDING" },
          {
            $set: {
              status: "CLASHED",
              clashedWithTripId: overlapping._id,
              statusReason: decision.reason,
              updatedAt: now,
            },
          },
          { session, returnDocument: "after" },
        );
        return {
          outcome: "CLASHED",
          request: toRequestDTO(clashed!, now),
          conflictingTripId: overlapping._id.toHexString(),
          reason: decision.reason,
        };
      }

      // Share the run. The filter re-asserts the seat count atomically.
      const joined = await trips.findOneAndUpdate(
        {
          _id: overlapping._id,
          status: "ACCEPTED",
          [`passengers.${overlapping.capacity - request.passengers.length}`]: { $exists: false },
        },
        {
          $push: {
            requests: {
              requestId: request._id,
              requesterId: request.requesterId,
              requesterName: request.requesterName,
              passengerCount: request.passengers.length,
              joinedAt: now,
            },
            passengers: { $each: toTripPassengers(request) },
          },
          $set: { updatedAt: now },
        },
        { session, returnDocument: "after" },
      );
      if (!joined) throw invalidState("The run changed while accepting. Please refresh.");
      trip = joined;
      outcome = "JOINED";
    } else {
      trip = {
        _id: new ObjectId(),
        vehicleId: config.vehicleId,
        requests: [
          {
            requestId: request._id,
            requesterId: request.requesterId,
            requesterName: request.requesterName,
            passengerCount: request.passengers.length,
            joinedAt: now,
          },
        ],
        riderId: rider._id,
        riderName: rider.name,
        from: request.from,
        to: request.to,
        scheduledAt: request.scheduledAt,
        endsAt: request.endsAt,
        estimatedDurationMinutes: request.estimatedDurationMinutes,
        capacity: config.totoCapacity,
        passengers: toTripPassengers(request),
        status: "ACCEPTED",
        acceptedAt: now,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await trips.insertOne(trip, { session });
      outcome = "NEW_TRIP";
    }

    const accepted = await rideRequests.findOneAndUpdate(
      { _id: id, status: "PENDING" },
      { $set: { status: "ACCEPTED", tripId: trip._id, statusReason: null, updatedAt: now } },
      { session, returnDocument: "after" },
    );
    if (!accepted) throw invalidState("The request changed while accepting. Please refresh.");

    const clashedIds = await clashOverlappingPendingRequests(rideRequests, trip, session, now);

    return {
      outcome,
      request: toRequestDTO(accepted, now),
      trip: toTripDTO(trip),
      clashedRequestIds: clashedIds.map((x) => x.toHexString()),
    };
  });
}
