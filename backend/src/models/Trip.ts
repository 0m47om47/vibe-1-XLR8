import type { ObjectId } from "mongodb";
import type { Location } from "./RideRequest";

/**
 * ACCEPTED → IN_PROGRESS → COMPLETED. ACCEPTED → CANCELLED when the requester
 * cancels before pickup (frees the Toto; the record is kept for audit).
 */
export const TRIP_STATUSES = ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

/** Trips in these states hold the Toto for their time window. */
export const ACTIVE_TRIP_STATUSES = ["ACCEPTED", "IN_PROGRESS"] as const satisfies readonly TripStatus[];

export const BOARDING_STATUSES = ["PENDING", "BOARDED", "MISSED"] as const;
export type BoardingStatus = (typeof BOARDING_STATUSES)[number];

export interface TripPassenger {
  /** Same id as the passenger in the originating request. */
  _id: ObjectId;
  name: string;
  nameKey: string;
  userId: ObjectId | null;
  boardingStatus: BoardingStatus;
  boardedAt: Date | null;
  /** Last time the rider changed this passenger's status. */
  statusUpdatedAt: Date | null;
}

/**
 * A trip is the permanent, factual record of a Toto run. Passenger entries are
 * embedded: they are always read with the trip, bounded in size, and must stay
 * exactly as they were when the trip completed.
 */
export interface TripDoc {
  _id: ObjectId;
  vehicleId: string;
  requestId: ObjectId;
  requesterId: ObjectId;
  requesterName: string;
  riderId: ObjectId;
  riderName: string;
  from: Location;
  to: Location;
  scheduledAt: Date;
  endsAt: Date;
  estimatedDurationMinutes: number;
  passengers: TripPassenger[];
  status: TripStatus;
  acceptedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BoardingSummary = { total: number; boarded: number; missed: number; pending: number };

export function summariseBoarding(passengers: Pick<TripPassenger, "boardingStatus">[]): BoardingSummary {
  const summary: BoardingSummary = { total: passengers.length, boarded: 0, missed: 0, pending: 0 };
  for (const p of passengers) {
    if (p.boardingStatus === "BOARDED") summary.boarded++;
    else if (p.boardingStatus === "MISSED") summary.missed++;
    else summary.pending++;
  }
  return summary;
}

export type TripDTO = {
  id: string;
  requestId: string;
  requester: { id: string; name: string };
  rider: { id: string; name: string };
  from: Location;
  to: Location;
  scheduledAt: string;
  endsAt: string;
  estimatedDurationMinutes: number;
  passengers: {
    id: string;
    name: string;
    boardingStatus: BoardingStatus;
    boardedAt: string | null;
    statusUpdatedAt: string | null;
  }[];
  boarding: BoardingSummary;
  status: TripStatus;
  /** Server-computed so the UI never has to re-implement the rules. */
  canStart: boolean;
  canComplete: boolean;
  acceptedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toTripDTO(doc: TripDoc, opts: { anotherTripInProgress?: boolean } = {}): TripDTO {
  const boarding = summariseBoarding(doc.passengers);
  return {
    id: doc._id.toHexString(),
    requestId: doc.requestId.toHexString(),
    requester: { id: doc.requesterId.toHexString(), name: doc.requesterName },
    rider: { id: doc.riderId.toHexString(), name: doc.riderName },
    from: doc.from,
    to: doc.to,
    scheduledAt: doc.scheduledAt.toISOString(),
    endsAt: doc.endsAt.toISOString(),
    estimatedDurationMinutes: doc.estimatedDurationMinutes,
    passengers: doc.passengers.map((p) => ({
      id: p._id.toHexString(),
      name: p.name,
      boardingStatus: p.boardingStatus,
      boardedAt: p.boardedAt?.toISOString() ?? null,
      statusUpdatedAt: p.statusUpdatedAt?.toISOString() ?? null,
    })),
    boarding,
    status: doc.status,
    canStart: doc.status === "ACCEPTED" && !opts.anotherTripInProgress,
    canComplete: doc.status === "IN_PROGRESS" && boarding.pending === 0,
    acceptedAt: doc.acceptedAt.toISOString(),
    startedAt: doc.startedAt?.toISOString() ?? null,
    completedAt: doc.completedAt?.toISOString() ?? null,
    cancelledAt: doc.cancelledAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
