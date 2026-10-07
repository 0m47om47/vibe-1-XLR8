const { config } = require("../lib/config");
const { db } = require("../lib/db");
const { REQUEST_STATUSES, toRequestDTO } = require("../models/RideRequest");
const { summariseBoarding, toTripDTO } = require("../models/Trip");
const { toVehicleDTO } = require("../models/Vehicle");
const { getPersonHistory } = require("./historyService");

async function getPassengerDashboard(user) {
  const { rideRequests, trips } = await db();
  const now = new Date();

  const [upcoming, countRows, pending, accepted, history] = await Promise.all([
    rideRequests.findOne(
      { requesterId: user._id, $or: [{ status: "IN_PROGRESS" }, { status: "ACCEPTED", endsAt: { $gt: now } }] },
      { sort: { scheduledAt: 1 } },
    ),
    rideRequests
      .aggregate([{ $match: { requesterId: user._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }])
      .toArray(),
    rideRequests.find({ requesterId: user._id, status: "PENDING" }, { sort: { scheduledAt: 1 }, limit: 5 }).toArray(),
    rideRequests
      .find({ requesterId: user._id, status: "ACCEPTED", endsAt: { $gt: now } }, { sort: { scheduledAt: 1 }, limit: 5 })
      .toArray(),
    getPersonHistory(user, { limit: 5 }),
  ]);

  const counts = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0]));
  for (const row of countRows) counts[row._id] = row.n;

  const upcomingTrip = upcoming?.tripId ? await trips.findOne({ _id: upcoming.tripId }) : null;

  return {
    role: user.role,
    upcomingRide: upcoming
      ? { request: toRequestDTO(upcoming, now), trip: upcomingTrip ? toTripDTO(upcomingTrip) : null }
      : null,
    counts,
    pendingRequests: pending.map((r) => toRequestDTO(r, now)),
    acceptedRequests: accepted.map((r) => toRequestDTO(r, now)),
    recentHistory: history.entries,
  };
}

/** `dayStart` is the start of "today" in the viewer's timezone (defaults to server midnight). */
async function getRiderDashboard(rider, dayStart) {
  const { rideRequests, trips, vehicles } = await db();
  const now = new Date();
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [vehicle, inProgress, accepted, pending, pendingCount, todayCompleted, completedTotal] = await Promise.all([
    vehicles.findOne({ _id: config.vehicleId }),
    trips.findOne({ riderId: rider._id, status: "IN_PROGRESS" }),
    trips.find({ riderId: rider._id, status: "ACCEPTED" }, { sort: { scheduledAt: 1 }, limit: 11 }).toArray(),
    rideRequests.find({ status: "PENDING", scheduledAt: { $gt: now } }, { sort: { scheduledAt: 1 }, limit: 10 }).toArray(),
    rideRequests.countDocuments({ status: "PENDING", scheduledAt: { $gt: now } }),
    trips
      .find({ riderId: rider._id, status: "COMPLETED", completedAt: { $gte: dayStart, $lt: dayEnd } }, { projection: { passengers: 1 } })
      .toArray(),
    trips.countDocuments({ riderId: rider._id, status: "COMPLETED" }),
  ]);

  const busy = Boolean(inProgress);
  const acceptedDTOs = accepted.map((t) => toTripDTO(t, { anotherTripInProgress: busy }));
  // Current = in progress, else the earliest accepted trip; next = the one after it.
  const currentTrip = inProgress ? toTripDTO(inProgress) : acceptedDTOs[0] ?? null;
  const remaining = inProgress ? acceptedDTOs : acceptedDTOs.slice(1);

  const todaySummary = summariseBoarding(todayCompleted.flatMap((t) => t.passengers));

  return {
    role: "RIDER",
    vehicle: toVehicleDTO(vehicle),
    currentTrip,
    nextTrip: remaining[0] ?? null,
    pendingRequests: pending.map((r) => toRequestDTO(r, now)),
    pendingCount,
    upcomingTrips: remaining.slice(0, 10),
    today: {
      completedTrips: todayCompleted.length,
      passengersBoarded: todaySummary.boarded,
      passengersMissed: todaySummary.missed,
    },
    completedTotal,
  };
}

module.exports = { getPassengerDashboard, getRiderDashboard };
