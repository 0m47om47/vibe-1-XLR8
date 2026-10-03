import { requireAuth } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { parseLimit } from "@/lib/validation";
import { getPersonHistory } from "@/services/historyService";

/**
 * GET /api/history/person
 * Student/employee: own boarding history.
 * Rider: GET /api/history/person?name=Rahul — that passenger's history on trips this rider handled.
 */
export const GET = route(async (req) => {
  const user = await requireAuth();
  const q = req.nextUrl.searchParams;
  const history = await getPersonHistory(user, {
    name: q.get("name") ?? undefined,
    limit: parseLimit(q.get("limit"), 100, 500),
  });
  return ok(history);
});
