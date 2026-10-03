import { ok, route } from "@/lib/http";

/** GET / — this server is API-only. */
export const GET = route(async () =>
  ok({ service: "Lawazia Toto Ride Management API", docs: "See README.md", health: "/api/health" }),
);
