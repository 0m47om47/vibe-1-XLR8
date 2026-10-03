import { requireRider } from "@/lib/auth";
import { ok, parseObjectId, route, type IdParams } from "@/lib/http";
import { completeTrip } from "@/services/tripService";

/** POST /api/trips/:id/complete — IN_PROGRESS → COMPLETED once every passenger is BOARDED or MISSED. */
export const POST = route<IdParams>(async (_req, { params }) => {
  const rider = await requireRider();
  const id = parseObjectId((await params).id, "Trip");
  return ok({ trip: await completeTrip(rider, id) });
});
