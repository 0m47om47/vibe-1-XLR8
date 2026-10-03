# PRODUCT.md — Lawazia Toto Desk

## Overview

Lawazia Toto Desk is an internal transportation management product for Lawazia. It manages a single Toto vehicle that transports students and employees between three locations: **College**, **Station**, and **Office**.

---

## The Single Toto Rule

Lawazia has exactly **ONE Toto**. This is the most important business constraint. The application must NEVER behave as if multiple Totos exist.

---

## Roles

### Student / Employee (Passenger)
- Request a Toto ride
- Add multiple passengers to a request
- View their ride status
- See boarding status (Boarded / Missed)
- View personal trip history

### Rider (Toto Operator)
- View incoming ride requests
- Accept a request
- Prevent conflicting requests (same-time clash)
- Start and manage pickup
- Mark each passenger as Boarded or Missed
- Complete the trip
- View complete rider history

---

## Locations

| ID       | Name    |
|----------|---------|
| college  | College |
| station  | Station |
| office   | Office  |

---

## Business Rules

### Rule 1 — One Toto
There is exactly one Toto. All logic revolves around this single vehicle.

### Rule 2 — One Active Trip
The rider can only have one active trip at a time.

### Rule 3 — Same-Time Clash
Two ride requests cannot both be accepted for the same time.

When Request A is accepted for 10:30 AM:
- Request A → **ACCEPTED**
- Any other request at 10:30 AM → **CLASHED**

Clashed requests display:
- "Time slot unavailable"
- "The Toto is already assigned for this time."

### Rule 4 — Individual Passenger Status
Every passenger has their own boarding status:
- `PENDING` — Not yet processed
- `BOARDED` — Successfully boarded
- `MISSED` — Did not board

### Rule 5 — Complete Trip Gate
The rider cannot complete a trip until **every** passenger is marked as either BOARDED or MISSED.

### Rule 6 — Completed Trip Immutability
Once a trip is completed:
- Passenger statuses cannot be changed
- Trip cannot be edited
- Trip moves to history

### Rule 7 — Person History
A person's trip history must include **every** trip where they appear as a passenger, not just trips they created.

### Rule 8 — Rider History
Rider history contains every trip handled by the rider.

---

## Ride Lifecycle

```
REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED
                ↘
              CLASHED (for conflicting time slots)
```

---

## Passenger Lifecycle

```
PENDING → BOARDED
       → MISSED
```

---

## Core Demo Flow

1. Student logs in
2. Views dashboard
3. Requests a ride (College → Station, 10:30 AM, 3 passengers)
4. Sees REQUESTED status
5. Switch to Rider
6. Rider sees incoming requests
7. Rider accepts first 10:30 AM request
8. Second 10:30 AM request auto-clashes
9. Rider opens active trip
10. Rider marks passengers: Om → BOARDED, Rahul → BOARDED, Amit → MISSED
11. Live summary: 2 Boarded / 1 Missed
12. Rider completes trip
13. Success state shown
14. Rider history updated
15. Switch to Student
16. Student sees completed trip in My Trips
17. Student sees their boarding status

---

## Mock Data

### Users
| Name         | Role     |
|-------------|----------|
| Om Choubey  | Student  |
| Rahul Kumar | Employee |
| Raj Kumar   | Rider    |

### Ride Requests
| ID   | Route             | Time     | Passengers                          |
|------|-------------------|----------|-------------------------------------|
| 1    | College → Station | 10:30 AM | Om Choubey, Rahul Kumar, Amit Kumar |
| 2    | Office → College  | 10:30 AM | Priya Sharma, Neha Singh            |
| 3    | Station → Office  | 12:30 PM | Amit Kumar                          |
