# Lawazia Toto — Backend

API-only Next.js 16 (App Router) app for booking the single Lawazia Toto (e-rickshaw). MongoDB native driver, TypeScript strict. Runs on port 4000; the separate `../frontend` app proxies `/api/*` here. Full API reference and design notes: `README.md`.

## Commands

```bash
npm run dev         # http://localhost:4000 (needs MONGODB_URI / MONGODB_DB in .env.local)
npm run typecheck   # tsc --noEmit
npm run test:api    # end-to-end suite: in-memory replica set + real Next server, no Atlas needed
npm run seed        # WIPES users/sessions/rideRequests/trips/vehicles in MONGODB_DB, loads demo data
npm run build
```

Run `typecheck` and `test:api` after any change to services, routes or lib. Never run `seed` or `test:api` with `API_URL` against a database whose data matters — both reset it.

## Layout

- `src/app/api/**/route.ts` — thin handlers: `route()` wrapper → auth guard → validate → call a service → `ok()`.
- `src/services/` — all business logic (requests, trips, history, dashboard, auth).
- `src/lib/` — infrastructure: `totoLock.ts` (booking transactions), `clashDetection.ts` (overlap rules), `auth.ts`/`session.ts`/`password.ts`, `validation.ts`, `http.ts`/`errors.ts`, `dbSetup.ts` (collections + indexes), `config.ts` (env).
- `src/models/` — document types, status enums and `to*DTO` serializers.
- `src/proxy.ts` — CORS + cross-origin mutation blocking (Next 16's renamed middleware). Not for auth.
- `scripts/` — `seedData.ts` (shared by seed and tests), `seed.ts`, `api-test.ts`.

## Rules that must hold

- **Booking changes go through `withTotoReservation()`.** Anything that creates, accepts, starts, cancels or completes a booking runs inside it. It writes the single `vehicles` doc first so MongoDB serialises those transactions; a plain transaction without that write allows double booking (write skew). The callback may run more than once, so it must only do DB writes via `session` and return a value.
- **Clash checks are server-side only**, using `findConflictingTrip` / `overlapFilter`. Overlap is half-open: `newStart < existingEnd && newEnd > existingStart`. Only `ACCEPTED` and `IN_PROGRESS` trips block.
- **Losing an accept commits the request as `CLASHED`, then the route returns 409 `TRIP_CLASH`.** Return an outcome from the transaction; don't throw inside it, or the `CLASHED` write is rolled back.
- **Keep request status in sync with its trip** (`IN_PROGRESS`, `COMPLETED`, `CANCELLED`) in the same transaction.
- **History reads `trips`, never `rideRequests`.** A passenger who didn't board must still appear as `MISSED`.
- **Identity comes only from the session** (`requireAuth()` / `requireRole()` / `requireRider()` / `requirePassenger()`). Never read a user id from the body or query. Trip mutations also filter on `riderId` in the database query.
- **Someone else's resource returns 404, not 403**, so ids can't be probed. A wrong role returns 403.
- **Errors:** throw `ApiError` helpers from `lib/errors.ts` for client-facing errors. Anything else becomes a generic 500; never put driver messages in responses.
- **Never return `passwordHash`.** Convert user documents with `toPublicUser`.
- **Validate input in `lib/validation.ts`.** Type-check every field, build output objects field by field, and never pass raw request values into queries.
- **Stored `endsAt`:** documents store `endsAt` (`scheduledAt + estimatedDurationMinutes`) so overlap queries hit the `vehicle_status_window` index. Keep it set on every write that changes `scheduledAt`.

## Conventions

- **Responses** use one envelope: `{ ok: true, data }` / `{ ok: false, error: { code, message, details? } }`.
- **Route params are a Promise** in Next 16: `const { id } = await params`. Parse ids with `parseObjectId()`, which returns 404 for malformed ids.
- **Dates:** stored as `Date`; returned as ISO strings via the DTO functions. Clients must send zoned ISO-8601.
- **Dependencies:** no new runtime dependencies without a strong reason. The stack is deliberately `next` + `mongodb` only (scrypt and session tokens use `node:crypto`).
- **Indexes:** add new ones in `ensureDatabase()` (`lib/dbSetup.ts`). It is idempotent and runs once per process.
- **Tests:** add a case to `scripts/api-test.ts` for each new endpoint or rule, covering the unauthorised and invalid-state paths as well as the happy path.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
