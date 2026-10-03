import { requireRider } from "@/lib/auth";
import { ok, parseObjectId, route, type IdParams } from "@/lib/http";
import { startTrip } from "@/services/tripService";

/** POST /api/trips/:id/start — ACCEPTED → IN_PROGRESS (pickup begins). */
export const POST = route<IdParams>(async (_req, { params }) => {
  const rider = await requireRider();
  const id = parseObjectId((await params).id, "Trip");
  return ok({ trip: await startTrip(rider, id) });
});
