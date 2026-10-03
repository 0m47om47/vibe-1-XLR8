import { ok, readJsonObject, route } from "@/lib/http";
import { createSession } from "@/lib/session";
import { validateLogin } from "@/lib/validation";
import { toPublicUser } from "@/models/User";
import { authenticate } from "@/services/authService";

/** POST /api/auth/login — verifies credentials and sets the session cookie. */
export const POST = route(async (req) => {
  const input = validateLogin(await readJsonObject(req));
  const user = await authenticate(input);
  await createSession(user._id);
  return ok({ user: toPublicUser(user) });
});
