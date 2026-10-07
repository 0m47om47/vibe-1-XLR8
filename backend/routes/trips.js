const express = require("express");
const { ok, asyncRoute, readJsonObject, parseObjectId } = require("../lib/http");
const { requireAuth, requireRider } = require("../lib/auth");
const { parseEnum, parseLimit, validateBoardingUpdate } = require("../lib/validation");
const { TRIP_STATUSES } = require("../models/Trip");
const { getTrip, listRiderTrips, getCurrentTrip, startTrip, updatePassengerBoarding, completeTrip } = require("../services/tripService");

const router = express.Router();

/** GET /api/trips?status=ACCEPTED&upcoming=true&limit=50 — trips operated by the logged-in rider. */
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const rider = await requireRider(req);
    const q = req.query;
    const trips = await listRiderTrips(rider, {
      status: parseEnum(q.status, TRIP_STATUSES, "status"),
      upcomingOnly: q.upcoming === "true",
      limit: parseLimit(q.limit),
    });
    ok(res, { trips });
  }),
);

/** GET /api/trips/current — the rider's in-progress trip, else the next accepted one; plus Toto status. */
router.get(
  "/current",
  asyncRoute(async (req, res) => {
    const rider = await requireRider(req);
    ok(res, await getCurrentTrip(rider));
  }),
);

/** GET /api/trips/:id — trip details with every passenger's boarding status. */
router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const user = await requireAuth(req);
    const id = parseObjectId(req.params.id, "Trip");
    ok(res, { trip: await getTrip(user, id) });
  }),
);

/** POST /api/trips/:id/start — ACCEPTED → IN_PROGRESS (pickup begins). */
router.post(
  "/:id/start",
  asyncRoute(async (req, res) => {
    const rider = await requireRider(req);
    const id = parseObjectId(req.params.id, "Trip");
    ok(res, { trip: await startTrip(rider, id) });
  }),
);

/** POST /api/trips/:id/complete — IN_PROGRESS → COMPLETED once every passenger is BOARDED or MISSED. */
router.post(
  "/:id/complete",
  asyncRoute(async (req, res) => {
    const rider = await requireRider(req);
    const id = parseObjectId(req.params.id, "Trip");
    ok(res, { trip: await completeTrip(rider, id) });
  }),
);

/** PATCH /api/trips/:id/passengers/:passengerId  body: { "boardingStatus": "BOARDED" | "MISSED" } */
router.patch(
  "/:id/passengers/:passengerId",
  asyncRoute(async (req, res) => {
    const rider = await requireRider(req);
    const tripId = parseObjectId(req.params.id, "Trip");
    const pid = parseObjectId(req.params.passengerId, "Passenger");
    const status = validateBoardingUpdate(readJsonObject(req));
    ok(res, { trip: await updatePassengerBoarding(rider, tripId, pid, status) });
  }),
);

module.exports = router;
