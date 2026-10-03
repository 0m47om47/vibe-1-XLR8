/**
 * End-to-end API tests against a real running Next.js server.
 *
 *   npm run test:api                 → starts an in-memory MongoDB replica set,
 *                                      seeds it, boots `next dev` on :4100, runs tests
 *   API_URL=http://localhost:4000 \
 *   MONGODB_URI=... MONGODB_DB=... \
 *   npm run test:api                 → runs against an already-running server
 *                                      (the database is RE-SEEDED — never use production)
 */
import { spawn, type ChildProcess, execSync } from "node:child_process";
import path from "node:path";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { seed, DEMO_PASSWORD } from "./seedData";

const PORT = 4100;
let BASE = process.env.API_URL ?? `http://localhost:${PORT}`;

// ------------------------------------------------------------------ tiny test harness

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, info?: unknown) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}`);
    if (info !== undefined) console.log("      ", JSON.stringify(info, null, 2).slice(0, 1500));
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

// ------------------------------------------------------------------ HTTP client with cookie jar

type Res = { status: number; body: any };

class Client {
  private cookie = "";
  constructor(public label: string) {}

  async call(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
    const res = await fetch(BASE + url, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [name, value] = pair.split("=");
      if (name === "toto_session") this.cookie = value ? `${name}=${value}` : "";
    }
    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* non-JSON */
    }
    return { status: res.status, body: parsed };
  }
  get = (u: string) => this.call("GET", u);
  post = (u: string, b?: unknown) => this.call("POST", u, b ?? {});
  patch = (u: string, b?: unknown) => this.call("PATCH", u, b ?? {});

  async login(email: string, password = DEMO_PASSWORD) {
    const r = await this.post("/api/auth/login", { email, password });
    if (r.status !== 200) throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(r.body)}`);
    return r;
  }
}

/** A UTC instant `days` from now at hh:mm UTC — far from seed data (which is ±2 days). */
function slot(days: number, hh: number, mm = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hh, mm, 0, 0);
  return d.toISOString();
}

// ------------------------------------------------------------------ tests

async function run(mongoUri: string, dbName: string) {
  const rider = new Client("rider");
  const rahul = new Client("rahul");
  const neha = new Client("neha");
  const priya = new Client("priya");
  const amit = new Client("amit");
  const anon = new Client("anon");

  await rider.login("rider@lawazia.test");
  await rahul.login("rahul@lawazia.test");
  await neha.login("neha@lawazia.test");
  await priya.login("priya@lawazia.test");
  await amit.login("amit@lawazia.test");

  // -------------------------------------------------------------- auth basics
  section("Auth");
  {
    const me = await rahul.get("/api/auth/me");
    check("GET /me returns the logged-in user", me.status === 200 && me.body.data.user.name === "Rahul", me);
    check("user payload never contains a password hash", !JSON.stringify(me.body).includes("passwordHash"));

    const sessionIn = await rahul.get("/api/auth/session");
    const sessionOut = await anon.get("/api/auth/session");
    check("GET /session → user when logged in, { user: null } (200) when not",
      sessionIn.status === 200 && sessionIn.body.data.user?.name === "Rahul" && sessionOut.status === 200 && sessionOut.body.data.user === null,
      [sessionIn, sessionOut]);

    const bad = await anon.post("/api/auth/login", { email: "rahul@lawazia.test", password: "wrong-password" });
    check("wrong password → 401", bad.status === 401, bad);

    const inj = await anon.post("/api/auth/login", { email: { $ne: null }, password: { $ne: null } });
    check("NoSQL-operator injection in login → 400", inj.status === 400, inj);

    const riderReg = await anon.post("/api/auth/register", {
      name: "Sneaky", email: "sneaky@x.test", password: "password123", role: "RIDER",
    });
    check("cannot self-register as RIDER → 400", riderReg.status === 400, riderReg);

    const fresh = new Client("fresh");
    const reg = await fresh.post("/api/auth/register", {
      name: "Kiran", email: "kiran@x.test", password: "password123", role: "STUDENT",
    });
    check("register STUDENT → 201 and logged in", reg.status === 201 && reg.body.data.user.role === "STUDENT", reg);
    const dup = await anon.post("/api/auth/register", {
      name: "Kiran", email: "KIRAN@x.test", password: "password123", role: "STUDENT",
    });
    check("duplicate email (case-insensitive) → 409", dup.status === 409, dup);

    const out = await fresh.post("/api/auth/logout");
    const after = await fresh.get("/api/auth/me");
    check("logout revokes the session", out.status === 200 && after.status === 401, after);
  }

  // -------------------------------------------------------------- validation
  section("Request validation (server-side)");
  {
    const same = await rahul.post("/api/requests", {
      from: "College", to: "College", scheduledAt: slot(5, 6), passengers: [{ name: "Rahul" }],
    });
    check("same source & destination → 400", same.status === 400 && same.body.error.details?.to, same);

    const empty = await rahul.post("/api/requests", {
      from: "College", to: "Station", scheduledAt: slot(5, 6), passengers: [{ name: "  " }],
    });
    check("empty passenger name → 400", empty.status === 400, empty);

    const dupNames = await rahul.post("/api/requests", {
      from: "College", to: "Station", scheduledAt: slot(5, 6), passengers: [{ name: "Rahul" }, { name: "rahul " }],
    });
    check("duplicate passenger names → 400", dupNames.status === 400, dupNames);

    const past = await rahul.post("/api/requests", {
      from: "College", to: "Station", scheduledAt: new Date(Date.now() - 3600_000).toISOString(), passengers: [{ name: "Rahul" }],
    });
    check("past date/time → 400", past.status === 400, past);

    const garbage = await rahul.post("/api/requests", {
      from: "College", to: "Station", scheduledAt: "tomorrow at ten", passengers: [{ name: "Rahul" }],
    });
    check("invalid date string → 400", garbage.status === 400, garbage);

    const badLoc = await rahul.post("/api/requests", {
      from: "Airport", to: "Station", scheduledAt: slot(5, 6), passengers: [{ name: "Rahul" }],
    });
    check("unknown location → 400", badLoc.status === 400, badLoc);

    const riderCreates = await rider.post("/api/requests", {
      from: "College", to: "Station", scheduledAt: slot(5, 6), passengers: [{ name: "X" }],
    });
    check("rider cannot create ride requests → 403", riderCreates.status === 403, riderCreates);
  }

  // -------------------------------------------------------------- TEST 1
  section("TEST 1: one request → accepted");
  let t1TripId = "";
  {
    const c = await rahul.post("/api/requests", {
      from: "College", to: "Station", scheduledAt: slot(6, 4), passengers: [{ name: "Rahul" }],
    });
    check("create → 201 PENDING", c.status === 201 && c.body.data.request.status === "PENDING", c);
    const a = await rider.post(`/api/requests/${c.body.data.request.id}/accept`);
    check("accept → 200 ACCEPTED with a trip", a.status === 200 && a.body.data.request.status === "ACCEPTED" && a.body.data.trip?.status === "ACCEPTED", a);
    t1TripId = a.body.data.trip?.id;
    const view = await rahul.get(`/api/requests/${c.body.data.request.id}`);
    check("requester sees ACCEPTED + trip", view.body.data.request.status === "ACCEPTED" && view.body.data.trip?.id === t1TripId, view);
  }

  // -------------------------------------------------------------- TEST 2 (the exact demo)
  section("TEST 2 + DEMO: two overlapping requests → only one accepted");
  let demoTripId = "";
  let demoReq1 = "";
  let demoReq2 = "";
  {
    const at10 = slot(7, 10);
    const r1 = await rahul.post("/api/requests", {
      from: "College", to: "Station", scheduledAt: at10, passengers: [{ name: "Rahul" }, { name: "Amit" }, { name: "Priya" }],
    });
    const r2 = await neha.post("/api/requests", {
      from: "Office", to: "Station", scheduledAt: at10, passengers: [{ name: "Neha" }, { name: "Rohit" }],
    });
    demoReq1 = r1.body.data.request.id;
    demoReq2 = r2.body.data.request.id;
    check("both requests start PENDING", r1.body.data.request.status === "PENDING" && r2.body.data.request.status === "PENDING", [r1, r2]);

    const pendingQueue = await rider.get("/api/requests?status=PENDING");
    check("rider sees both in the pending queue",
      pendingQueue.body.data.requests.some((r: any) => r.id === demoReq1) &&
      pendingQueue.body.data.requests.some((r: any) => r.id === demoReq2), pendingQueue);

    const a1 = await rider.post(`/api/requests/${demoReq1}/accept`);
    check("Request 1 → ACCEPTED", a1.status === 200 && a1.body.data.request.status === "ACCEPTED", a1);
    check("accept reports Request 2 as clashed", a1.body.data.clashedRequestIds?.includes(demoReq2), a1);
    demoTripId = a1.body.data.trip.id;

    const v2 = await neha.get(`/api/requests/${demoReq2}`);
    check("Request 2 → CLASHED (seen by its requester)", v2.body.data.request.status === "CLASHED" && v2.body.data.request.clashedWithTripId === demoTripId, v2);

    const a2 = await rider.post(`/api/requests/${demoReq2}/accept`);
    check("accepting Request 2 afterwards → 409 TRIP_CLASH", a2.status === 409 && a2.body.error.code === "TRIP_CLASH", a2);

    // A new request that overlaps an ACCEPTED trip is CLASHED at creation.
    const late = await amit.post("/api/requests", {
      from: "Office", to: "College", scheduledAt: slot(7, 10, 20), passengers: [{ name: "Amit" }],
    });
    check("new request overlapping an accepted trip → created as CLASHED", late.status === 201 && late.body.data.request.status === "CLASHED" && late.body.data.clashed === true, late);

    // Half-open interval: a trip starting exactly when another ends does not overlap.
    const adjacent = await amit.post("/api/requests", {
      from: "Station", to: "Office", scheduledAt: slot(7, 10, 30), passengers: [{ name: "Amit" }],
    });
    check("back-to-back request (starts at end time) → PENDING, not clashed", adjacent.body.data.request.status === "PENDING", adjacent);
  }

  // -------------------------------------------------------------- TEST 3
  section("TEST 3: simultaneous accepts → no double booking");
  {
    for (let round = 0; round < 5; round++) {
      const when = slot(8 + round, 9);
      const created = await Promise.all(
        [rahul, neha, priya, amit, rahul].map((u, i) =>
          u.post("/api/requests", {
            from: "College", to: "Office", scheduledAt: new Date(new Date(when).getTime() + i * 5 * 60_000).toISOString(),
            passengers: [{ name: `Racer ${String.fromCharCode(65 + i)}` }],
          }),
        ),
      );
      const ids = created.map((c) => c.body.data.request.id as string);
      // Fire all accepts at the same instant.
      const results = await Promise.all(ids.map((id) => rider.post(`/api/requests/${id}/accept`)));
      const winners = results.filter((r) => r.status === 200);
      const losers = results.filter((r) => r.status === 409);
      check(`round ${round + 1}: exactly 1 of 5 concurrent accepts wins, 4 get 409`, winners.length === 1 && losers.length === 4,
        results.map((r) => [r.status, r.body.error?.code]));

      const client = new MongoClient(mongoUri);
      try {
        const trips = client.db(dbName).collection("trips");
        const start = new Date(when);
        const end = new Date(start.getTime() + 60 * 60_000);
        const active = await trips.countDocuments({ status: { $in: ["ACCEPTED", "IN_PROGRESS"] }, scheduledAt: { $lt: end }, endsAt: { $gt: start } });
        check(`round ${round + 1}: database holds exactly one active trip in that window`, active === 1, { active });
        const reqs = client.db(dbName).collection("rideRequests");
        const clashed = await reqs.countDocuments({ _id: { $in: ids.map((i) => new ObjectId(i)) }, status: "CLASHED" });
        check(`round ${round + 1}: the other 4 requests are CLASHED`, clashed === 4, { clashed });
      } finally {
        await client.close();
      }
    }
  }

  // -------------------------------------------------------------- TEST 7 & 8 (before boarding so we have ids)
  section("TEST 7: students/employees cannot use rider APIs");
  {
    const accept = await rahul.post(`/api/requests/${demoReq2}/accept`);
    check("student accept → 403", accept.status === 403 && accept.body.error.code === "FORBIDDEN", accept);
    const start = await amit.post(`/api/trips/${demoTripId}/start`);
    check("employee start trip → 403", start.status === 403, start);
    const board = await rahul.patch(`/api/trips/${demoTripId}/passengers/${new ObjectId().toHexString()}`, { boardingStatus: "BOARDED" });
    check("student mark boarding → 403", board.status === 403, board);
    const complete = await priya.post(`/api/trips/${demoTripId}/complete`);
    check("student complete trip → 403", complete.status === 403, complete);
    const list = await rahul.get("/api/trips");
    check("student list rider trips → 403", list.status === 403, list);
    const hist = await neha.get("/api/history/rider");
    check("employee rider history → 403", hist.status === 403, hist);
    const other = await priya.get(`/api/requests/${demoReq2}`);
    check("student cannot read someone else's request → 404", other.status === 404, other);
  }

  section("TEST 8: unauthenticated access is rejected");
  {
    const urls: [string, string][] = [
      ["GET", "/api/auth/me"], ["GET", "/api/requests"], ["POST", "/api/requests"], ["GET", `/api/requests/${demoReq1}`],
      ["POST", `/api/requests/${demoReq1}/accept`], ["POST", `/api/requests/${demoReq1}/cancel`], ["GET", "/api/trips"],
      ["GET", "/api/trips/current"], ["POST", `/api/trips/${demoTripId}/start`], ["POST", `/api/trips/${demoTripId}/complete`],
      ["GET", "/api/history/person"], ["GET", "/api/history/rider"], ["GET", "/api/dashboard"],
    ];
    const results = await Promise.all(urls.map(([m, u]) => anon.call(m, u, m === "GET" ? undefined : {})));
    check("all 13 protected endpoints → 401 without a session",
      results.every((r) => r.status === 401 && r.body.error.code === "UNAUTHENTICATED"),
      results.map((r, i) => [urls[i][1], r.status]));
    const forged = new Client("forged");
    const r = await forged.call("GET", "/api/auth/me", undefined, { Cookie: "toto_session=forged-token-value" });
    check("forged session cookie → 401", r.status === 401, r);
    const xsite = await rahul.call("POST", "/api/requests", {}, { Origin: "https://evil.example" });
    check("cross-origin POST with a valid cookie → 403 (CSRF defence)", xsite.status === 403, xsite);
  }

  // -------------------------------------------------------------- TEST 4
  section("TEST 4: three passengers → two BOARDED, one MISSED");
  {
    const early = await rider.patch(`/api/trips/${demoTripId}/passengers/${new ObjectId().toHexString()}`, { boardingStatus: "BOARDED" });
    check("marking before start → 404/409 (not allowed)", early.status === 404 || early.status === 409, early);

    const start = await rider.post(`/api/trips/${demoTripId}/start`);
    check("start → IN_PROGRESS", start.status === 200 && start.body.data.trip.status === "IN_PROGRESS", start);

    const otherStart = await rider.post(`/api/trips/${t1TripId}/start`);
    check("cannot start a second trip while one is IN_PROGRESS → 409", otherStart.status === 409, otherStart);

    const cur = await rider.get("/api/trips/current");
    check("current trip = the started trip, Toto ON_TRIP", cur.body.data.trip?.id === demoTripId && cur.body.data.vehicle.status === "ON_TRIP", cur);

    const passengers: { id: string; name: string }[] = start.body.data.trip.passengers;
    const byName = Object.fromEntries(passengers.map((p) => [p.name, p.id]));

    const tooEarly = await rider.post(`/api/trips/${demoTripId}/complete`);
    check("complete with PENDING passengers → 409 listing them", tooEarly.status === 409 && tooEarly.body.error.details?.pendingPassengers?.length === 3, tooEarly);

    const badStatus = await rider.patch(`/api/trips/${demoTripId}/passengers/${byName.Rahul}`, { boardingStatus: "MAYBE" });
    check("invalid boarding status → 400", badStatus.status === 400, badStatus);

    // Mark all three concurrently — atomic positional updates must not lose any.
    const [b1, b2, b3] = await Promise.all([
      rider.patch(`/api/trips/${demoTripId}/passengers/${byName.Rahul}`, { boardingStatus: "BOARDED" }),
      rider.patch(`/api/trips/${demoTripId}/passengers/${byName.Amit}`, { boardingStatus: "BOARDED" }),
      rider.patch(`/api/trips/${demoTripId}/passengers/${byName.Priya}`, { boardingStatus: "MISSED" }),
    ]);
    check("three concurrent per-passenger updates → 200", [b1, b2, b3].every((r) => r.status === 200), [b1, b2, b3]);

    const t = await rider.get(`/api/trips/${demoTripId}`);
    const statusOf = (n: string) => t.body.data.trip.passengers.find((p: any) => p.name === n)?.boardingStatus;
    check("Rahul BOARDED, Amit BOARDED, Priya MISSED", statusOf("Rahul") === "BOARDED" && statusOf("Amit") === "BOARDED" && statusOf("Priya") === "MISSED", t);
    check("canComplete is now true", t.body.data.trip.canComplete === true, t.body.data.trip);

    const done = await rider.post(`/api/trips/${demoTripId}/complete`);
    check("complete → COMPLETED with completedAt", done.status === 200 && done.body.data.trip.status === "COMPLETED" && !!done.body.data.trip.completedAt, done);

    const again = await rider.patch(`/api/trips/${demoTripId}/passengers/${byName.Priya}`, { boardingStatus: "BOARDED" });
    check("boarding records are frozen after completion → 409", again.status === 409, again);

    const req1 = await rahul.get(`/api/requests/${demoReq1}`);
    check("Request 1 shows COMPLETED to its requester", req1.body.data.request.status === "COMPLETED", req1.body.data.request);
  }

  // -------------------------------------------------------------- TEST 5
  section("TEST 5: completed trip appears in rider history");
  {
    const h = await rider.get("/api/history/rider");
    const entry = h.body.data.entries.find((e: any) => e.tripId === demoTripId);
    check("rider history contains the demo trip", !!entry, h.body.data.entries.length);
    check("entry: COMPLETED, 3 passengers, 2 boarded, 1 missed",
      entry?.status === "COMPLETED" && entry.boarding.total === 3 && entry.boarding.boarded === 2 && entry.boarding.missed === 1, entry);
    check("rider history also contains the seeded completed trips", h.body.data.totals.completed >= 3, h.body.data.totals);
  }

  // -------------------------------------------------------------- TEST 6
  section("TEST 6: each passenger's history shows their boarding status");
  {
    const expect: [Client, string, string][] = [[rahul, "Rahul", "BOARDED"], [amit, "Amit", "BOARDED"], [priya, "Priya", "MISSED"]];
    for (const [client, name, status] of expect) {
      const h = await client.get("/api/history/person");
      const e = h.body.data.entries.find((x: any) => x.tripId === demoTripId);
      check(`${name} → this trip, ${status} (own history)`, e?.boardingStatus === status && e.tripStatus === "COMPLETED" && e.from === "College" && e.to === "Station", e ?? h.body);
    }
    const viaRider = await rider.get("/api/history/person?name=priya");
    const e = viaRider.body.data.entries.find((x: any) => x.tripId === demoTripId);
    check("rider can look up Priya by name → MISSED", e?.boardingStatus === "MISSED", viaRider.body);
    const seeded = await priya.get("/api/history/person");
    check("Priya's history also includes the seeded MISSED trip (requested by Rahul)",
      seeded.body.data.entries.filter((x: any) => x.boardingStatus === "MISSED").length >= 2, seeded.body.data.summary);
    const asPassenger = await priya.get(`/api/requests/${demoReq1}`);
    check("a listed passenger (not the requester) can open the ride from history",
      asPassenger.status === 200 && asPassenger.body.data.trip?.passengers.some((p: any) => p.name === "Priya" && p.boardingStatus === "MISSED"), asPassenger);
    const snoop = await rahul.get("/api/history/person?name=Priya");
    check("student cannot read another person's history → 400", snoop.status === 400, snoop);
  }

  // -------------------------------------------------------------- TEST 9
  section("TEST 9: Toto is available again after completion");
  {
    const cur = await rider.get("/api/trips/current");
    check("vehicle status back to AVAILABLE", cur.body.data.vehicle.status === "AVAILABLE" && cur.body.data.vehicle.currentTripId === null, cur.body.data.vehicle);
    const next = await neha.post("/api/requests", {
      from: "Station", to: "Office", scheduledAt: slot(7, 12), passengers: [{ name: "Neha" }],
    });
    const a = await rider.post(`/api/requests/${next.body.data.request.id}/accept`);
    check("a new non-overlapping request is accepted", a.status === 200 && a.body.data.request.status === "ACCEPTED", a);
    const start = await rider.post(`/api/trips/${a.body.data.trip.id}/start`);
    check("…and can be started (Toto free)", start.status === 200, start);
  }

  // -------------------------------------------------------------- TEST 10
  section("TEST 10: cancelled / clashed requests are never active trips");
  {
    const c = await priya.post("/api/requests", {
      from: "College", to: "Office", scheduledAt: slot(20, 15), passengers: [{ name: "Priya" }],
    });
    const a = await rider.post(`/api/requests/${c.body.data.request.id}/accept`);
    const tripId = a.body.data.trip.id;
    const clash = await amit.post("/api/requests", {
      from: "Office", to: "Station", scheduledAt: slot(20, 15, 10), passengers: [{ name: "Amit" }],
    });
    check("overlapping request is CLASHED", clash.body.data.request.status === "CLASHED" && clash.body.data.request.tripId === null, clash);

    const notOwner = await amit.post(`/api/requests/${c.body.data.request.id}/cancel`);
    check("only the requester can cancel → 404 for others", notOwner.status === 404, notOwner);

    const cancel = await priya.post(`/api/requests/${c.body.data.request.id}/cancel`);
    check("requester cancels the ACCEPTED request", cancel.status === 200 && cancel.body.data.request.status === "CANCELLED", cancel);

    const trip = await rider.get(`/api/trips/${tripId}`);
    check("its trip is CANCELLED (kept for audit)", trip.body.data.trip.status === "CANCELLED", trip.body.data.trip);

    const active = await rider.get("/api/trips?upcoming=true");
    const ids = active.body.data.trips.filter((t: any) => t.status === "ACCEPTED" || t.status === "IN_PROGRESS").map((t: any) => t.id);
    check("cancelled trip is not in the rider's active trips", !ids.includes(tripId), ids);
    const clashedReq = await amit.get(`/api/requests/${clash.body.data.request.id}`);
    check("clashed request has no trip", clashedReq.body.data.trip === null, clashedReq.body.data);

    const reuse = await rahul.post("/api/requests", {
      from: "Station", to: "College", scheduledAt: slot(20, 15), passengers: [{ name: "Rahul" }],
    });
    const ra = await rider.post(`/api/requests/${reuse.body.data.request.id}/accept`);
    check("the freed slot can be booked again", reuse.body.data.request.status === "PENDING" && ra.status === 200, [reuse.body, ra.body]);

    const cancelClashed = await amit.post(`/api/requests/${clash.body.data.request.id}/cancel`);
    check("a CLASHED request cannot be cancelled → 409", cancelClashed.status === 409, cancelClashed);
  }

  // -------------------------------------------------------------- dashboards & misc
  section("Dashboards & error format");
  {
    const rd = await rider.get("/api/dashboard");
    check("rider dashboard has vehicle, currentTrip, pendingRequests, today stats",
      rd.status === 200 && rd.body.data.role === "RIDER" && "currentTrip" in rd.body.data && Array.isArray(rd.body.data.pendingRequests) && typeof rd.body.data.today.passengersBoarded === "number", rd.body);
    const sd = await rahul.get("/api/dashboard");
    check("student dashboard has counts, upcoming ride and recent history",
      sd.status === 200 && typeof sd.body.data.counts.PENDING === "number" && Array.isArray(sd.body.data.recentHistory), sd.body);
    const nf = await rider.get("/api/trips/000000000000000000000000");
    check("unknown trip id → 404 JSON", nf.status === 404 && nf.body.ok === false && nf.body.error.code === "NOT_FOUND", nf);
    const malformed = await rider.get("/api/trips/not-an-id");
    check("malformed id → 404 (no driver error leaked)", malformed.status === 404, malformed);
    const badJson = await rahul.call("POST", "/api/requests", undefined, { "Content-Type": "application/json" });
    check("missing/invalid JSON body → 400", badJson.status === 400, badJson);
    const meta = await anon.get("/api/meta");
    check("public meta lists the 3 locations", meta.status === 200 && meta.body.data.locations.length === 3, meta);
  }
}

// ------------------------------------------------------------------ bootstrap

async function waitForServer(url: string, ms = 120_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.status === 200) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server did not become healthy at ${url}`);
}

function killTree(child: ChildProcess) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    /* already gone */
  }
}

async function main() {
  let replSet: MongoMemoryReplSet | undefined;
  let server: ChildProcess | undefined;
  let mongoUri = process.env.MONGODB_URI ?? "";
  let dbName = process.env.MONGODB_DB ?? "";

  try {
    if (!process.env.API_URL) {
      console.log("Starting in-memory MongoDB replica set…");
      replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
      mongoUri = replSet.getUri();
      dbName = "toto_test";
    } else if (!mongoUri || !dbName) {
      throw new Error("With API_URL you must also set MONGODB_URI and MONGODB_DB (used to seed + inspect)");
    }

    const client = new MongoClient(mongoUri);
    await seed(client.db(dbName));
    await client.close();
    console.log("Seeded.");

    if (!process.env.API_URL) {
      console.log(`Starting Next.js on :${PORT}…`);
      server = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(PORT)], {
        cwd: path.resolve(__dirname, ".."),
        env: { ...process.env, MONGODB_URI: mongoUri, MONGODB_DB: dbName, FRONTEND_ORIGIN: "http://localhost:3000", NEXT_TELEMETRY_DISABLED: "1" },
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      });
      server.stderr?.on("data", (d) => process.env.VERBOSE && process.stderr.write(d));
      server.stdout?.on("data", (d) => process.env.VERBOSE && process.stdout.write(d));
      BASE = `http://localhost:${PORT}`;
    }
    await waitForServer(`${BASE}/api/health`);
    await run(mongoUri, dbName);
  } finally {
    if (server) killTree(server);
    await replSet?.stop();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    console.log("Failed:\n - " + failures.join("\n - "));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
