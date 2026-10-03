import { config } from "@/lib/config";
import { ok, route } from "@/lib/http";
import { LOCATIONS } from "@/models/RideRequest";

/** GET /api/meta — public booking rules so the UI never hard-codes them. */
export const GET = route(async () =>
  ok({
    locations: LOCATIONS,
    tripDurationMinutes: config.tripDurationMinutes,
    maxPassengers: config.maxPassengers,
    maxBookingDaysAhead: config.maxBookingDaysAhead,
  }),
);
