const express = require("express");
const { ok, asyncRoute } = require("../lib/http");
const { requireAuth, requireRider } = require("../lib/auth");
const { parseEnum, parseLimit } = require("../lib/validation");
const { TRIP_STATUSES } = require("../models/Trip");
const { getPersonHistory, getRiderHistory } = require("../services/historyService");

const router = express.Router();

/**
 * GET /api/history/person
 * Student/employee: own boarding history.
 * Rider: GET /api/history/person?name=Rahul — that passenger's history on trips this rider handled.
 */
router.get(
  "/person",
  asyncRoute(async (req, res) => {
    const user = await requireAuth(req);
    const history = await getPersonHistory(user, { name: req.query.name, limit: parseLimit(req.query.limit, 100, 500) });
    ok(res, history);
  }),
);

/** GET /api/history/rider?status=COMPLETED&limit=100 — every trip the logged-in rider operated. */
router.get(
  "/rider",
  asyncRoute(async (req, res) => {
    const rider = await requireRider(req);
    const history = await getRiderHistory(rider, {
      status: parseEnum(req.query.status, TRIP_STATUSES, "status"),
      limit: parseLimit(req.query.limit, 100, 500),
    });
    ok(res, history);
  }),
);

module.exports = router;
