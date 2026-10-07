const { config } = require("./config");
const { getMongoClient } = require("./mongodb");
const { db } = require("./db");

/**
 * CONCURRENCY STRATEGY — how two riders can never both reserve the single Toto
 * =============================================================================
 *
 * The problem: "accept request A" and "accept request B" (both 10:00) arrive at
 * the same moment. A naive `if (no overlapping trip) insert trip` lets both
 * requests read "no overlap" before either inserts → double booking.
 *
 * MongoDB transactions alone do NOT fix this. They run under snapshot
 * isolation: both transactions read a snapshot without the other's trip, each
 * inserts a *different* document, neither touches what the other wrote, so both
 * commit. That anomaly is called "write skew".
 *
 * The fix: every operation that can create, start, cancel or finish a booking
 * runs in a transaction that FIRST writes to one shared document — the Toto's
 * own document in `vehicles` (`$inc: { lockVersion: 1 }`). MongoDB allows only
 * one in-flight transaction to modify a given document:
 *
 *   1. Tx A increments the Toto document  → A now holds its write lock.
 *   2. Tx B tries to increment it         → WriteConflict (TransientTransactionError).
 *   3. A re-checks overlaps against the database, inserts its trip, commits.
 *   4. The driver's withTransaction() retries B from the start with a fresh
 *      snapshot. B takes the lock, re-runs the overlap query, now SEES A's trip,
 *      marks its own request CLASHED and the API answers 409 CONFLICT.
 *
 * So all reservation logic for the Toto is serialised by the database itself,
 * across any number of server instances, and the availability check always
 * runs immediately before the write, on data no one else can change until
 * commit. (A second, independent database guarantee — a partial unique index —
 * ensures at most one trip per vehicle is ever IN_PROGRESS; see dbSetup.js.)
 *
 * Requirement: MongoDB must be a replica set (all Atlas clusters, including the
 * free M0 tier, are). Standalone mongod does not support transactions.
 *
 * NOTE: withTransaction may run `work` more than once, so `work` must only do
 * database writes through `session` and return a value — no other side effects.
 */
async function withTotoReservation(work) {
  const client = await getMongoClient();
  const { vehicles } = await db(); // also guarantees the Toto document exists

  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(
      async () => {
        // Step 1: take the Toto lock (see explanation above).
        const lock = await vehicles.updateOne(
          { _id: config.vehicleId },
          { $inc: { lockVersion: 1 }, $set: { lastLockedAt: new Date() } },
          { session },
        );
        if (lock.matchedCount !== 1) throw new Error(`Vehicle document ${config.vehicleId} is missing`);

        // Step 2: re-check + write, all inside the same transaction.
        result = await work(session);
      },
      {
        readPreference: "primary",
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      },
    );
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTotoReservation };
