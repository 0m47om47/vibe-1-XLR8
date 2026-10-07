const express = require("express");
const { config } = require("../lib/config");
const { ok, asyncRoute } = require("../lib/http");
const { LOCATIONS } = require("../models/RideRequest");

const router = express.Router();

/** GET /api/meta — public booking rules so the UI never hard-codes them. */
router.get(
  "/",
  asyncRoute(async (req, res) => {
    ok(res, {
      locations: LOCATIONS,
      tripDurationMinutes: config.tripDurationMinutes,
      maxPassengers: config.maxPassengers,
      maxBookingDaysAhead: config.maxBookingDaysAhead,
    });
  }),
);

module.exports = router;
