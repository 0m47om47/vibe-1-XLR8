const express = require("express");
const { ok, asyncRoute } = require("../lib/http");
const { requireAuth } = require("../lib/auth");
const { badRequest } = require("../lib/errors");
const { getPassengerDashboard, getRiderDashboard } = require("../services/dashboardService");

const router = express.Router();

/**
 * GET /api/dashboard — role-specific summary.
 * Rider may pass ?dayStart=<ISO> (start of "today" in their timezone) for daily stats.
 */
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const user = await requireAuth(req);
    if (user.role !== "RIDER") return ok(res, await getPassengerDashboard(user));

    const raw = req.query.dayStart;
    let dayStart;
    if (raw) {
      dayStart = new Date(raw);
      if (Number.isNaN(dayStart.getTime())) throw badRequest("dayStart must be an ISO date-time");
    } else {
      dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
    }
    ok(res, await getRiderDashboard(user, dayStart));
  }),
);

module.exports = router;
