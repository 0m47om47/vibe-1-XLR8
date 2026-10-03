import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import { ApiError, badRequest, notFound } from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth";
import { toPublicUser, type AccountStatus, type UserDoc, type UserRole } from "@/models/User";
import { toRoleRequestDTO, type RoleRequestDoc, type RoleRequestStatus } from "@/models/RoleRequest";
import { toTripDTO } from "@/models/Trip";
import { toRequestDTO } from "@/models/RideRequest";
import { config } from "@/lib/config";
import { summariseBoarding } from "@/models/Trip";

// ────────────────────────────────── Admin Dashboard Stats

export async function getAdminDashboard() {
  const { users, trips, rideRequests, vehicles, roleRequests } = await db();

  const [allUsers, allTrips, allRequests, vehicle, pendingRoleRequests] = await Promise.all([
    users.find({}, { projection: { passwordHash: 0 } }).toArray(),
    trips.find({}).sort({ scheduledAt: -1 }).limit(10).toArray(),
    rideRequests.find({}).sort({ createdAt: -1 }).limit(10).toArray(),
    vehicles.findOne({ _id: config.vehicleId }),
    roleRequests.find({ status: "PENDING" }).sort({ createdAt: -1 }).limit(5).toArray(),
  ]);

  const userCounts = {
    total: allUsers.length,
    students: allUsers.filter((u) => u.role === "STUDENT").length,
    employees: allUsers.filter((u) => u.role === "EMPLOYEE").length,
    riders: allUsers.filter((u) => u.role === "RIDER").length,
    admins: allUsers.filter((u) => u.role === "ADMIN").length,
  };

  const allTripsFromDb = await trips.find({}).toArray();
  const tripCounts = {
    total: allTripsFromDb.length,
    completed: allTripsFromDb.filter((t) => t.status === "COMPLETED").length,
    clashed: (await rideRequests.countDocuments({ status: "CLASHED" })),
    pendingRequests: await rideRequests.countDocuments({ status: "PENDING" }),
  };

  // Current trip if vehicle is ON_TRIP
  let currentTrip = null;
  if (vehicle?.status === "ON_TRIP" && vehicle.currentTripId) {
    const trip = await trips.findOne({ _id: vehicle.currentTripId });
    if (trip) currentTrip = toTripDTO(trip);
  }

  const recentTrips = allTrips.map((t) => toTripDTO(t));
  const recentRoleRequests = pendingRoleRequests.map((r) => toRoleRequestDTO(r));

  return {
    userCounts,
    tripCounts,
    vehicle: vehicle ? { status: vehicle.status, currentTripId: vehicle.currentTripId?.toHexString() ?? null } : null,
    currentTrip,
    recentTrips,
    recentRoleRequests,
  };
}

// ────────────────────────────────── User Management

export async function getAdminUsers(filters: {
  search?: string;
  role?: UserRole;
  accountStatus?: AccountStatus;
}) {
  const { users, trips } = await db();
  const query: Record<string, unknown> = {};

  if (filters.role) query.role = filters.role;
  if (filters.accountStatus) query.accountStatus = filters.accountStatus;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { email: { $regex: filters.search, $options: "i" } },
    ];
  }

  const userDocs = await users.find(query, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();

  // Count trips per user
  const userTrips = await Promise.all(
    userDocs.map(async (u) => {
      const tripCount = await trips.countDocuments({
        $or: [
          { "passengers.userId": u._id },
          { riderId: u._id },
        ],
      });
      return { user: toPublicUser(u), tripCount };
    }),
  );

  return userTrips;
}

export async function getAdminUserDetail(userId: string) {
  const { users, trips, roleRequests } = await db();
  const oid = new ObjectId(userId);
  const user = await users.findOne({ _id: oid }, { projection: { passwordHash: 0 } });
  if (!user) throw notFound("User");

  const userTrips = await trips.find({
    $or: [
      { "passengers.userId": oid },
      { riderId: oid },
    ],
  }).sort({ scheduledAt: -1 }).toArray();

  const pendingRoleRequest = await roleRequests.findOne({ userId: oid, status: "PENDING" });

  // Calculate stats
  let totalTrips = 0;
  let boardedTrips = 0;
  let missedTrips = 0;
  for (const trip of userTrips) {
    if (user.role === "RIDER" && trip.riderId.equals(oid)) {
      totalTrips++;
    } else {
      const passenger = trip.passengers.find((p) => p.userId?.equals(oid));
      if (passenger) {
        totalTrips++;
        if (passenger.boardingStatus === "BOARDED") boardedTrips++;
        if (passenger.boardingStatus === "MISSED") missedTrips++;
      }
    }
  }

  return {
    user: toPublicUser(user),
    stats: { totalTrips, boardedTrips, missedTrips },
    trips: userTrips.map((t) => toTripDTO(t)),
    pendingRoleRequest: pendingRoleRequest ? toRoleRequestDTO(pendingRoleRequest) : null,
  };
}

export async function changeUserRole(userId: string, newRole: UserRole, admin: CurrentUser) {
  const { users } = await db();
  const oid = new ObjectId(userId);
  const result = await users.findOneAndUpdate(
    { _id: oid },
    { $set: { role: newRole, updatedAt: new Date() } },
    { returnDocument: "after", projection: { passwordHash: 0 } },
  );
  if (!result) throw notFound("User");
  return toPublicUser(result);
}

export async function changeUserStatus(userId: string, newStatus: AccountStatus) {
  const { users } = await db();
  const oid = new ObjectId(userId);
  const result = await users.findOneAndUpdate(
    { _id: oid },
    { $set: { accountStatus: newStatus, updatedAt: new Date() } },
    { returnDocument: "after", projection: { passwordHash: 0 } },
  );
  if (!result) throw notFound("User");
  return toPublicUser(result);
}

// ────────────────────────────────── Role Requests

export async function getRoleRequests(status?: RoleRequestStatus) {
  const { roleRequests } = await db();
  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  const docs = await roleRequests.find(query).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => toRoleRequestDTO(d));
}

export async function createRoleRequest(user: CurrentUser, requestedRole: UserRole, reason?: string) {
  const { roleRequests } = await db();

  // Check for existing pending request
  const existing = await roleRequests.findOne({ userId: user._id, status: "PENDING" });
  if (existing) throw new ApiError(409, "CONFLICT", "You already have a pending role request.");

  if (user.role === requestedRole) throw badRequest("You already have this role.");

  const now = new Date();
  const doc: RoleRequestDoc = {
    _id: new ObjectId(),
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    currentRole: user.role,
    requestedRole,
    reason: reason?.trim() || null,
    status: "PENDING",
    reviewedBy: null,
    reviewerName: null,
    rejectionReason: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await roleRequests.insertOne(doc);
  return toRoleRequestDTO(doc);
}

export async function approveRoleRequest(requestId: string, admin: CurrentUser) {
  const { roleRequests, users } = await db();
  const oid = new ObjectId(requestId);
  const now = new Date();

  const request = await roleRequests.findOne({ _id: oid });
  if (!request) throw notFound("Role request");
  if (request.status !== "PENDING") throw badRequest("This request has already been reviewed.");

  // Update request
  await roleRequests.updateOne({ _id: oid }, {
    $set: {
      status: "APPROVED",
      reviewedBy: admin._id,
      reviewerName: admin.name,
      reviewedAt: now,
      updatedAt: now,
    },
  });

  // Update user role
  await users.updateOne({ _id: request.userId }, {
    $set: { role: request.requestedRole, updatedAt: now },
  });

  return toRoleRequestDTO({
    ...request,
    status: "APPROVED",
    reviewedBy: admin._id,
    reviewerName: admin.name,
    reviewedAt: now,
    updatedAt: now,
  });
}

export async function rejectRoleRequest(requestId: string, admin: CurrentUser, rejectionReason?: string) {
  const { roleRequests } = await db();
  const oid = new ObjectId(requestId);
  const now = new Date();

  const request = await roleRequests.findOne({ _id: oid });
  if (!request) throw notFound("Role request");
  if (request.status !== "PENDING") throw badRequest("This request has already been reviewed.");

  await roleRequests.updateOne({ _id: oid }, {
    $set: {
      status: "REJECTED",
      reviewedBy: admin._id,
      reviewerName: admin.name,
      rejectionReason: rejectionReason?.trim() || null,
      reviewedAt: now,
      updatedAt: now,
    },
  });

  return toRoleRequestDTO({
    ...request,
    status: "REJECTED",
    reviewedBy: admin._id,
    reviewerName: admin.name,
    rejectionReason: rejectionReason?.trim() || null,
    reviewedAt: now,
    updatedAt: now,
  });
}

// ────────────────────────────────── Admin Trips

export async function getAdminTrips(filters: {
  status?: string;
  riderId?: string;
}) {
  const { trips } = await db();
  const query: Record<string, unknown> = {};

  if (filters.status) query.status = filters.status;
  if (filters.riderId) query.riderId = new ObjectId(filters.riderId);

  const allTrips = await trips.find(query).sort({ scheduledAt: -1 }).toArray();
  return allTrips.map((t) => toTripDTO(t));
}

export async function getAdminTripDetail(tripId: string) {
  const { trips } = await db();
  const oid = new ObjectId(tripId);
  const trip = await trips.findOne({ _id: oid });
  if (!trip) throw notFound("Trip");
  return toTripDTO(trip);
}

// ────────────────────────────────── Rider Management

export async function getAdminRiders() {
  const { users, trips } = await db();
  const riders = await users.find({ role: "RIDER" }, { projection: { passwordHash: 0 } }).toArray();

  const riderData = await Promise.all(
    riders.map(async (rider) => {
      const riderTrips = await trips.find({ riderId: rider._id }).toArray();
      const completedTrips = riderTrips.filter((t) => t.status === "COMPLETED");
      let totalPassengers = 0;
      let boardedPassengers = 0;
      let missedPassengers = 0;
      for (const trip of completedTrips) {
        const boarding = summariseBoarding(trip.passengers);
        totalPassengers += boarding.total;
        boardedPassengers += boarding.boarded;
        missedPassengers += boarding.missed;
      }

      // Check if rider has an active trip
      const activeTrip = riderTrips.find((t) => t.status === "IN_PROGRESS" || t.status === "ACCEPTED");

      return {
        user: toPublicUser(rider),
        stats: {
          totalTrips: riderTrips.length,
          completedTrips: completedTrips.length,
          clashedTrips: riderTrips.length - completedTrips.length - riderTrips.filter((t) => t.status === "CANCELLED").length,
          totalPassengers,
          boardedPassengers,
          missedPassengers,
        },
        isAvailable: !activeTrip,
        activeTrip: activeTrip ? toTripDTO(activeTrip) : null,
      };
    }),
  );

  return riderData;
}

export async function getAdminRiderDetail(riderId: string) {
  const { users, trips } = await db();
  const oid = new ObjectId(riderId);
  const rider = await users.findOne({ _id: oid, role: "RIDER" }, { projection: { passwordHash: 0 } });
  if (!rider) throw notFound("Rider");

  const riderTrips = await trips.find({ riderId: oid }).sort({ scheduledAt: -1 }).toArray();
  const completedTrips = riderTrips.filter((t) => t.status === "COMPLETED");
  let totalPassengers = 0;
  let boardedPassengers = 0;
  let missedPassengers = 0;
  for (const trip of completedTrips) {
    const boarding = summariseBoarding(trip.passengers);
    totalPassengers += boarding.total;
    boardedPassengers += boarding.boarded;
    missedPassengers += boarding.missed;
  }

  const activeTrip = riderTrips.find((t) => t.status === "IN_PROGRESS" || t.status === "ACCEPTED");

  return {
    user: toPublicUser(rider),
    stats: {
      totalTrips: riderTrips.length,
      completedTrips: completedTrips.length,
      clashedTrips: riderTrips.length - completedTrips.length - riderTrips.filter((t) => t.status === "CANCELLED").length,
      totalPassengers,
      boardedPassengers,
      missedPassengers,
    },
    isAvailable: !activeTrip,
    activeTrip: activeTrip ? toTripDTO(activeTrip) : null,
    trips: riderTrips.map((t) => toTripDTO(t)),
  };
}

// ────────────────────────────────── Analytics

export async function getAdminAnalytics() {
  const { trips, rideRequests } = await db();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [allTrips, tripsToday, tripsThisWeek] = await Promise.all([
    trips.find({}).toArray(),
    trips.countDocuments({ scheduledAt: { $gte: startOfToday } }),
    trips.countDocuments({ scheduledAt: { $gte: startOfWeek } }),
  ]);

  // Route frequency
  const routeFreq: Record<string, number> = {};
  const hourFreq: Record<number, number> = {};
  let totalPassengers = 0;
  let totalBoarded = 0;
  let totalMissed = 0;

  for (const trip of allTrips) {
    const route = `${trip.from} → ${trip.to}`;
    routeFreq[route] = (routeFreq[route] || 0) + 1;
    const hour = trip.scheduledAt.getHours();
    hourFreq[hour] = (hourFreq[hour] || 0) + 1;
    const boarding = summariseBoarding(trip.passengers);
    totalPassengers += boarding.total;
    totalBoarded += boarding.boarded;
    totalMissed += boarding.missed;
  }

  const mostUsedRoute = Object.entries(routeFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const peakHour = Object.entries(hourFreq).sort((a, b) => b[1] - a[1])[0];
  const peakTime = peakHour ? `${String(Number(peakHour[0])).padStart(2, "0")}:00` : "N/A";

  return {
    tripsToday,
    tripsThisWeek,
    totalPassengers,
    totalBoarded,
    totalMissed,
    boardedRate: totalPassengers > 0 ? Math.round((totalBoarded / totalPassengers) * 100) : 0,
    mostUsedRoute,
    peakTime,
  };
}
