import { requireRider } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { getCurrentTrip } from "@/services/tripService";

/** GET /api/trips/current — the rider's in-progress trip, else the next accepted one; plus Toto status. */
export const GET = route(async () => {
  const rider = await requireRider();
  return ok(await getCurrentTrip(rider));
});
