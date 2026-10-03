import { getDb } from "@/lib/mongodb";
import { ok, route } from "@/lib/http";

/** GET /api/health — liveness + database connectivity. */
export const GET = route(async () => {
  const db = await getDb();
  await db.command({ ping: 1 });
  return ok({ status: "ok", database: "connected" });
});
