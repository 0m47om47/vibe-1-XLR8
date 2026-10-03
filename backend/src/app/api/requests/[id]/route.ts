import { requireAuth } from "@/lib/auth";
import { ok, parseObjectId, route, type IdParams } from "@/lib/http";
import { getRideRequest } from "@/services/requestService";

/** GET /api/requests/:id — request + its trip (with per-passenger boarding) if accepted. */
export const GET = route<IdParams>(async (_req, { params }) => {
  const user = await requireAuth();
  const id = parseObjectId((await params).id, "Ride request");
  return ok(await getRideRequest(user, id));
});
