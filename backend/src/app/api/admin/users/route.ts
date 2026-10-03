import { requireAdmin } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { getAdminUsers } from "@/services/adminService";
import type { NextRequest } from "next/server";
import type { AccountStatus, UserRole } from "@/models/User";

/** GET /api/admin/users — List all users with optional filters. */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const url = req.nextUrl;
  const search = url.searchParams.get("search") || undefined;
  const role = (url.searchParams.get("role") as UserRole) || undefined;
  const accountStatus = (url.searchParams.get("accountStatus") as AccountStatus) || undefined;
  const data = await getAdminUsers({ search, role, accountStatus });
  return ok(data);
});
