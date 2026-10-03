import type { ObjectId } from "mongodb";
import type { UserRole } from "./User";
import type { TripStatus } from "./Trip";

export const LOCATIONS = ["College", "Station", "Office"] as const;
export type Location = (typeof LOCATIONS)[number];

/**
 * Request lifecycle. PENDING → ACCEPTED → IN_PROGRESS → COMPLETED,
 * or PENDING → CLASHED, or PENDING/ACCEPTED → CANCELLED.
 * IN_PROGRESS/COMPLETED mirror the linked trip so a requester sees one status.
 */
export const REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CLASHED",
  "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface RequestPassenger {
  /** Stable id; the trip's passenger entry reuses it. */
  _id: ObjectId;
  name: string;
  nameKey: string;
  /** Linked account when the passenger is known to be a registered user (e.g. the requester). */
  userId: ObjectId | null;
}

export interface RideRequestDoc {
  _id: ObjectId;
  requesterId: ObjectId;
  /** Snapshot so listings don't need a join. */
  requesterName: string;
  requesterRole: UserRole;
  from: Location;
  to: Location;
  scheduledAt: Date;
  /** scheduledAt + estimatedDurationMinutes; stored so overlap queries can use an index. */
  endsAt: Date;
  estimatedDurationMinutes: number;
  passengers: RequestPassenger[];
  status: RequestStatus;
  tripId: ObjectId | null;
  /** When CLASHED: the trip that holds the Toto for the overlapping window. */
  clashedWithTripId: ObjectId | null;
  /** Human-readable explanation for CLASHED / CANCELLED. */
  statusReason: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RequestDTO = {
  id: string;
  requester: { id: string; name: string; role: UserRole };
  from: Location;
  to: Location;
  scheduledAt: string;
  endsAt: string;
  estimatedDurationMinutes: number;
  passengers: { id: string; name: string }[];
  passengerCount: number;
  status: RequestStatus;
  tripId: string | null;
  tripStatus: TripStatus | null;
  clashedWithTripId: string | null;
  statusReason: string | null;
  /** True when the requested window has already started and it can no longer be accepted. */
  isPast: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toRequestDTO(doc: RideRequestDoc, now = new Date()): RequestDTO {
  // Request status is kept in sync with its trip inside the same transactions.
  const tripStatus: TripStatus | null = doc.tripId
    ? doc.status === "CANCELLED"
      ? "CANCELLED"
      : (doc.status as TripStatus)
    : null;
  return {
    id: doc._id.toHexString(),
    requester: { id: doc.requesterId.toHexString(), name: doc.requesterName, role: doc.requesterRole },
    from: doc.from,
    to: doc.to,
    scheduledAt: doc.scheduledAt.toISOString(),
    endsAt: doc.endsAt.toISOString(),
    estimatedDurationMinutes: doc.estimatedDurationMinutes,
    passengers: doc.passengers.map((p) => ({ id: p._id.toHexString(), name: p.name })),
    passengerCount: doc.passengers.length,
    status: doc.status,
    tripId: doc.tripId?.toHexString() ?? null,
    tripStatus,
    clashedWithTripId: doc.clashedWithTripId?.toHexString() ?? null,
    statusReason: doc.statusReason,
    isPast: doc.scheduledAt.getTime() <= now.getTime(),
    cancelledAt: doc.cancelledAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
