import type { ClientSession, Collection, Filter, ObjectId } from "mongodb";
import { config } from "./config";
import { ACTIVE_TRIP_STATUSES, type TripDoc } from "@/models/Trip";
import type { RideRequestDoc } from "@/models/RideRequest";

/**
 * OVERLAP DEFINITION
 * ------------------
 * A run occupies the half-open interval [start, end) where
 *   start = scheduledAt                        (departure)
 *   end   = scheduledAt + estimatedDurationMinutes   (arrival; default 15, TRIP_DURATION_MINUTES)
 *
 * Two windows overlap when   newStart < existingEnd  AND  newEnd > existingStart.
 *
 * Half-open means back-to-back runs (College→Office 14:00–14:15, then
 * Office→Station from 14:15) do NOT overlap — the Toto can pick up at the place
 * it just arrived. Only runs that hold the Toto — ACCEPTED or IN_PROGRESS — count.
 *
 * POOLING
 * -------
 * An overlap is not automatically a clash. A request can SHARE an accepted run
 * when it goes the same way at the same time and its passengers fit:
 *   same from, same to, same departure time, run not started yet,
 *   seats left ≥ passengers in the request, nobody listed twice.
 * Anything else that overlaps is a clash.
 *
 * All of this runs on the server inside withTotoReservation(); the frontend is
 * never trusted.
 */

export type TimeWindow = { start: Date; end: Date };

export function tripWindow(scheduledAt: Date, durationMinutes = config.tripDurationMinutes): TimeWindow {
  return { start: scheduledAt, end: new Date(scheduledAt.getTime() + durationMinutes * 60_000) };
}

/** Pure overlap predicate (also used by tests). */
export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

/** MongoDB filter for documents whose [scheduledAt, endsAt) overlaps the window. */
export function overlapFilter(window: TimeWindow): { scheduledAt: { $lt: Date }; endsAt: { $gt: Date } } {
  return { scheduledAt: { $lt: window.end }, endsAt: { $gt: window.start } };
}

/**
 * The ACCEPTED / IN_PROGRESS run of the Toto that overlaps the window, if any.
 * Runs never overlap each other, so there is at most one.
 */
export function findOverlappingTrip(
  trips: Collection<TripDoc>,
  window: TimeWindow,
  session: ClientSession,
): Promise<TripDoc | null> {
  return trips.findOne(
    {
      vehicleId: config.vehicleId,
      status: { $in: [...ACTIVE_TRIP_STATUSES] },
      ...overlapFilter(window),
    },
    { session, sort: { scheduledAt: 1 } },
  );
}

type Poolable = Pick<RideRequestDoc, "from" | "to" | "scheduledAt" | "passengers">;

export type PoolDecision = { canJoin: true } | { canJoin: false; reason: string };

/** Can `request` share the overlapping `trip`? If not, why (shown to the user). */
export function assessPooling(trip: TripDoc, request: Poolable): PoolDecision {
  if (trip.status !== "ACCEPTED") {
    return { canJoin: false, reason: "The Toto is already out on a run at that time." };
  }
  const sameRun =
    trip.from === request.from && trip.to === request.to && trip.scheduledAt.getTime() === request.scheduledAt.getTime();
  if (!sameRun) {
    return {
      canJoin: false,
      reason: `The Toto is booked for another run (${trip.from} → ${trip.to}) at that time. It can run only one trip at a time.`,
    };
  }
  const left = trip.capacity - trip.passengers.length;
  if (request.passengers.length > left) {
    return {
      canJoin: false,
      reason:
        left === 0
          ? `The Toto is full for this run (${trip.capacity}/${trip.capacity} seats taken).`
          : `Only ${left} seat${left === 1 ? "" : "s"} left on this run; this request needs ${request.passengers.length}.`,
    };
  }
  const onBoard = new Set(trip.passengers.map((p) => p.nameKey));
  const dup = request.passengers.find((p) => onBoard.has(p.nameKey));
  if (dup) return { canJoin: false, reason: `${dup.name} is already booked on this run.` };
  return { canJoin: true };
}

/**
 * After a run is created or a request joins it, re-check every other PENDING
 * request that overlaps the run: those that can still share it stay PENDING;
 * the rest (other route/time, or no seats left) become CLASHED — in the same
 * transaction.
 */
export async function clashOverlappingPendingRequests(
  rideRequests: Collection<RideRequestDoc>,
  trip: TripDoc,
  session: ClientSession,
  now: Date,
): Promise<ObjectId[]> {
  const filter: Filter<RideRequestDoc> = {
    _id: { $nin: trip.requests.map((r) => r.requestId) },
    status: "PENDING",
    ...overlapFilter({ start: trip.scheduledAt, end: trip.endsAt }),
  };
  const candidates = await rideRequests.find(filter, { session }).toArray();
  const clashed: ObjectId[] = [];

  for (const req of candidates) {
    const decision = assessPooling(trip, req);
    if (decision.canJoin) continue;
    await rideRequests.updateOne(
      { _id: req._id, status: "PENDING" },
      { $set: { status: "CLASHED", clashedWithTripId: trip._id, statusReason: decision.reason, updatedAt: now } },
      { session },
    );
    clashed.push(req._id);
  }
  return clashed;
}
