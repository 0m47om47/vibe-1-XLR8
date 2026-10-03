import { requireAdmin, requireAuth } from "@/lib/auth";
import { ok, route, readJsonObject } from "@/lib/http";
import { getRoleRequests, createRoleRequest, approveRoleRequest, rejectRoleRequest } from "@/services/adminService";
import type { NextRequest } from "next/server";
import type { RoleRequestStatus } from "@/models/RoleRequest";

/** GET /api/admin/role-requests — List role requests (optionally filtered by status). */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const status = (req.nextUrl.searchParams.get("status") as RoleRequestStatus) || undefined;
  const data = await getRoleRequests(status);
  return ok(data);
});

/** POST /api/admin/role-requests — Create a new role request (called by any authenticated user). */
export const POST = route(async (req: NextRequest) => {
  const user = await requireAuth();
  const body = await readJsonObject(req);
  const data = await createRoleRequest(user, body.requestedRole as string as import("@/models/User").UserRole, body.reason as string | undefined);
  return ok(data);
});
