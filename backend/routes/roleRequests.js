const express = require("express");
const { ok, asyncRoute, readJsonObject } = require("../lib/http");
const { requireAuth } = require("../lib/auth");
const { db } = require("../lib/db");
const { toRoleRequestDTO } = require("../models/RoleRequest");
const { createRoleRequest } = require("../services/adminService");

const router = express.Router();

/** GET /api/role-requests/mine — the logged-in user's own role requests. */
router.get(
  "/mine",
  asyncRoute(async (req, res) => {
    const user = await requireAuth(req);
    const { roleRequests } = await db();
    const docs = await roleRequests.find({ userId: user._id }).sort({ createdAt: -1 }).toArray();
    ok(res, docs.map((d) => toRoleRequestDTO(d)));
  }),
);

/** POST /api/role-requests/mine — submit a new role request for the logged-in user. */
router.post(
  "/mine",
  asyncRoute(async (req, res) => {
    const user = await requireAuth(req);
    const body = readJsonObject(req);
    const data = await createRoleRequest(user, body.requestedRole, body.reason);
    ok(res, data);
  }),
);

module.exports = router;
