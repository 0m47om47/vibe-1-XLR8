import { requireAuth, requirePassenger } from "@/lib/auth";
import { ok, readJsonObject, route } from "@/lib/http";
import { parseEnum, parseLimit, validateCreateRequest } from "@/lib/validation";
import { REQUEST_STATUSES } from "@/models/RideRequest";
import { createRideRequest, listRideRequests } from "@/services/requestService";

/**
 * GET /api/requests?status=PENDING&upcoming=true&limit=50
 * Students/employees: their own requests. Rider: all requests (the work queue).
 */
export const GET = route(async (req) => {
  const user = await requireAuth();
  const q = req.nextUrl.searchParams;
  const requests = await listRideRequests(user, {
    status: parseEnum(q.get("status"), REQUEST_STATUSES, "status"),
    upcomingOnly: q.get("upcoming") === "true",
    limit: parseLimit(q.get("limit")),
  });
  return ok({ requests });
});

/**
 * POST /api/requests — student/employee creates a ride request.
 * 201 with status PENDING, or status CLASHED if the Toto is already booked then.
 */
export const POST = route(async (req) => {
  const user = await requirePassenger();
  const input = validateCreateRequest(await readJsonObject(req));
  const result = await createRideRequest(user, input);
  return ok(result, { status: 201 });
});
