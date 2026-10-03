import { requireAuth } from "@/lib/auth";
import { ok, parseObjectId, route, type IdParams } from "@/lib/http";
import { getTrip } from "@/services/tripService";

/** GET /api/trips/:id — trip details with every passenger's boarding status. */
export const GET = route<IdParams>(async (_req, { params }) => {
  const user = await requireAuth();
  const id = parseObjectId((await params).id, "Trip");
  return ok({ trip: await getTrip(user, id) });
});
