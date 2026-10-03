import { requireRider } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { ok, parseObjectId, route, type IdParams } from "@/lib/http";
import { acceptRideRequest } from "@/services/requestService";

/**
 * POST /api/requests/:id/accept — rider puts this request on the Toto.
 * 200 → outcome NEW_TRIP (new run) or JOINED (shares an accepted run going the
 *       same way at the same time); overlapping pending requests that no longer
 *       fit are now CLASHED (`clashedRequestIds`).
 * 409 → TRIP_CLASH: the Toto is busy on another run, or the run is full; this
 *       request is now CLASHED and `message` says why.
 * See lib/totoLock.ts for why simultaneous accepts cannot double-book or overfill.
 */
export const POST = route<IdParams>(async (_req, { params }) => {
  const rider = await requireRider();
  const id = parseObjectId((await params).id, "Ride request");
  const result = await acceptRideRequest(rider, id);

  if (result.outcome === "CLASHED") {
    // The CLASHED status was committed before we report the conflict.
    throw new ApiError(409, "TRIP_CLASH", result.reason, {
      requestStatus: "CLASHED",
      request: result.request,
      conflictingTripId: result.conflictingTripId,
    });
  }
  return ok(result);
});
