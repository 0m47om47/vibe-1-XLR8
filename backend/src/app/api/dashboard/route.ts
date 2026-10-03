import { requireAuth } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { ok, route } from "@/lib/http";
import { getPassengerDashboard, getRiderDashboard } from "@/services/dashboardService";

/**
 * GET /api/dashboard — role-specific summary.
 * Rider may pass ?dayStart=<ISO> (start of "today" in their timezone) for daily stats.
 */
export const GET = route(async (req) => {
  const user = await requireAuth();
  if (user.role !== "RIDER") return ok(await getPassengerDashboard(user));

  const raw = req.nextUrl.searchParams.get("dayStart");
  let dayStart: Date;
  if (raw) {
    dayStart = new Date(raw);
    if (Number.isNaN(dayStart.getTime())) throw badRequest("dayStart must be an ISO date-time");
  } else {
    dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
  }
  return ok(await getRiderDashboard(user, dayStart));
});
