import { requireAdmin } from "@/lib/auth";
import { ok, route, readJsonObject, type IdParams } from "@/lib/http";
import { approveRoleRequest, rejectRoleRequest } from "@/services/adminService";
import type { NextRequest } from "next/server";

/** PATCH /api/admin/role-requests/[id] — Approve or reject a role request. */
export const PATCH = route<IdParams>(async (req: NextRequest, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = await readJsonObject(req);

  if (body.action === "approve") {
    const data = await approveRoleRequest(id, admin);
    return ok({ request: data, message: "Role request approved." });
  }
  if (body.action === "reject") {
    const data = await rejectRoleRequest(id, admin, body.rejectionReason as string | undefined);
    return ok({ request: data, message: "Role request rejected." });
  }

  return ok({ message: "No action taken." });
});
