# Lawazia Toto — Backend

Plain Node.js + Express API (JavaScript, no TypeScript, no build step) for booking the single Lawazia Toto (e-rickshaw). MongoDB native driver. Runs on port 4000; the separate `../frontend` app proxies `/api/*` here. Full API reference and design notes: `README.md`.

## Commands

```bash
npm run dev         # http://localhost:4000, restarts on save (needs MONGODB_URI / MONGODB_DB in .env.local)
npm run test:api    # end-to-end suite: in-memory replica set + the real Express app in-process, no Atlas needed
npm run seed        # WIPES users/sessions/rideRequests/trips/vehicles/roleRequests in MONGODB_DB, loads demo data
npm start           # production server (plain `node server.js`)
```

There is no `typecheck`/`build` step — run `node --check <file>` on anything you change, and run `test:api` after any change to `services/`, `routes/` or `lib/`. Never run `seed` or `test:api` with `API_URL` against a database whose data matters — both reset it.

## Layout

- `server.js` / `app.js` — entry point and Express app wiring (middleware, routers, error handler).
- `routes/` — thin Express routers: parse `req`, call a service, call `ok(res, data)` or throw an `ApiError`. One file per resource (`auth`, `requests`, `trips`, `history`, `dashboard`, `meta`, `health`, `roleRequests`, `admin`).
- `services/` — all business logic (requests, trips, history, dashboard, auth, admin).
- `lib/` — infrastructure: `totoLock.js` (booking transactions), `clashDetection.js` (overlap rules), `auth.js`/`session.js`/`password.js`, `validation.js`, `http.js`/`errors.js`, `dbSetup.js` (collections + indexes), `config.js` (env).
- `models/` — plain object shapes, status-enum arrays and `to*DTO()` serializer functions (no classes, no ORM).
- `middleware/cors.js` — CORS + cross-origin mutation blocking. Not for auth.
- `scripts/` — `seedData.js` (shared by seed and tests), `seed.js`, `api-test.js`.

## Rules that must hold

- **Booking changes go through `withTotoReservation()`.** Anything that creates, accepts, starts, cancels or completes a booking runs inside it. It writes the single `vehicles` doc first so MongoDB serialises those transactions; a plain transaction without that write allows double booking (write skew). The callback may run more than once, so it must only do DB writes via `session` and return a value.
- **One request per trip.** (There is no shared-ride/pooling feature in this codebase — don't assume `trip.requests[]`; a trip has a single `requestId`.)
- **Clash checks are server-side only**, using `findConflictingTrip` / `overlapFilter`. Overlap is half-open: `newStart < existingEnd && newEnd > existingStart`. Only `ACCEPTED` and `IN_PROGRESS` trips block.
- **Losing an accept commits the request as `CLASHED`, then the route returns 409 `TRIP_CLASH`.** Return an outcome from the transaction; don't throw inside it, or the `CLASHED` write is rolled back.
- **Keep request status in sync with its trip** (`IN_PROGRESS`, `COMPLETED`, `CANCELLED`) in the same transaction.
- **History reads `trips`, never `rideRequests`.** A passenger who didn't board must still appear as `MISSED`.
- **Identity comes only from the session** (`requireAuth(req)` / `requireRole(req, ...)` / `requireRider(req)` / `requirePassenger(req)` / `requireAdmin(req)`). Never read a user id from the body or query. Trip mutations also filter on `riderId` in the database query.
- **Someone else's resource returns 404, not 403**, so ids can't be probed. A wrong role returns 403.
- **Errors:** throw `ApiError` helpers from `lib/errors.js` for client-facing errors, inside an `asyncRoute(...)`-wrapped handler so Express's error middleware catches them. Anything else becomes a generic 500; never put driver messages in responses.
- **Never return `passwordHash`.** Convert user documents with `toPublicUser`.
- **Validate input in `lib/validation.js`.** Type-check every field, build output objects field by field, and never pass raw request values into queries.
- **Stored `endsAt`:** documents store `endsAt` (`scheduledAt + estimatedDurationMinutes`) so overlap queries hit the `vehicle_status_window` index. Keep it set on every write that changes `scheduledAt`.

## Conventions

- **Responses** use one envelope: `{ ok: true, data }` / `{ ok: false, error: { code, message, details? } }`, via `ok(res, data, status?)` / thrown `ApiError`.
- **Route params are synchronous:** `req.params.id`, `req.query.foo`. Parse ids with `parseObjectId()`, which returns 404 for malformed ids.
- **Every async route handler must be wrapped in `asyncRoute(...)`** (see `lib/http.js`) — Express 4 does not forward a rejected promise to the error middleware on its own.
- **Dates:** stored as `Date`; returned as ISO strings via the DTO functions. Clients must send zoned ISO-8601.
- **Dependencies:** no new runtime dependencies without a strong reason. The stack is deliberately `express` + `mongodb` + `cookie-parser` only (scrypt and session tokens use `node:crypto`).
- **Indexes:** add new ones in `ensureDatabase()` (`lib/dbSetup.js`). It is idempotent and runs once per process.
- **Tests:** add a case to `scripts/api-test.js` for each new endpoint or rule, covering the unauthorised and invalid-state paths as well as the happy path. The suite starts its own in-memory MongoDB and calls `app.listen()` in-process — it doesn't spawn a child process.
- **No TypeScript, no JSDoc type annotations.** Plain JS, CommonJS (`require`/`module.exports`).
