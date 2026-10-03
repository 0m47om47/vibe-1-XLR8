# AGENTS.md — Lawazia Toto Desk

## Agent Behavior Rules

Before making **any** change to this project, every agent must:

1. Read `AGENTS.md` (this file)
2. Read `PRODUCT.md`
3. Read `UI_GUIDELINES.md`
4. Inspect the existing project structure
5. Understand existing components before creating new ones
6. Reuse existing components wherever possible
7. Preserve all existing functionality
8. Make focused, minimal changes

---

## Critical Constraints

- There is exactly **ONE Toto**. Never build features that imply multiple vehicles exist.
- Do NOT unnecessarily rewrite working code.
- Do NOT create duplicate components when reusable ones already exist.
- Do NOT introduce a new visual style for individual screens.
- The entire application must feel like **one coherent product**.

---

## Tech Stack

| Layer       | Technology              |
|-------------|------------------------|
| Framework   | Next.js (App Router)   |
| Language    | TypeScript             |
| Styling     | Tailwind CSS           |
| Icons       | Lucide React           |
| State       | React local state      |
| Data        | Mock/local state       |
| Auth        | Simulated (Demo Mode)  |

---

## Do NOT Build (Unless Explicitly Requested)

- Backend / API
- MongoDB / Database
- Real authentication
- GPS / Maps / Live tracking
- Fare / Payment
- Multiple Totos
- Chat / Notifications
- Complex admin panel
- External SDKs

---

## Folder Structure

```
app/
  login/
  dashboard/
  request/
  rides/[id]/
  my-trips/
  rider/
    page.tsx
    active/[id]/
    history/

components/
  layout/       → Sidebar, TopHeader, DemoRoleSwitcher
  rides/        → RideCard, RideTimeline, RouteVisualization
  rider/        → BoardingControl, PickupChecklist
  ui/           → StatusBadge, StatBlock, Modal, Toast, EmptyState, Button

lib/
  mock-data.ts  → All mock users, requests, trips
  demo-state.ts → Centralized demo state management
  utils.ts      → Utility functions

AGENTS.md
PRODUCT.md
UI_GUIDELINES.md
```

---

## State Management

Use React Context for centralized demo state. The following must update across screens in real time:

- Ride status (REQUESTED → ACCEPTED / CLASHED)
- Passenger boarding status (PENDING → BOARDED / MISSED)
- Trip completion status
- Rider active trip state
- Person history
- Rider history

---

## Demo Optimization

This app is demonstrated in ~3 minutes. Every design decision should answer:

> "Does this make the 3-minute demo clearer, faster, or more premium?"

If not, don't add it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
