const { ObjectId } = require("mongodb");
const { config } = require("../lib/config");
const { collections, ensureDatabase } = require("../lib/dbSetup");
const { hashPassword } = require("../lib/password");
const { tripWindow } = require("../lib/clashDetection");
const { nameKey } = require("../lib/validation");

const DEMO_PASSWORD = "password123";

const DEMO_USERS = [
  { name: "Ravi Kumar", email: "rider@lawazia.test", role: "RIDER" },
  { name: "Rahul", email: "rahul@lawazia.test", role: "STUDENT" },
  { name: "Priya", email: "priya@lawazia.test", role: "STUDENT" },
  { name: "Amit", email: "amit@lawazia.test", role: "EMPLOYEE" },
  { name: "Neha", email: "neha@lawazia.test", role: "EMPLOYEE" },
  { name: "Om Choubey", email: "admin@lawazia.test", role: "ADMIN" },
];

/** A local date-time `dayOffset` days from today at hh:mm (server timezone). */
function at(dayOffset, hh, mm = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/** `date`, but never later than `hoursAgo` hours before now (seeded history must be in the past). */
function notAfterNow(date, hoursAgo) {
  const latest = Date.now() - hoursAgo * 3600_000;
  return date.getTime() > latest ? new Date(latest) : date;
}

/**
 * Wipes the app's collections and inserts a demo dataset:
 *  - completed trip with BOARDED and MISSED passengers (yesterday)
 *  - an older completed trip + the request that CLASHED with it
 *  - an upcoming ACCEPTED trip + a request that CLASHED with it
 *  - a CANCELLED request and a plain PENDING request
 *  - the exact live demo: Request 1 & Request 2, both PENDING at 10:00 tomorrow
 *  - admin user + pending role requests for admin demo
 */
async function seed(db) {
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
  const users = {};
  for (const u of DEMO_USERS) {
    const doc = {
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

  function makeRequest(requester, from, to, scheduledAt, names, status, extra = {}) {
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

  function makeTrip(request, status, boarding = []) {
    const started = status === "IN_PROGRESS" || status === "COMPLETED" ? request.scheduledAt : null;
    const completed = status === "COMPLETED" ? request.endsAt : null;
    const trip = {
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
      acceptedAt: notAfterNow(new Date(request.scheduledAt.getTime() - 12 * 3600_000), 1),
      startedAt: started,
      completedAt: completed,
      cancelledAt: null,
      createdAt: notAfterNow(new Date(request.scheduledAt.getTime() - 12 * 3600_000), 1),
      updatedAt: now,
    };
    request.tripId = trip._id;
    return trip;
  }

  const requests = [];
  const trips = [];
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

  // 7. Seed role requests — Rahul wants to become Employee (PENDING), Priya's was already approved
  const roleRequests = [
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

module.exports = { seed, DEMO_PASSWORD, DEMO_USERS };
