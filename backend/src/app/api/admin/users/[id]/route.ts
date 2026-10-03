import { requireAdmin } from "@/lib/auth";
import { ok, route, readJsonObject, type IdParams, parseObjectId } from "@/lib/http";
import { getAdminUserDetail, changeUserRole, changeUserStatus } from "@/services/adminService";
import type { NextRequest } from "next/server";

/** GET /api/admin/users/[id] — User detail for admin. */
export const GET = route<IdParams>(async (_req, ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const data = await getAdminUserDetail(id);
  return ok(data);
});

/** PATCH /api/admin/users/[id] — Change user role or status. */
export const PATCH = route<IdParams>(async (req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = await readJsonObject(req);

  if (body.role) {
    const user = await changeUserRole(id, body.role as string as import("@/models/User").UserRole, admin);
    return ok({ user, message: "Role updated successfully." });
  }
  if (body.accountStatus) {
    const user = await changeUserStatus(id, body.accountStatus as string as import("@/models/User").AccountStatus);
    return ok({ user, message: "Account status updated successfully." });
  }
  return ok({ message: "No changes made." });
});
