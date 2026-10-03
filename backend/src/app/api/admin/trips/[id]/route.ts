import { requireAdmin } from "@/lib/auth";
import { ok, route, type IdParams } from "@/lib/http";
import { getAdminTripDetail } from "@/services/adminService";

/** GET /api/admin/trips/[id] — Trip detail for admin. */
export const GET = route<IdParams>(async (_req, ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const data = await getAdminTripDetail(id);
  return ok(data);
});
