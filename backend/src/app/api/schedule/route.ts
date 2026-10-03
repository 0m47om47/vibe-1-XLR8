import { requireAuth } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { getSchedule } from "@/services/tripService";

/**
 * GET /api/schedule?days=7 — upcoming Toto runs for any logged-in user:
 * route, departure, arrival, seats taken/left, and whether a new request for the
 * same route and time can still join. No passenger names.
 */
export const GET = route(async (req) => {
  await requireAuth();
  const raw = Number.parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10);
  const days = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 60) : 7;
  return ok(await getSchedule(days));
});
