import { requireAdmin } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { getAdminAnalytics } from "@/services/adminService";

/** GET /api/admin/analytics — Admin analytics overview. */
export const GET = route(async () => {
  await requireAdmin();
  const data = await getAdminAnalytics();
  return ok(data);
});
