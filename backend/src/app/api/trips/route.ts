import { requireRider } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { parseEnum, parseLimit } from "@/lib/validation";
import { TRIP_STATUSES } from "@/models/Trip";
import { listRiderTrips } from "@/services/tripService";

/** GET /api/trips?status=ACCEPTED&upcoming=true&limit=50 — trips operated by the logged-in rider. */
export const GET = route(async (req) => {
  const rider = await requireRider();
  const q = req.nextUrl.searchParams;
  const trips = await listRiderTrips(rider, {
    status: parseEnum(q.get("status"), TRIP_STATUSES, "status"),
    upcomingOnly: q.get("upcoming") === "true",
    limit: parseLimit(q.get("limit")),
  });
  return ok({ trips });
});
