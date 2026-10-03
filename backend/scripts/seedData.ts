import { ObjectId, type Db } from "mongodb";
import { config } from "../src/lib/config";
import { collections, ensureDatabase } from "../src/lib/dbSetup";
import { hashPassword } from "../src/lib/password";
import { tripWindow } from "../src/lib/clashDetection";
import { nameKey } from "../src/lib/validation";
import type { UserDoc, UserRole } from "../src/models/User";
import type { Location, RequestStatus, RideRequestDoc } from "../src/models/RideRequest";
import type { BoardingStatus, TripDoc, TripStatus } from "../src/models/Trip";

export const DEMO_PASSWORD = "password123";

export const DEMO_USERS: { name: string; email: string; role: UserRole }[] = [
  { name: "Ravi Kumar", email: "rider@lawazia.test", role: "RIDER" },
  { name: "Rahul", email: "rahul@lawazia.test", role: "STUDENT" },
  { name: "Priya", email: "priya@lawazia.test", role: "STUDENT" },
  { name: "Amit", email: "amit@lawazia.test", role: "EMPLOYEE" },
  { name: "Neha", email: "neha@lawazia.test", role: "EMPLOYEE" },
];

/** A local date-time `dayOffset` days from today at hh:mm (server timezone). */
function at(dayOffset: number, hh: number, mm = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/**
 * Wipes the app's collections and inserts a demo dataset:
 *  - completed trip with BOARDED and MISSED passengers (yesterday)
 *  - an older completed trip + the request that CLASHED with it
 *  - an upcoming ACCEPTED trip + a request that CLASHED with it
 *  - a CANCELLED request and a plain PENDING request
 *  - the exact live demo: Request 1 & Request 2, both PENDING at 10:00 tomorrow
 */
export async function seed(db: Db): Promise<{ users: Record<string, UserDoc> }> {
  const c = collections(db);
  await Promise.all([
    c.users.deleteMany({}),
    c.sessions.deleteMany({}),
    c.rideRequests.deleteMany({}),
    c.trips.deleteMany({}),
    c.vehicles.deleteMany({}),
  ]);
  await ensureDatabase(db);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = new Date();
  const users: Record<string, UserDoc> = {};
  for (const u of DEMO_USERS) {
    const doc: UserDoc = {
      _id: new ObjectId(),
      name: u.name,
      nameKey: nameKey(u.name),
      email: u.email,
      passwordHash,
      role: u.role,
      createdAt: now,
      updatedAt: now,
    };
    users[u.name.split(" ")[0].toLowerCase()] = doc;
  }
  await c.users.insertMany(Object.values(users));
  const rider = users.ravi;

  const userByKey = new Map(Object.values(users).map((u) => [u.nameKey, u]));

  function makeRequest(
    requester: UserDoc,
    from: Location,
    to: Location,
    scheduledAt: Date,
    names: string[],
    status: RequestStatus,
    extra: Partial<RideRequestDoc> = {},
  ): RideRequestDoc {
    const w = tripWindow(scheduledAt);
    return {
      _id: new ObjectId(),
      requesterId: requester._id,
      requesterName: requester.name,
      requesterRole: requester.role,
      from,
      to,
      scheduledAt: w.start,
      endsAt: w.end,
      estimatedDurationMinutes: config.tripDurationMinutes,
      passengers: names.map((name) => ({
        _id: new ObjectId(),
        name,
        nameKey: nameKey(name),
        userId: userByKey.get(nameKey(name))?._id ?? null,
      })),
      status,
      tripId: null,
      clashedWithTripId: null,
      statusReason: null,
      cancelledAt: null,
      createdAt: new Date(scheduledAt.getTime() - 24 * 3600_000),
      updatedAt: now,
      ...extra,
    };
  }

  function makeTrip(request: RideRequestDoc, status: TripStatus, boarding: BoardingStatus[] = []): TripDoc {
    const started = status === "IN_PROGRESS" || status === "COMPLETED" ? request.scheduledAt : null;
    const completed = status === "COMPLETED" ? request.endsAt : null;
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
      passengers: request.passengers.map((p, i) => {
        const s = boarding[i] ?? "PENDING";
        return {
          ...p,
          boardingStatus: s,
          boardedAt: s === "BOARDED" ? started : null,
          statusUpdatedAt: s === "PENDING" ? null : started,
        };
      }),
      status,
      acceptedAt: new Date(request.scheduledAt.getTime() - 12 * 3600_000),
      startedAt: started,
      completedAt: completed,
      cancelledAt: null,
      createdAt: new Date(request.scheduledAt.getTime() - 12 * 3600_000),
      updatedAt: now,
    };
    request.tripId = trip._id;
    return trip;
  }

  const requests: RideRequestDoc[] = [];
  const trips: TripDoc[] = [];
  const clashReason = "Another trip was accepted for an overlapping time. The Toto can run only one trip at a time.";

  // 1. Two days ago: completed Office → College; Neha's overlapping request clashed with it.
  const r1 = makeRequest(users.amit, "Office", "College", at(-2, 17, 30), ["Amit", "Neha", "Rohit"], "COMPLETED");
  trips.push(makeTrip(r1, "COMPLETED", ["BOARDED", "BOARDED", "MISSED"]));
  const r1Clash = makeRequest(users.neha, "Office", "Station", at(-2, 17, 45), ["Neha"], "CLASHED", {
    clashedWithTripId: r1.tripId,
    statusReason: clashReason,
  });
  requests.push(r1, r1Clash);

  // 2. Yesterday: completed College → Station — Rahul & Amit BOARDED, Priya MISSED.
  const r2 = makeRequest(users.rahul, "College", "Station", at(-1, 10), ["Rahul", "Amit", "Priya"], "COMPLETED");
  trips.push(makeTrip(r2, "COMPLETED", ["BOARDED", "BOARDED", "MISSED"]));
  requests.push(r2);

  // 3. Live demo (tomorrow 10:00): both PENDING — accept one and the other becomes CLASHED.
  requests.push(
    makeRequest(users.rahul, "College", "Station", at(1, 10), ["Rahul", "Amit", "Priya"], "PENDING"),
    makeRequest(users.neha, "Office", "Station", at(1, 10), ["Neha", "Rohit"], "PENDING"),
  );

  // 4. Tomorrow 14:00: an ACCEPTED trip, and Neha's 14:15 request that clashed with it.
  const r4 = makeRequest(users.priya, "Station", "Office", at(1, 14), ["Priya"], "ACCEPTED");
  trips.push(makeTrip(r4, "ACCEPTED"));
  const r4Clash = makeRequest(users.neha, "College", "Office", at(1, 14, 15), ["Neha"], "CLASHED", {
    clashedWithTripId: r4.tripId,
    statusReason: clashReason,
  });
  requests.push(r4, r4Clash);

  // 5. Tomorrow 17:00: an ordinary PENDING request.
  requests.push(makeRequest(users.amit, "Office", "College", at(1, 17), ["Amit"], "PENDING"));

  // 6. A CANCELLED request (day after tomorrow).
  requests.push(
    makeRequest(users.priya, "College", "Office", at(2, 9), ["Priya", "Rahul"], "CANCELLED", {
      cancelledAt: now,
      statusReason: "Cancelled by requester",
    }),
  );

  await c.rideRequests.insertMany(requests);
  await c.trips.insertMany(trips);
  return { users };
}
