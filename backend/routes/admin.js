const express = require("express");
const { ok, asyncRoute, readJsonObject } = require("../lib/http");
const { requireAdmin, requireAuth } = require("../lib/auth");
const {
  getAdminDashboard,
  getAdminUsers,
  getAdminUserDetail,
  changeUserRole,
  changeUserStatus,
  getRoleRequests,
  createRoleRequest,
  approveRoleRequest,
  rejectRoleRequest,
  getAdminTrips,
  getAdminTripDetail,
  getAdminRiders,
  getAdminRiderDetail,
  getAdminAnalytics,
} = require("../services/adminService");

const router = express.Router();

/** GET /api/admin — admin dashboard overview. */
router.get(
  "/",
  asyncRoute(async (req, res) => {
    await requireAdmin(req);
    ok(res, await getAdminDashboard());
  }),
);

/** GET /api/admin/users — list all users with optional filters. */
router.get(
  "/users",
  asyncRoute(async (req, res) => {
    await requireAdmin(req);
    const { search, role, accountStatus } = req.query;
    ok(res, await getAdminUsers({ search, role, accountStatus }));
  }),
);

/** GET /api/admin/users/:id — user detail for admin. */
router.get(
  "/users/:id",
  asyncRoute(async (req, res) => {
    await requireAdmin(req);
    ok(res, await getAdminUserDetail(req.params.id));
  }),
);

/** PATCH /api/admin/users/:id — change user role or account status. */
router.patch(
  "/users/:id",
  asyncRoute(async (req, res) => {
    const admin = await requireAdmin(req);
    const body = readJsonObject(req);

    if (body.role) {
      const user = await changeUserRole(req.params.id, body.role, admin);
      return ok(res, { user, message: "Role updated successfully." });
    }
    if (body.accountStatus) {
      const user = await changeUserStatus(req.params.id, body.accountStatus);
      return ok(res, { user, message: "Account status updated successfully." });
    }
    ok(res, { message: "No changes made." });
  }),
);

/** GET /api/admin/role-requests — list role requests (optionally filtered by status). */
router.get(
  "/role-requests",
  asyncRoute(async (req, res) => {
    await requireAdmin(req);
    ok(res, await getRoleRequests(req.query.status));
  }),
);

/** POST /api/admin/role-requests — create a new role request (any authenticated user). */
router.post(
  "/role-requests",
  asyncRoute(async (req, res) => {
    const user = await requireAuth(req);
    const body = readJsonObject(req);
    ok(res, await createRoleRequest(user, body.requestedRole, body.reason));
  }),
);

/** PATCH /api/admin/role-requests/:id — approve or reject a role request. */
router.patch(
  "/role-requests/:id",
  asyncRoute(async (req, res) => {
    const admin = await requireAdmin(req);
    const body = readJsonObject(req);

    if (body.action === "approve") {
      const data = await approveRoleRequest(req.params.id, admin);
      return ok(res, { request: data, message: "Role request approved." });
    }
    if (body.action === "reject") {
      const data = await rejectRoleRequest(req.params.id, admin, body.rejectionReason);
      return ok(res, { request: data, message: "Role request rejected." });
    }
    ok(res, { message: "No action taken." });
  }),
);

/** GET /api/admin/trips — list all trips with optional filters. */
router.get(
  "/trips",
  asyncRoute(async (req, res) => {
    await requireAdmin(req);
    const { status, riderId } = req.query;
    ok(res, await getAdminTrips({ status, riderId }));
  }),
);

/** GET /api/admin/trips/:id — trip detail for admin. */
router.get(
  "/trips/:id",
  asyncRoute(async (req, res) => {
    await requireAdmin(req);
    ok(res, await getAdminTripDetail(req.params.id));
  }),
);

/** GET /api/admin/riders — list all riders with stats. */
router.get(
  "/riders",
  asyncRoute(async (req, res) => {
    await requireAdmin(req);
    ok(res, await getAdminRiders());
  }),
);

/** GET /api/admin/riders/:id — rider detail with trip history. */
router.get(
  "/riders/:id",
  asyncRoute(async (req, res) => {
    await requireAdmin(req);
    ok(res, await getAdminRiderDetail(req.params.id));
  }),
);

/** GET /api/admin/analytics — admin analytics overview. */
router.get(
  "/analytics",
  asyncRoute(async (req, res) => {
    await requireAdmin(req);
    ok(res, await getAdminAnalytics());
  }),
);

module.exports = router;
