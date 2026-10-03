import { ok, route } from "@/lib/http";
import { destroySession } from "@/lib/session";

/** POST /api/auth/logout — revokes the server-side session and clears the cookie. */
export const POST = route(async () => {
  await destroySession();
  return ok({ loggedOut: true });
});
