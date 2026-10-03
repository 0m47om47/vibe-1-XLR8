import { requireAuth } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { toPublicUser } from "@/models/User";

/** GET /api/auth/me — the logged-in user (401 when not logged in). */
export const GET = route(async () => {
  const user = await requireAuth();
  return ok({ user: toPublicUser(user) });
});
