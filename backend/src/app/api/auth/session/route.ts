import { getCurrentUser } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { toPublicUser } from "@/models/User";

/**
 * GET /api/auth/session — the logged-in user, or `{ user: null }` (always 200).
 * Lets the UI check "am I logged in?" without a 401 on every logged-out page view.
 * Use GET /api/auth/me when a session is required.
 */
export const GET = route(async () => {
  const user = await getCurrentUser();
  return ok({ user: user ? toPublicUser(user) : null });
});
