const express = require("express");
const { getDb } = require("../lib/mongodb");
const { ok, asyncRoute } = require("../lib/http");

const router = express.Router();

/** GET /api/health — liveness + database connectivity. */
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const db = await getDb();
    await db.command({ ping: 1 });
    ok(res, { status: "ok", database: "connected" });
  }),
);

module.exports = router;
