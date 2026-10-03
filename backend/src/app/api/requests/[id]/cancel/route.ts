import { requirePassenger } from "@/lib/auth";
import { ok, parseObjectId, route, type IdParams } from "@/lib/http";
import { cancelRideRequest } from "@/services/requestService";

/** POST /api/requests/:id/cancel — requester cancels a PENDING or not-yet-started ACCEPTED request. */
export const POST = route<IdParams>(async (_req, { params }) => {
  const user = await requirePassenger();
  const id = parseObjectId((await params).id, "Ride request");
  return ok({ request: await cancelRideRequest(user, id) });
});
