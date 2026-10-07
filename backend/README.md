# Lawazia Toto — Backend (API)

A plain **Node.js + Express** API, written in JavaScript (no TypeScript, no build step). It uses MongoDB (native driver) for storage. There is no framework beyond Express — the only runtime dependencies are `express`, `cookie-parser` and `mongodb`.

It runs on **http://localhost:4000**. The frontend (`../frontend`) proxies `/api/*` to it, so the browser only ever talks to its own origin and the session cookie stays first-party.

---

## 1. Setup

```bash
cd backend
npm install
cp .env.example .env.local      # then fill in MONGODB_URI (see §2)
npm run seed                    # demo users + sample data
npm run dev                     # http://localhost:4000
```

Check it works: `GET http://localhost:4000/api/health` should return `{"ok":true,"data":{"status":"ok","database":"connected"}}`.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on :4000, restarts on save (`node --watch`) |
| `npm start` | Production server on :4000 (plain `node server.js`) |
| `npm run seed` | **Wipes** the app collections in `MONGODB_DB` and loads demo data |
| `npm run test:api` | End-to-end tests (103 checks). Starts a throwaway in-memory MongoDB replica set plus the real Express app in-process, so no Atlas is needed |

There is no build/typecheck step — it's plain JavaScript, run directly by Node.

## 2. MongoDB Atlas setup

1. Create a free account at <https://cloud.mongodb.com> and create a **free M0 cluster**.
2. **Database Access** → *Add New Database User* → choose username/password auth and the role *Read and write to any database*.
3. **Network Access** → *Add IP Address* → add your current IP. For quick local testing you can use `0.0.0.0/0`.
4. **Database** → *Connect* → *Drivers* → copy the connection string, e.g.
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Put it in `backend/.env.local` as `MONGODB_URI`. URL-encode special characters in the password.

> Transactions require a **replica set**. Every Atlas cluster, including M0, is one. A plain standalone `mongod` is **not**. If you use a local MongoDB, start it as a single-node replica set (`mongod --replSet rs0`, then `rs.initiate()`).

Collections and indexes are created automatically on first use. The seed script creates them too.

## 3. Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | ✅ | — | Atlas connection string |
| `MONGODB_DB` | ✅ | — | Database name, e.g. `lawazia_toto` |
| `FRONTEND_ORIGIN` | recommended | — | Browser origin of the frontend (`http://localhost:3000`). Mutating requests from other origins get 403 (CSRF defence). It is also the only CORS origin allowed with credentials |
| `PORT` | | `4000` | Port the Express server listens on |
| `TRIP_DURATION_MINUTES` | | `30` | Estimated trip length used for overlap detection |
| `MAX_PASSENGERS` | | `6` | Passengers per request |
| `SESSION_TTL_DAYS` | | `7` | Session lifetime |

`.env.local` is git-ignored. Only `.env.example` is committed.

## 4. Demo accounts (after `npm run seed`)

All passwords: **`password123`**

| Role | Name | Email |
|---|---|---|
| RIDER | Ravi Kumar | rider@lawazia.test |
| STUDENT | Rahul | rahul@lawazia.test |
| STUDENT | Priya | priya@lawazia.test |
| EMPLOYEE | Amit | amit@lawazia.test |
| EMPLOYEE | Neha | neha@lawazia.test |
| ADMIN | Om Choubey | admin@lawazia.test |

Seeded data. Times are in the server's local timezone, relative to the day you run the seed:

| When | Route | Passengers | State |
|---|---|---|---|
| 2 days ago 17:30 | Office → College | Amit ✓, Neha ✓, Rohit ✗ | COMPLETED |
| 2 days ago 17:45 | Office → Station | Neha | CLASHED with the trip above |
| Yesterday 10:00 | College → Station | Rahul ✓, Amit ✓, Priya ✗ | COMPLETED |
| **Tomorrow 10:00** | **College → Station** | **Rahul, Amit, Priya** | **PENDING (demo Request 1)** |
| **Tomorrow 10:00** | **Office → Station** | **Neha, Rohit** | **PENDING (demo Request 2)** |
| Tomorrow 14:00 | Station → Office | Priya | ACCEPTED |
| Tomorrow 14:15 | College → Office | Neha | CLASHED with the 14:00 trip |
| Tomorrow 17:00 | Office → College | Amit | PENDING |
| Day after 09:00 | College → Office | Priya, Rahul | CANCELLED |

Plus two role requests for the admin demo: Rahul's PENDING request to become an EMPLOYEE, and Priya's already-APPROVED one.

To run the ride demo, accept Request 1 as the rider; Request 2 then becomes CLASHED. Start the trip, mark Rahul and Amit BOARDED and Priya MISSED, then complete it. To see the admin side, log in as `admin@lawazia.test` and approve/reject Rahul's pending role request from `/api/admin/role-requests`.

---

## 5. API reference

Every response uses the same envelope:

```jsonc
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": { "code": "TRIP_CLASH", "message": "…", "details": { ... } } }
```

| Status | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `BAD_REQUEST` | Invalid input. `details` maps field → message, e.g. `"passengers.1.name"` |
| 401 | `UNAUTHENTICATED` | No or expired session, or bad credentials |
| 403 | `FORBIDDEN` | Wrong role, someone else's trip, or a cross-origin mutation |
| 404 | `NOT_FOUND` | Unknown id, unknown route, or a resource you may not see. Ids are not leaked |
| 409 | `TRIP_CLASH` | The Toto is already booked for an overlapping window |
| 409 | `CONFLICT` / `INVALID_STATE` | Duplicate email, or an illegal state transition |
| 500 | `INTERNAL_ERROR` | Unexpected error. Details are logged server-side, never returned |

Auth is a `toto_session` HTTP-only cookie set by login/register. Dates are ISO-8601 UTC strings.

### Auth

| Method & path | Role | Body / query | Result |
|---|---|---|---|
| `POST /api/auth/register` | public | `{ name, email, password, role: "STUDENT"\|"EMPLOYEE" }` | 201 `{ user }` + cookie. Riders and admins can't self-register |
| `POST /api/auth/login` | public | `{ email, password }` | 200 `{ user }` + cookie |
| `POST /api/auth/logout` | any | — | Deletes the server session, clears the cookie |
| `GET /api/auth/me` | any logged-in | — | `{ user }` |
| `GET /api/auth/session` | public | — | `{ user }` or `{ user: null }` (always 200), so the UI can check login without a 401 |

### Ride requests

| Method & path | Role | Body / query | Result |
|---|---|---|---|
| `POST /api/requests` | STUDENT, EMPLOYEE | `{ from, to, scheduledAt, passengers: [{ name }] }` | 201 `{ request, clashed }`. `status` is `PENDING`, or `CLASHED` if the Toto is already booked then |
| `GET /api/requests` | any | `?status=&upcoming=true&limit=` | `{ requests }`. Students/employees see their own; the rider sees all |
| `GET /api/requests/:id` | owner, a listed passenger, or RIDER | — | `{ request, trip }`. `trip` includes per-passenger boarding |
| `POST /api/requests/:id/cancel` | owner | — | `{ request }`. Allowed while `PENDING`, or `ACCEPTED` and not started (also cancels the trip and frees the Toto) |
| `POST /api/requests/:id/accept` | RIDER | — | 200 `{ outcome: "ACCEPTED", request, trip, clashedRequestIds }` or **409 `TRIP_CLASH`** (the request is now `CLASHED`) |

`from` / `to` must be one of `College`, `Station` or `Office`, and they must differ. `scheduledAt` is ISO-8601 with a timezone, in the future, and within 60 days. A request has 1–6 passengers, and names must be unique within it (case-insensitive).

### Trips (rider workflow)

| Method & path | Role | Body / query | Result |
|---|---|---|---|
| `GET /api/trips` | RIDER | `?status=&upcoming=true&limit=` | `{ trips }` operated by this rider |
| `GET /api/trips/current` | RIDER | — | `{ trip, vehicle }`: the in-progress trip, else the next accepted one, plus the Toto's status |
| `GET /api/trips/:id` | RIDER, or the requester/passenger | — | `{ trip }` |
| `POST /api/trips/:id/start` | assigned RIDER | — | `ACCEPTED → IN_PROGRESS`. 409 if another trip is in progress |
| `PATCH /api/trips/:id/passengers/:passengerId` | assigned RIDER | `{ boardingStatus: "BOARDED"\|"MISSED" }` | `{ trip }`. Only while `IN_PROGRESS`, and correctable until completion |
| `POST /api/trips/:id/complete` | assigned RIDER | — | `IN_PROGRESS → COMPLETED`. 409 with `details.pendingPassengers` if anyone is still `PENDING` |

A trip DTO includes `boarding: { total, boarded, missed, pending }`, `canStart` and `canComplete`. These are computed on the server, so the UI never re-implements the rules.

### History & dashboard

| Method & path | Role | Query | Result |
|---|---|---|---|
| `GET /api/history/person` | STUDENT/EMPLOYEE | — | Own history: `{ person, summary, entries[] }` |
| `GET /api/history/person?name=Rahul` | RIDER | `name` | That passenger on trips this rider handled |
| `GET /api/history/rider` | RIDER | `?status=&limit=` | `{ totals, entries[] }`. Each entry has boarded/missed counts |
| `GET /api/dashboard` | any | rider: `?dayStart=<ISO>` | Role-specific summary (see `services/dashboardService.js`) |
| `GET /api/meta` | public | — | `{ locations, tripDurationMinutes, maxPassengers, maxBookingDaysAhead }` |
| `GET /api/health` | public | — | DB connectivity |

### Role requests (self-service)

| Method & path | Role | Body / query | Result |
|---|---|---|---|
| `GET /api/role-requests/mine` | any logged-in | — | This user's own role-change requests, newest first |
| `POST /api/role-requests/mine` | any logged-in | `{ requestedRole, reason? }` | Creates a `PENDING` request. 409 if one is already pending, 400 if you already have that role |

### Admin

Everything under `/api/admin` requires the `ADMIN` role.

| Method & path | Body / query | Result |
|---|---|---|
| `GET /api/admin` | — | Dashboard: user/trip counts, current trip, recent trips, recent pending role requests |
| `GET /api/admin/users` | `?search=&role=&accountStatus=` | Every user (no password hash) with their trip count |
| `GET /api/admin/users/:id` | — | One user's detail: stats, trips, any pending role request |
| `PATCH /api/admin/users/:id` | `{ role? }` or `{ accountStatus? }` | Changes the user's role or account status directly |
| `GET /api/admin/role-requests` | `?status=` | All role requests |
| `POST /api/admin/role-requests` | `{ requestedRole, reason? }` | Same as `POST /api/role-requests/mine`, usable by an admin too |
| `PATCH /api/admin/role-requests/:id` | `{ action: "approve" }` or `{ action: "reject", rejectionReason? }` | Approves (also updates the user's role) or rejects the request |
| `GET /api/admin/trips` | `?status=&riderId=` | All trips |
| `GET /api/admin/trips/:id` | — | One trip's detail |
| `GET /api/admin/riders` | — | Every rider with trip/boarding stats and whether they're free right now |
| `GET /api/admin/riders/:id` | — | One rider's detail, including their trip history |
| `GET /api/admin/analytics` | — | Trips today/this week, boarding rate, most-used route, peak hour |

---

## 6. Clash detection & the concurrency guarantee

**Overlap.** A trip occupies `[scheduledAt, scheduledAt + duration)`, where the duration defaults to 30 minutes. Two trips overlap when `newStart < existingEnd && newEnd > existingStart`. The interval is half-open, so back-to-back trips (10:00–10:30 and 10:30–11:00) are fine. Only `ACCEPTED` and `IN_PROGRESS` trips hold the Toto. `endsAt` is stored on every document so the overlap query is a single indexed range scan (`lib/clashDetection.js`).

**When clashes are decided.** All of this happens on the server; the client is never trusted:

- **On create:** if the window overlaps an active trip, the request is stored as `CLASHED` straight away.
- **On accept:** inside the transaction, the server re-checks for an overlapping active trip.
  - If one exists, it commits *this* request as `CLASHED` and returns **409**.
  - Otherwise it creates the trip, marks the request `ACCEPTED`, and marks every other overlapping `PENDING` request `CLASHED`.

**Why two simultaneous accepts can't both win** (`lib/totoLock.js`):

A transaction that only *reads* "no overlapping trip" and then inserts its own trip is not enough. MongoDB transactions use snapshot isolation, so two transactions can both read "free", insert *different* documents and both commit. That anomaly is called *write skew*.

The fix is that every booking transaction (create, accept, start, cancel, complete) first does `$inc` on the single **Toto document** in `vehicles`. MongoDB lets only one open transaction modify a document. The second transaction gets a `WriteConflict`, and the driver's `withTransaction` retries it from scratch. On the retry it sees the winner's committed trip, so it ends up `CLASHED` → 409. The lock lives in the database, so this holds across any number of server instances.

As a second, independent safeguard, a **partial unique index** `{ vehicleId: 1 }` where `status: "IN_PROGRESS"` makes it physically impossible to store two in-progress trips.

**Verified:** `npm run test:api` fires 5 accepts for mutually-overlapping requests at the same instant, 5 rounds in a row. Each round, exactly one wins, four get 409 and end `CLASHED`, and the database holds exactly one active trip.

## 7. Database design

Six collections. Passenger lists are **embedded**: they are small and bounded, always read with their parent, and must be frozen exactly as they were on the trip.

```
users         { _id, name, nameKey, email (unique), passwordHash, role, accountStatus, createdAt, updatedAt }
sessions      { _id: sha256(token), userId, createdAt, expiresAt (TTL) }
vehicles      { _id: "toto-1", name, status: AVAILABLE|ON_TRIP, currentTripId, lockVersion, lastLockedAt }
rideRequests  { _id, requesterId, requesterName, requesterRole, from, to, scheduledAt, endsAt,
                estimatedDurationMinutes, passengers: [{ _id, name, nameKey, userId }],
                status: PENDING|ACCEPTED|IN_PROGRESS|COMPLETED|CLASHED|CANCELLED,
                tripId, clashedWithTripId, statusReason, cancelledAt, createdAt, updatedAt }
trips         { _id, vehicleId, requestId (unique), requesterId, requesterName, riderId, riderName,
                from, to, scheduledAt, endsAt, estimatedDurationMinutes,
                passengers: [{ _id, name, nameKey, userId, boardingStatus: PENDING|BOARDED|MISSED,
                               boardedAt, statusUpdatedAt }],
                status: ACCEPTED|IN_PROGRESS|COMPLETED|CANCELLED,
                acceptedAt, startedAt, completedAt, cancelledAt, createdAt, updatedAt }
roleRequests  { _id, userId, userName, userEmail, currentRole, requestedRole, reason,
                status: PENDING|APPROVED|REJECTED,
                reviewedBy, reviewerName, rejectionReason, reviewedAt, createdAt, updatedAt }
```

Design notes:

- **`endsAt`** is stored for indexable overlap queries.
- **`nameKey`** is a normalised, lower-case name, so "Rahul" and "rahul " match in history.
- A passenger `_id` is shared between a request and its trip, which keeps the boarding API addressable.
- **`vehicles`** gives one place to serialise bookings and expose "Toto available".
- **`sessions`** allows real logout and revocation.
- Request status mirrors the trip's (`IN_PROGRESS`/`COMPLETED`) in the same transaction, so a requester sees one status.
- **`accountStatus`** (`ACTIVE`/`PENDING`/`SUSPENDED`) and **`roleRequests`** back the admin dashboard's user management and role-change approval flow.

Indexes (`lib/dbSetup.js`):

- **users:** `email` (unique), `nameKey`
- **sessions:** `expiresAt` (TTL), `userId`
- **rideRequests:**
  - `{requesterId, scheduledAt}`: "my requests"
  - `{status, scheduledAt, endsAt}`: rider queue + clash cascade
  - `passengers.nameKey`
  - `tripId`
- **trips:**
  - `{vehicleId, status, scheduledAt, endsAt}`: overlap check
  - `{riderId, scheduledAt}`: rider history
  - `{status, scheduledAt}`
  - `{passengers.nameKey, scheduledAt}` and `{passengers.userId, scheduledAt}`: person history
  - `requestId` (unique)
  - partial unique "one IN_PROGRESS trip per vehicle"
- **roleRequests:** `{userId, status}`, `{status, createdAt}`

### How boarding history works

History is read from **`trips`**, the record of what the Toto actually did, never from requests. Every requested passenger is copied into the trip with `boardingStatus: PENDING`. The rider sets each one to `BOARDED` or `MISSED` with an atomic positional update. Completion is only possible when none are `PENDING`; the database update filter itself enforces this.

- **Person history:** `$unwind`s trip passengers matching the user's account or name. A passenger who never boarded still shows up with `MISSED`.
- **Rider history:** lists the rider's trips with boarded/missed counts.

## 8. Security summary

- **Passwords:** hashed with scrypt (Node built-in), with a random salt and a constant-time compare. Unknown emails still pay the hash cost, so timing doesn't leak which accounts exist.
- **Sessions:** a 256-bit random token in an `HttpOnly; SameSite=Lax` cookie (`Secure` in production). Only its SHA-256 is stored. Logout deletes the session, and a TTL index expires old ones.
- **Identity:** always comes from the session. Client-supplied user ids are never read.
- **Authorisation:** enforced in every handler via `requireAuth()` / `requireRole()`. Trip mutations also require `riderId == current user` inside the database filter. Admin-only routes call `requireAdmin()`.
- **Validation:** all input is type-checked, which blocks `{ "$ne": … }`-style operator injection. Unknown fields are dropped, names are normalised and character-restricted, and dates must be zoned ISO-8601.
- **CSRF:** SameSite cookie, plus `middleware/cors.js` rejects cross-origin mutating requests.
- **Errors:** 500s return a generic message. Driver errors and stack traces are only logged.

## 9. Assumptions

- There is one Toto and one rider account (seeded). The code supports several rider accounts sharing the one Toto; only the assigned rider can operate a trip.
- Riders and admins are provisioned (seed/admin), not self-registered.
- `CLASHED` is final. If the blocking trip is later cancelled, the clashed request is not revived; the requester submits a new one.
- A request can be accepted only before its pickup time. A requester can cancel until pickup starts.
- Overlap uses the *scheduled* window. If an in-progress trip overruns, the next trip simply can't be started until it is completed, because of the unique in-progress index.
- Person history matches a passenger by name (case-insensitive) or by linked account. Two different people with the same name share history; that is a known limitation of name-based passenger lists.
- `accountStatus` (`SUSPENDED` etc.) is tracked and settable by an admin, but is not currently enforced at login or on any route — it's data for the admin dashboard today, not yet a gate.

## 10. Project structure

```
backend/
  server.js            entry point — starts the Express app
  app.js                builds the Express app: middleware, routes, error handler
  lib/                  config, MongoDB connection, auth, sessions, password hashing,
                         the Toto lock, clash detection, validation, HTTP helpers
  middleware/
    cors.js             CORS + CSRF origin check for /api/*
  models/                document shapes and toXDTO(...) serializers (plain data + functions, no classes)
  services/              business logic — one file per domain (auth, requests, trips, history, dashboard, admin)
  routes/                thin Express routers: parse input, call a service, call ok()/throw an ApiError
  scripts/
    seedData.js           shared by seed.js and api-test.js
    seed.js               npm run seed
    api-test.js           npm run test:api
```

No TypeScript, no build step, no framework beyond Express — `node server.js` is the whole app.
