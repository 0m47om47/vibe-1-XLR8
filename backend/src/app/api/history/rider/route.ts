import { requireRider } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { parseEnum, parseLimit } from "@/lib/validation";
import { TRIP_STATUSES } from "@/models/Trip";
import { getRiderHistory } from "@/services/historyService";

/** GET /api/history/rider?status=COMPLETED&limit=100 — every trip the logged-in rider operated. */
export const GET = route(async (req) => {
  const rider = await requireRider();
  const q = req.nextUrl.searchParams;
  const history = await getRiderHistory(rider, {
    status: parseEnum(q.get("status"), TRIP_STATUSES, "status"),
    limit: parseLimit(q.get("limit"), 100, 500),
  });
  return ok(history);
});
