import type { Collection, Db } from "mongodb";
import { config } from "./config";
import type { UserDoc } from "@/models/User";
import type { SessionDoc } from "@/models/Session";
import type { VehicleDoc } from "@/models/Vehicle";
import type { RideRequestDoc } from "@/models/RideRequest";
import type { TripDoc } from "@/models/Trip";
import type { RoleRequestDoc } from "@/models/RoleRequest";

export type Collections = {
  users: Collection<UserDoc>;
  sessions: Collection<SessionDoc>;
  vehicles: Collection<VehicleDoc>;
  rideRequests: Collection<RideRequestDoc>;
  trips: Collection<TripDoc>;
  roleRequests: Collection<RoleRequestDoc>;
};

export function collections(db: Db): Collections {
  return {
    users: db.collection<UserDoc>("users"),
    sessions: db.collection<SessionDoc>("sessions"),
    vehicles: db.collection<VehicleDoc>("vehicles"),
    rideRequests: db.collection<RideRequestDoc>("rideRequests"),
    trips: db.collection<TripDoc>("trips"),
    roleRequests: db.collection<RoleRequestDoc>("roleRequests"),
  };
}

/**
 * Idempotent: creates collections, indexes and the single Toto document.
 * Collections are created up front because MongoDB cannot create a collection
 * implicitly inside a multi-document transaction on every server version.
 */
export async function ensureDatabase(db: Db): Promise<void> {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const name of ["users", "sessions", "vehicles", "rideRequests", "trips", "roleRequests"]) {
    if (!existing.has(name)) {
      await db.createCollection(name).catch((err: { code?: number }) => {
        if (err?.code !== 48) throw err; // 48 = NamespaceExists (created concurrently)
      });
    }
  }

  const c = collections(db);

  await Promise.all([
    c.users.createIndexes([
      { key: { email: 1 }, name: "email_unique", unique: true },
      { key: { nameKey: 1 }, name: "nameKey" },
    ]),

    c.sessions.createIndexes([
      // TTL: MongoDB deletes the session once expiresAt passes.
      { key: { expiresAt: 1 }, name: "expiresAt_ttl", expireAfterSeconds: 0 },
      { key: { userId: 1 }, name: "userId" },
    ]),

    c.rideRequests.createIndexes([
      // "My requests", newest first.
      { key: { requesterId: 1, scheduledAt: -1 }, name: "requester_scheduledAt" },
      // Rider's queue + cascading clashes: PENDING requests in a time window.
      { key: { status: 1, scheduledAt: 1, endsAt: 1 }, name: "status_window" },
      { key: { "passengers.nameKey": 1 }, name: "passenger_nameKey" },
      { key: { tripId: 1 }, name: "tripId" },
    ]),

    c.trips.createIndexes([
      // Overlap detection: active trips of the vehicle whose window intersects.
      { key: { vehicleId: 1, status: 1, scheduledAt: 1, endsAt: 1 }, name: "vehicle_status_window" },
      // Rider history / dashboards.
      { key: { riderId: 1, scheduledAt: -1 }, name: "rider_scheduledAt" },
      { key: { status: 1, scheduledAt: 1 }, name: "status_scheduledAt" },
      // Person history: "which trips included this person?"
      { key: { "passengers.nameKey": 1, scheduledAt: -1 }, name: "passenger_nameKey_scheduledAt" },
      { key: { "passengers.userId": 1, scheduledAt: -1 }, name: "passenger_userId_scheduledAt" },
      // One trip per request, ever.
      { key: { requestId: 1 }, name: "requestId_unique", unique: true },
      // Hard database guarantee: the Toto can be physically on only one trip at a time.
      {
        key: { vehicleId: 1 },
        name: "one_in_progress_trip_per_vehicle",
        unique: true,
        partialFilterExpression: { status: "IN_PROGRESS" },
      },
    ]),

    c.roleRequests.createIndexes([
      { key: { userId: 1, status: 1 }, name: "userId_status" },
      { key: { status: 1, createdAt: -1 }, name: "status_createdAt" },
    ]),
  ]);

  await c.vehicles.updateOne(
    { _id: config.vehicleId },
    {
      $setOnInsert: {
        _id: config.vehicleId,
        name: "Lawazia Toto",
        status: "AVAILABLE",
        currentTripId: null,
        lockVersion: 0,
        lastLockedAt: null,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}
