import { requireAdmin } from "@/lib/auth";
import { ok, route, type IdParams } from "@/lib/http";
import { getAdminRiderDetail } from "@/services/adminService";

/** GET /api/admin/riders/[id] — Rider detail with trip history. */
export const GET = route<IdParams>(async (_req, ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const data = await getAdminRiderDetail(id);
  return ok(data);
});
