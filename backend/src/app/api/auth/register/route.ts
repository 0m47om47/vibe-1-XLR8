import { ok, readJsonObject, route } from "@/lib/http";
import { createSession } from "@/lib/session";
import { validateRegister } from "@/lib/validation";
import { toPublicUser } from "@/models/User";
import { registerUser } from "@/services/authService";

/** POST /api/auth/register — creates a STUDENT or EMPLOYEE account and logs it in. */
export const POST = route(async (req) => {
  const input = validateRegister(await readJsonObject(req));
  const user = await registerUser(input);
  await createSession(user._id);
  return ok({ user: toPublicUser(user) }, { status: 201 });
});
