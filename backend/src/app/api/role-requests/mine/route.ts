import { requireAuth } from "@/lib/auth";
import { ok, route, readJsonObject } from "@/lib/http";
import { createRoleRequest } from "@/services/adminService";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { toRoleRequestDTO } from "@/models/RoleRequest";

/** GET /api/role-requests/mine — Get current user's role requests. */
export const GET = route(async () => {
  const user = await requireAuth();
  const { roleRequests } = await db();
  const docs = await roleRequests.find({ userId: user._id }).sort({ createdAt: -1 }).toArray();
  return ok(docs.map((d) => toRoleRequestDTO(d)));
});

/** POST /api/role-requests/mine — Submit a new role request. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireAuth();
  const body = await readJsonObject(req);
  const data = await createRoleRequest(user, body.requestedRole as string as import("@/models/User").UserRole, body.reason as string | undefined);
  return ok(data);
});
