const express = require("express");
const { ok, asyncRoute, readJsonObject, parseObjectId } = require("../lib/http");
const { requireAuth, requirePassenger, requireRider } = require("../lib/auth");
const { ApiError } = require("../lib/errors");
const { parseEnum, parseLimit, validateCreateRequest } = require("../lib/validation");
const { REQUEST_STATUSES } = require("../models/RideRequest");
const {
  createRideRequest,
  listRideRequests,
  getRideRequest,
  cancelRideRequest,
  acceptRideRequest,
} = require("../services/requestService");

const router = express.Router();

/**
 * GET /api/requests?status=PENDING&upcoming=true&limit=50
 * Students/employees: their own requests. Rider: all requests (the work queue).
 */
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const user = await requireAuth(req);
    const q = req.query;
    const requests = await listRideRequests(user, {
      status: parseEnum(q.status, REQUEST_STATUSES, "status"),
      upcomingOnly: q.upcoming === "true",
      limit: parseLimit(q.limit),
    });
    ok(res, { requests });
  }),
);

/**
 * POST /api/requests — student/employee creates a ride request.
 * 201 with status PENDING, or status CLASHED if the Toto is already booked then.
 */
router.post(
  "/",
  asyncRoute(async (req, res) => {
    const user = await requirePassenger(req);
    const input = validateCreateRequest(readJsonObject(req));
    const result = await createRideRequest(user, input);
    ok(res, result, 201);
  }),
);

/** GET /api/requests/:id — request + its trip (with per-passenger boarding) if accepted. */
router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const user = await requireAuth(req);
    const id = parseObjectId(req.params.id, "Ride request");
    ok(res, await getRideRequest(user, id));
  }),
);

/** POST /api/requests/:id/cancel — requester cancels a PENDING or not-yet-started ACCEPTED request. */
router.post(
  "/:id/cancel",
  asyncRoute(async (req, res) => {
    const user = await requirePassenger(req);
    const id = parseObjectId(req.params.id, "Ride request");
    ok(res, { request: await cancelRideRequest(user, id) });
  }),
);

/**
 * POST /api/requests/:id/accept — rider reserves the Toto for this request.
 * 200 → accepted (trip created; overlapping pending requests are now CLASHED)
 * 409 → TRIP_CLASH: the Toto is already booked; this request is now CLASHED.
 * See lib/totoLock.js for why two simultaneous accepts cannot both succeed.
 */
router.post(
  "/:id/accept",
  asyncRoute(async (req, res) => {
    const rider = await requireRider(req);
    const id = parseObjectId(req.params.id, "Ride request");
    const result = await acceptRideRequest(rider, id);

    if (result.outcome === "CLASHED") {
      // The CLASHED status was committed before we report the conflict.
      throw new ApiError(409, "TRIP_CLASH", "The Toto is already booked for an overlapping time", {
        requestStatus: "CLASHED",
        request: result.request,
        conflictingTripId: result.conflictingTripId,
      });
    }
    ok(res, result);
  }),
);

module.exports = router;
