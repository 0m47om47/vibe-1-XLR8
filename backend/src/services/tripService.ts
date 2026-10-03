import { MongoServerError, type Filter, type ObjectId } from "mongodb";
import type { CurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { conflict, forbidden, invalidState, notFound } from "@/lib/errors";
import { withTotoReservation } from "@/lib/totoLock";
import {
  toScheduleEntry,
  toTripDTO,
  type BoardingStatus,
  type ScheduleEntryDTO,
  type TripDTO,
  type TripDoc,
  type TripStatus,
} from "@/models/Trip";
import { toVehicleDTO, type VehicleDTO } from "@/models/Vehicle";

async function isAnotherTripInProgress(excludeId?: ObjectId): Promise<boolean> {
  const { trips } = await db();
  const filter: Filter<TripDoc> = { vehicleId: config.vehicleId, status: "IN_PROGRESS" };
  if (excludeId) filter._id = { $ne: excludeId };
  return (await trips.countDocuments(filter, { limit: 1 })) > 0;
}

async function tripDTO(doc: TripDoc): Promise<TripDTO> {
  const busy = doc.status === "ACCEPTED" ? await isAnotherTripInProgress(doc._id) : false;
  return toTripDTO(doc, { anotherTripInProgress: busy });
}

/** Loads a trip for modification by `rider`: 404 if missing, 403 if it belongs to another rider. */
function assertOwnedBy(trip: TripDoc | null, rider: CurrentUser): TripDoc {
  if (!trip) throw notFound("Trip");
  if (!trip.riderId.equals(rider._id)) throw forbidden("This trip is assigned to another rider");
  return trip;
}

// ------------------------------------------------------------------ read

/**
 * Riders can view any trip of the Toto. Students/employees can view a trip only
 * if they requested a ride on it or are one of its passengers — and on a shared
 * run they only see the passengers of their own request(s).
 */
export async function getTrip(user: CurrentUser, id: ObjectId): Promise<TripDTO> {
  const { trips } = await db();
  const trip = await trips.findOne({ _id: id });
  if (!trip) throw notFound("Trip");
  if (user.role === "RIDER") return tripDTO(trip);

  const mine = new Set<string>();
  for (const r of trip.requests) if (r.requesterId.equals(user._id)) mine.add(r.requestId.toHexString());
  for (const p of trip.passengers) {
    if (p.userId?.equals(user._id) || p.nameKey === user.nameKey) mine.add(p.requestId.toHexString());
  }
  if (mine.size === 0) throw notFound("Trip");
  return toTripDTO(trip, { visibleRequestIds: trip.requests.filter((r) => mine.has(r.requestId.toHexString())).map((r) => r.requestId) });
}

/**
 * The Toto's upcoming runs for everyone: where it goes, when it leaves, when it
 * arrives (so people at the destination know when it will be there) and how
 * many seats are left. No passenger names.
 */
export async function getSchedule(days: number): Promise<{ capacity: number; entries: ScheduleEntryDTO[] }> {
  const { trips } = await db();
  const now = new Date();
  const until = new Date(now.getTime() + days * 86_400_000);
  const docs = await trips
    .find(
      { vehicleId: config.vehicleId, status: { $in: ["ACCEPTED", "IN_PROGRESS"] }, endsAt: { $gt: now }, scheduledAt: { $lt: until } },
      { sort: { scheduledAt: 1 }, limit: 100 },
    )
    .toArray();
  return { capacity: config.totoCapacity, entries: docs.map((d) => toScheduleEntry(d, now)) };
}

export type ListTripsOptions ={ status?: TripStatus; upcomingOnly?: boolean; limit: number };

/** Trips operated by this rider. */
export async function listRiderTrips(rider: CurrentUser, opts: ListTripsOptions): Promise<TripDTO[]> {
  const { trips } = await db();
  const filter: Filter<TripDoc> = { riderId: rider._id };
  if (opts.status) filter.status = opts.status;
  if (opts.upcomingOnly) filter.endsAt = { $gt: new Date() };
  const ascending = opts.upcomingOnly || opts.status === "ACCEPTED";
  const docs = await trips
    .find(filter, { sort: { scheduledAt: ascending ? 1 : -1 }, limit: opts.limit })
    .toArray();
  const busy = await isAnotherTripInProgress();
  return docs.map((d) => toTripDTO(d, { anotherTripInProgress: busy && d.status === "ACCEPTED" }));
}

/**
 * The rider's current trip: the one IN_PROGRESS, otherwise the earliest ACCEPTED
 * trip (including one whose pickup time has passed but was not started yet).
 */
export async function getCurrentTrip(rider: CurrentUser): Promise<{ trip: TripDTO | null; vehicle: VehicleDTO }> {
  const { trips, vehicles } = await db();
  const inProgress = await trips.findOne({ riderId: rider._id, status: "IN_PROGRESS" });
  const trip =
    inProgress ?? (await trips.findOne({ riderId: rider._id, status: "ACCEPTED" }, { sort: { scheduledAt: 1 } }));
  const vehicle = await vehicles.findOne({ _id: config.vehicleId });
  return { trip: trip ? await tripDTO(trip) : null, vehicle: toVehicleDTO(vehicle!) };
}

// ------------------------------------------------------------------ start

/**
 * ACCEPTED → IN_PROGRESS. Runs under the Toto lock; additionally the partial
 * unique index `one_in_progress_trip_per_vehicle` makes it impossible at the
 * database level for two trips to be IN_PROGRESS at once.
 */
export async function startTrip(rider: CurrentUser, id: ObjectId): Promise<TripDTO> {
  const { trips, rideRequests, vehicles } = await db();
  try {
    const started = await withTotoReservation(async (session) => {
      const now = new Date();
      const trip = assertOwnedBy(await trips.findOne({ _id: id }, { session }), rider);
      if (trip.status !== "ACCEPTED") throw invalidState(`Only accepted trips can be started (this one is ${trip.status})`);

      const busy = await trips.findOne(
        { vehicleId: config.vehicleId, status: "IN_PROGRESS", _id: { $ne: id } },
        { session, projection: { _id: 1 } },
      );
      if (busy) {
        throw conflict("The Toto is already on another trip. Complete it first.", {
          inProgressTripId: busy._id.toHexString(),
        });
      }

      const after = await trips.findOneAndUpdate(
        { _id: id, riderId: rider._id, status: "ACCEPTED" },
        { $set: { status: "IN_PROGRESS", startedAt: now, updatedAt: now } },
        { session, returnDocument: "after" },
      );
      // Every request sharing this run is now on the road.
      await rideRequests.updateMany(
        { _id: { $in: trip.requests.map((r) => r.requestId) }, status: "ACCEPTED" },
        { $set: { status: "IN_PROGRESS", updatedAt: now } },
        { session },
      );
      await vehicles.updateOne(
        { _id: config.vehicleId },
        { $set: { status: "ON_TRIP", currentTripId: id } },
        { session },
      );
      return after!;
    });
    return toTripDTO(started);
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw conflict("The Toto is already on another trip. Complete it first.");
    }
    throw err;
  }
}

// ------------------------------------------------------------------ boarding

/**
 * Marks one passenger BOARDED or MISSED. A single atomic update whose filter
 * enforces ownership + trip state, so concurrent updates to different
 * passengers never overwrite each other. Allowed only while IN_PROGRESS;
 * the rider may correct a mark until the trip is completed.
 */
export async function updatePassengerBoarding(
  rider: CurrentUser,
  tripId: ObjectId,
  passengerId: ObjectId,
  status: Exclude<BoardingStatus, "PENDING">,
): Promise<TripDTO> {
  const { trips } = await db();
  const now = new Date();
  const updated = await trips.findOneAndUpdate(
    { _id: tripId, riderId: rider._id, status: "IN_PROGRESS", "passengers._id": passengerId },
    {
      $set: {
        "passengers.$.boardingStatus": status,
        "passengers.$.boardedAt": status === "BOARDED" ? now : null,
        "passengers.$.statusUpdatedAt": now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (updated) return toTripDTO(updated);

  // Explain precisely why the update did not apply.
  const trip = assertOwnedBy(await trips.findOne({ _id: tripId }), rider);
  if (!trip.passengers.some((p) => p._id.equals(passengerId))) throw notFound("Passenger");
  if (trip.status === "ACCEPTED") throw invalidState("Start the trip before marking passengers");
  throw invalidState(`Passengers cannot be changed on a ${trip.status.toLowerCase()} trip`);
}

// ------------------------------------------------------------------ complete

/**
 * IN_PROGRESS → COMPLETED. The update filter itself requires that no passenger
 * is still PENDING, so the rule is enforced atomically by the database.
 * Completing frees the Toto; the trip and its passenger records stay forever.
 */
export async function completeTrip(rider: CurrentUser, id: ObjectId): Promise<TripDTO> {
  const { trips, rideRequests, vehicles } = await db();

  const completed = await withTotoReservation(async (session) => {
    const now = new Date();
    const after = await trips.findOneAndUpdate(
      {
        _id: id,
        riderId: rider._id,
        status: "IN_PROGRESS",
        passengers: { $not: { $elemMatch: { boardingStatus: "PENDING" } } },
      },
      { $set: { status: "COMPLETED", completedAt: now, updatedAt: now } },
      { session, returnDocument: "after" },
    );

    if (!after) {
      const trip = assertOwnedBy(await trips.findOne({ _id: id }, { session }), rider);
      if (trip.status !== "IN_PROGRESS") {
        throw invalidState(
          trip.status === "ACCEPTED"
            ? "Start the trip before completing it"
            : `This trip is already ${trip.status.toLowerCase()}`,
        );
      }
      const pending = trip.passengers.filter((p) => p.boardingStatus === "PENDING").map((p) => p.name);
      throw invalidState("Mark every passenger as BOARDED or MISSED before completing the trip", {
        pendingPassengers: pending,
      });
    }

    await rideRequests.updateMany(
      { _id: { $in: after.requests.map((r) => r.requestId) }, status: "IN_PROGRESS" },
      { $set: { status: "COMPLETED", updatedAt: now } },
      { session },
    );
    // Toto becomes available again.
    await vehicles.updateOne(
      { _id: config.vehicleId, currentTripId: id },
      { $set: { status: "AVAILABLE", currentTripId: null } },
      { session },
    );
    return after;
  });

  return toTripDTO(completed);
}
