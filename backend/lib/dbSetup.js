const { config } = require("./config");

/** Typed-in-spirit collection accessors — same names as the Mongoose-free driver layer. */
function collections(db) {
  return {
    users: db.collection("users"),
    sessions: db.collection("sessions"),
    vehicles: db.collection("vehicles"),
    rideRequests: db.collection("rideRequests"),
    trips: db.collection("trips"),
    roleRequests: db.collection("roleRequests"),
  };
}

/**
 * Idempotent: creates collections, indexes and the single Toto document.
 * Collections are created up front because MongoDB cannot create a collection
 * implicitly inside a multi-document transaction on every server version.
 */
async function ensureDatabase(db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const name of ["users", "sessions", "vehicles", "rideRequests", "trips", "roleRequests"]) {
    if (!existing.has(name)) {
      await db.createCollection(name).catch((err) => {
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

module.exports = { collections, ensureDatabase };
