import { requireRider } from "@/lib/auth";
import { ok, parseObjectId, readJsonObject, route } from "@/lib/http";
import { validateBoardingUpdate } from "@/lib/validation";
import { updatePassengerBoarding } from "@/services/tripService";

type Params = { params: Promise<{ id: string; passengerId: string }> };

/** PATCH /api/trips/:id/passengers/:passengerId  body: { "boardingStatus": "BOARDED" | "MISSED" } */
export const PATCH = route<Params>(async (req, { params }) => {
  const rider = await requireRider();
  const { id, passengerId } = await params;
  const tripId = parseObjectId(id, "Trip");
  const pid = parseObjectId(passengerId, "Passenger");
  const status = validateBoardingUpdate(await readJsonObject(req));
  return ok({ trip: await updatePassengerBoarding(rider, tripId, pid, status) });
});
