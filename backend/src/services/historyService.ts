import type { Document, Filter, ObjectId } from "mongodb";
import type { CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest } from "@/lib/errors";
import { cleanName, nameKey } from "@/lib/validation";
import { summariseBoarding, type BoardingStatus, type BoardingSummary, type TripDoc, type TripStatus } from "@/models/Trip";
import type { Location } from "@/models/RideRequest";

/**
 * Both histories are read from the `trips` collection — the record of what the
 * Toto actually did — never from ride requests. A passenger who was requested
 * but did not board still has a trip entry with boardingStatus MISSED.
 */

export type PersonHistoryEntry = {
  tripId: string;
  requestId: string;
  passengerId: string;
  passengerName: string;
  from: Location;
  to: Location;
  scheduledAt: string;
  boardingStatus: BoardingStatus;
  boardedAt: string | null;
  tripStatus: TripStatus;
  completedAt: string | null;
  riderName: string;
  requesterName: string;
};

export type PersonHistory = {
  person: string;
  summary: BoardingSummary;
  entries: PersonHistoryEntry[];
};

/**
 * "What trips included this person?"
 * - Student/employee: their own history — passenger entries linked to their
 *   account or carrying their (case-insensitive) name.
 * - Rider: any passenger name (`?name=`), limited to trips that rider handled.
 */
export async function getPersonHistory(
  user: CurrentUser,
  opts: { name?: string; limit: number },
): Promise<PersonHistory> {
  const { trips } = await db();

  let tripFilter: Filter<TripDoc>;
  let passengerMatch: Document;
  let person: string;

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
    .aggregate<{
      _id: ObjectId;
      passengers: TripDoc["passengers"][number];
      from: Location;
      to: Location;
      scheduledAt: Date;
      status: TripStatus;
      completedAt: Date | null;
      riderName: string;
    }>([
      { $match: tripFilter },
      { $sort: { scheduledAt: -1 } },
      { $unwind: "$passengers" },
      { $match: passengerMatch },
      { $limit: opts.limit },
      {
        $project: {
          passengers: 1,
          from: 1,
          to: 1,
          scheduledAt: 1,
          status: 1,
          completedAt: 1,
          riderName: 1,
        },
      },
    ])
    .toArray();

  const entries: PersonHistoryEntry[] = rows.map((r) => ({
    tripId: r._id.toHexString(),
    // On a shared run, the request this passenger was booked through.
    requestId: r.passengers.requestId.toHexString(),
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
    requesterName: r.passengers.requesterName,
  }));

  return {
    person,
    summary: summariseBoarding(entries.map((e) => ({ boardingStatus: e.boardingStatus }))),
    entries,
  };
}

export type RiderHistoryEntry = {
  tripId: string;
  /** Requests sharing this run. */
  requests: { requestId: string; requesterName: string; passengerCount: number }[];
  from: Location;
  to: Location;
  scheduledAt: string;
  arriveAt: string;
  status: TripStatus;
  passengers: { id: string; name: string; requesterName: string; boardingStatus: BoardingStatus }[];
  boarding: BoardingSummary;
  startedAt: string | null;
  completedAt: string | null;
};

export type RiderHistory = {
  totals: { trips: number; completed: number; passengers: number; boarded: number; missed: number };
  entries: RiderHistoryEntry[];
};

/** "What trips did this rider operate?" — every trip assigned to the rider, newest first. */
export async function getRiderHistory(
  rider: CurrentUser,
  opts: { status?: TripStatus; limit: number },
): Promise<RiderHistory> {
  const { trips } = await db();
  const filter: Filter<TripDoc> = { riderId: rider._id };
  if (opts.status) filter.status = opts.status;

  const [docs, totalsRows] = await Promise.all([
    trips.find(filter, { sort: { scheduledAt: -1 }, limit: opts.limit }).toArray(),
    trips
      .aggregate<{ trips: number; completed: number; passengers: number; boarded: number; missed: number }>([
        { $match: { riderId: rider._id } },
        {
          $group: {
            _id: null,
            trips: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
            passengers: { $sum: { $size: "$passengers" } },
            boarded: {
              $sum: {
                $size: { $filter: { input: "$passengers", cond: { $eq: ["$$this.boardingStatus", "BOARDED"] } } },
              },
            },
            missed: {
              $sum: {
                $size: { $filter: { input: "$passengers", cond: { $eq: ["$$this.boardingStatus", "MISSED"] } } },
              },
            },
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
      requests: t.requests.map((r) => ({
        requestId: r.requestId.toHexString(),
        requesterName: r.requesterName,
        passengerCount: r.passengerCount,
      })),
      from: t.from,
      to: t.to,
      scheduledAt: t.scheduledAt.toISOString(),
      arriveAt: t.endsAt.toISOString(),
      status: t.status,
      passengers: t.passengers.map((p) => ({
        id: p._id.toHexString(),
        name: p.name,
        requesterName: p.requesterName,
        boardingStatus: p.boardingStatus,
      })),
      boarding: summariseBoarding(t.passengers),
      startedAt: t.startedAt?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
    })),
  };
}
