import { requireAdmin } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { getAdminRiders } from "@/services/adminService";

/** GET /api/admin/riders — List all riders with stats. */
export const GET = route(async () => {
  await requireAdmin();
  const data = await getAdminRiders();
  return ok(data);
});
