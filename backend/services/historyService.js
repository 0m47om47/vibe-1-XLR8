const { db } = require("../lib/db");
const { badRequest } = require("../lib/errors");
const { cleanName, nameKey } = require("../lib/validation");
const { summariseBoarding } = require("../models/Trip");

/**
 * Both histories are read from the `trips` collection — the record of what the
 * Toto actually did — never from ride requests. A passenger who was requested
 * but did not board still has a trip entry with boardingStatus MISSED.
 */

/**
 * "What trips included this person?"
 * - Student/employee: their own history — passenger entries linked to their
 *   account or carrying their (case-insensitive) name.
 * - Rider: any passenger name (`?name=`), limited to trips that rider handled.
 */
async function getPersonHistory(user, opts) {
  const { trips } = await db();

  let tripFilter;
  let passengerMatch;
  let person;

  if (user.role === "RIDER") {
    const name = opts.name ? cleanName(opts.name) : "";
    if (!name || name.length > 60) throw badRequest("Provide a passenger name with ?name=");
    const key = nameKey(name);
    tripFilter = { riderId: user._id, "passengers.nameKey": key };
    passengerMatch = { "passengers.nameKey": key };
    person = name;
  } else {
    if (opts.name && nameKey(opts.name) !== user.nameKey) {
      throw badRequest("You can only view your own ride history");
    }
    const mine = [{ "passengers.userId": user._id }, { "passengers.nameKey": user.nameKey }];
    tripFilter = { $or: mine };
    passengerMatch = { $or: mine };
    person = user.name;
  }

  const rows = await trips
    .aggregate([
      { $match: tripFilter },
      { $sort: { scheduledAt: -1 } },
      { $unwind: "$passengers" },
      { $match: passengerMatch },
      { $limit: opts.limit },
      {
        $project: {
          requestId: 1,
          passengers: 1,
          from: 1,
          to: 1,
          scheduledAt: 1,
          status: 1,
          completedAt: 1,
          riderName: 1,
          requesterName: 1,
        },
      },
    ])
    .toArray();

  const entries = rows.map((r) => ({
    tripId: r._id.toHexString(),
    requestId: r.requestId.toHexString(),
    passengerId: r.passengers._id.toHexString(),
    passengerName: r.passengers.name,
    from: r.from,
    to: r.to,
    scheduledAt: r.scheduledAt.toISOString(),
    boardingStatus: r.passengers.boardingStatus,
    boardedAt: r.passengers.boardedAt?.toISOString() ?? null,
    tripStatus: r.status,
    completedAt: r.completedAt?.toISOString() ?? null,
    riderName: r.riderName,
    requesterName: r.requesterName,
  }));

  return {
    person,
    summary: summariseBoarding(entries.map((e) => ({ boardingStatus: e.boardingStatus }))),
    entries,
  };
}

/** "What trips did this rider operate?" — every trip assigned to the rider, newest first. */
async function getRiderHistory(rider, opts) {
  const { trips } = await db();
  const filter = { riderId: rider._id };
  if (opts.status) filter.status = opts.status;

  const [docs, totalsRows] = await Promise.all([
    trips.find(filter, { sort: { scheduledAt: -1 }, limit: opts.limit }).toArray(),
    trips
      .aggregate([
        { $match: { riderId: rider._id } },
        {
          $group: {
            _id: null,
            trips: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
            passengers: { $sum: { $size: "$passengers" } },
            boarded: { $sum: { $size: { $filter: { input: "$passengers", cond: { $eq: ["$$this.boardingStatus", "BOARDED"] } } } } },
            missed: { $sum: { $size: { $filter: { input: "$passengers", cond: { $eq: ["$$this.boardingStatus", "MISSED"] } } } } },
          },
        },
        { $project: { _id: 0 } },
      ])
      .toArray(),
  ]);

  return {
    totals: totalsRows[0] ?? { trips: 0, completed: 0, passengers: 0, boarded: 0, missed: 0 },
    entries: docs.map((t) => ({
      tripId: t._id.toHexString(),
      requestId: t.requestId.toHexString(),
      from: t.from,
      to: t.to,
      scheduledAt: t.scheduledAt.toISOString(),
      status: t.status,
      requesterName: t.requesterName,
      passengers: t.passengers.map((p) => ({ id: p._id.toHexString(), name: p.name, boardingStatus: p.boardingStatus })),
      boarding: summariseBoarding(t.passengers),
      startedAt: t.startedAt?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
    })),
  };
}

module.exports = { getPersonHistory, getRiderHistory };
