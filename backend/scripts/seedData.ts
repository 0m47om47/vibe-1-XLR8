import { ObjectId, type Db } from "mongodb";
import { config } from "../src/lib/config";
import { collections, ensureDatabase } from "../src/lib/dbSetup";
import { hashPassword } from "../src/lib/password";
import { tripWindow } from "../src/lib/clashDetection";
import { nameKey } from "../src/lib/validation";
import type { UserDoc, UserRole } from "../src/models/User";
import type { Location, RequestStatus, RideRequestDoc } from "../src/models/RideRequest";
import type { BoardingStatus, TripDoc, TripStatus } from "../src/models/Trip";
import type { RoleRequestDoc } from "../src/models/RoleRequest";

export const DEMO_PASSWORD = "password123";

export const DEMO_USERS: { name: string; email: string; role: UserRole }[] = [
  { name: "Ravi Kumar", email: "rider@lawazia.test", role: "RIDER" },
  { name: "Rahul", email: "rahul@lawazia.test", role: "STUDENT" },
  { name: "Priya", email: "priya@lawazia.test", role: "STUDENT" },
  { name: "Amit", email: "amit@lawazia.test", role: "EMPLOYEE" },
  { name: "Neha", email: "neha@lawazia.test", role: "EMPLOYEE" },
  { name: "Om Choubey", email: "admin@lawazia.test", role: "ADMIN" },
];

/** A local date-time `dayOffset` days from today at hh:mm (server timezone). */
function at(dayOffset: number, hh: number, mm = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/** `date`, but never later than `hoursAgo` hours before now (seeded history must be in the past). */
function notAfterNow(date: Date, hoursAgo: number): Date {
  const latest = Date.now() - hoursAgo * 3600_000;
  return date.getTime() > latest ? new Date(latest) : date;
}

/**
 * Wipes the app's collections and inserts a demo dataset:
 *  - a completed SHARED run (two requests) with BOARDED and MISSED passengers (yesterday)
 *  - an older completed run + the request that CLASHED with it
 *  - an upcoming run (14:00) with free seats, two PENDING requests that can join it,
 *    and a different-route request that CLASHED with it
 *  - a CANCELLED request and a plain PENDING request
 *  - the exact live demo: Request 1 & Request 2, both PENDING at 10:00 tomorrow
 *  - admin user + pending role requests for admin demo
 */
export async function seed(db: Db): Promise<{ users: Record<string, UserDoc> }> {
  const c = collections(db);
  await Promise.all([
    c.users.deleteMany({}),
    c.sessions.deleteMany({}),
    c.rideRequests.deleteMany({}),
    c.trips.deleteMany({}),
    c.vehicles.deleteMany({}),
    c.roleRequests.deleteMany({}),
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
      accountStatus: "ACTIVE",
      createdAt: new Date(now.getTime() - Math.random() * 30 * 86400000), // Random join date within last 30 days
      updatedAt: now,
    };
    // Use first name lowercase as key, but handle "Om Choubey" specially
    const key = u.name.includes(" ") ? u.name.split(" ")[0].toLowerCase() : u.name.toLowerCase();
    users[key] = doc;
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
      createdAt: notAfterNow(new Date(scheduledAt.getTime() - 24 * 3600_000), 2),
      updatedAt: now,
      ...extra,
    };
  }

  /** One run carrying one or more requests; `boarding[i][j]` = status of passenger j of request i. */
  function makeTrip(reqs: RideRequestDoc[], status: TripStatus, boarding: BoardingStatus[][] = []): TripDoc {
    const lead = reqs[0];
    const started = status === "IN_PROGRESS" || status === "COMPLETED" ? lead.scheduledAt : null;
    const completed = status === "COMPLETED" ? lead.endsAt : null;
    const acceptedAt = notAfterNow(new Date(lead.scheduledAt.getTime() - 12 * 3600_000), 1);
    const trip: TripDoc = {
      _id: new ObjectId(),
      vehicleId: config.vehicleId,
      requests: reqs.map((r) => ({
        requestId: r._id,
        requesterId: r.requesterId,
        requesterName: r.requesterName,
        passengerCount: r.passengers.length,
        joinedAt: acceptedAt,
      })),
      riderId: rider._id,
      riderName: rider.name,
      from: lead.from,
      to: lead.to,
      scheduledAt: lead.scheduledAt,
      endsAt: lead.endsAt,
      estimatedDurationMinutes: lead.estimatedDurationMinutes,
      capacity: config.totoCapacity,
      passengers: reqs.flatMap((r, i) =>
        r.passengers.map((p, j) => {
          const s = boarding[i]?.[j] ?? "PENDING";
          return {
            ...p,
            requestId: r._id,
            requesterName: r.requesterName,
            boardingStatus: s,
            boardedAt: s === "BOARDED" ? started : null,
            statusUpdatedAt: s === "PENDING" ? null : started,
          };
        }),
      ),
      status,
      acceptedAt,
      startedAt: started,
      completedAt: completed,
      cancelledAt: null,
      createdAt: acceptedAt,
      updatedAt: now,
    };
    for (const r of reqs) r.tripId = trip._id;
    return trip;
  }

  const requests: RideRequestDoc[] = [];
  const trips: TripDoc[] = [];
  const otherRun = (from: string, to: string) =>
    `The Toto is booked for another run (${from} → ${to}) at that time. It can run only one trip at a time.`;

  // 1. Two days ago: completed Office → College; Neha's Office → Station request at the same time clashed.
  const r1 = makeRequest(users.amit, "Office", "College", at(-2, 17, 30), ["Amit", "Neha", "Rohit"], "COMPLETED");
  trips.push(makeTrip([r1], "COMPLETED", [["BOARDED", "BOARDED", "MISSED"]]));
  const r1Clash = makeRequest(users.neha, "Office", "Station", at(-2, 17, 30), ["Neha"], "CLASHED", {
    clashedWithTripId: r1.tripId,
    statusReason: otherRun("Office", "College"),
  });
  requests.push(r1, r1Clash);

  // 2. Yesterday 10:00: a SHARED College → Station run — Rahul's request (Rahul, Priya) + Amit's (Amit).
  //    Rahul & Amit BOARDED, Priya MISSED.
  const r2a = makeRequest(users.rahul, "College", "Station", at(-1, 10), ["Rahul", "Priya"], "COMPLETED");
  const r2b = makeRequest(users.amit, "College", "Station", at(-1, 10), ["Amit"], "COMPLETED");
  trips.push(makeTrip([r2a, r2b], "COMPLETED", [["BOARDED", "MISSED"], ["BOARDED"]]));
  requests.push(r2a, r2b);

  // 3. Live demo (tomorrow 10:00): different routes at the same time — accept one, the other CLASHES.
  requests.push(
    makeRequest(users.rahul, "College", "Station", at(1, 10), ["Rahul", "Amit", "Priya"], "PENDING"),
    makeRequest(users.neha, "Office", "Station", at(1, 10), ["Neha", "Rohit"], "PENDING"),
  );

  // 4. Pooling demo (tomorrow 14:00, College → Office, arrives Office ~14:15):
  //    accepted run with Priya (1/5 seats); Amit (+Kiran) and Neha can still join it;
  //    Rahul's Station → Office at 14:00 is a different run at the same time → CLASHED.
  const r4 = makeRequest(users.priya, "College", "Office", at(1, 14), ["Priya"], "ACCEPTED");
  trips.push(makeTrip([r4], "ACCEPTED"));
  requests.push(
    r4,
    makeRequest(users.amit, "College", "Office", at(1, 14), ["Amit", "Kiran"], "PENDING"),
    makeRequest(users.neha, "College", "Office", at(1, 14), ["Neha"], "PENDING"),
    makeRequest(users.rahul, "Station", "Office", at(1, 14), ["Rahul"], "CLASHED", {
      clashedWithTripId: r4.tripId,
      statusReason: otherRun("College", "Office"),
    }),
  );

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

  // 7. Seed role requests — Rahul wants to become Employee (PENDING), Priya's was already approved
  const roleRequests: RoleRequestDoc[] = [
    {
      _id: new ObjectId(),
      userId: users.rahul._id,
      userName: users.rahul.name,
      userEmail: users.rahul.email,
      currentRole: "STUDENT",
      requestedRole: "EMPLOYEE",
      reason: "Working with Lawazia as an employee.",
      status: "PENDING",
      reviewedBy: null,
      reviewerName: null,
      rejectionReason: null,
      reviewedAt: null,
      createdAt: new Date(now.getTime() - 2 * 3600_000), // 2 hours ago
      updatedAt: new Date(now.getTime() - 2 * 3600_000),
    },
    {
      _id: new ObjectId(),
      userId: users.priya._id,
      userName: users.priya.name,
      userEmail: users.priya.email,
      currentRole: "STUDENT",
      requestedRole: "EMPLOYEE",
      reason: "I am helping manage logistics at Lawazia.",
      status: "APPROVED",
      reviewedBy: users.om._id,
      reviewerName: users.om.name,
      rejectionReason: null,
      reviewedAt: new Date(now.getTime() - 24 * 3600_000),
      createdAt: new Date(now.getTime() - 48 * 3600_000),
      updatedAt: new Date(now.getTime() - 24 * 3600_000),
    },
  ];
  await c.roleRequests.insertMany(roleRequests);

  return { users };
}
