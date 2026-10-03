import { requireAdmin } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { getAdminDashboard } from "@/services/adminService";

/** GET /api/admin — Admin dashboard overview. */
export const GET = route(async () => {
  await requireAdmin();
  const data = await getAdminDashboard();
  return ok(data);
});
