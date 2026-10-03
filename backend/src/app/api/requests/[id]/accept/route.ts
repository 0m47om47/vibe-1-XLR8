import { requireRider } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { ok, parseObjectId, route, type IdParams } from "@/lib/http";
import { acceptRideRequest } from "@/services/requestService";

/**
 * POST /api/requests/:id/accept — rider reserves the Toto for this request.
 * 200 → accepted (trip created; overlapping pending requests are now CLASHED)
 * 409 → TRIP_CLASH: the Toto is already booked; this request is now CLASHED.
 * See lib/totoLock.ts for why two simultaneous accepts cannot both succeed.
 */
export const POST = route<IdParams>(async (_req, { params }) => {
  const rider = await requireRider();
  const id = parseObjectId((await params).id, "Ride request");
  const result = await acceptRideRequest(rider, id);

  if (result.outcome === "CLASHED") {
    // The CLASHED status was committed before we report the conflict.
    throw new ApiError(409, "TRIP_CLASH", "The Toto is already booked for an overlapping time", {
      requestStatus: "CLASHED",
      request: result.request,
      conflictingTripId: result.conflictingTripId,
    });
  }
  return ok(result);
});
