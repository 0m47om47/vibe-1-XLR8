import { requireAdmin } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { getAdminTrips } from "@/services/adminService";
import type { NextRequest } from "next/server";

/** GET /api/admin/trips — List all trips with optional filters. */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const riderId = req.nextUrl.searchParams.get("riderId") || undefined;
  const data = await getAdminTrips({ status, riderId });
  return ok(data);
});
