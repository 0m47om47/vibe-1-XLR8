import type { ObjectId } from "mongodb";
import type { Location } from "./RideRequest";

/**
 * A trip is one run of the Toto: one route, one departure time. Several ride
 * requests can share it (pooling) as long as they go the same way at the same
 * time and the passengers fit in the Toto.
 *
 * ACCEPTED → IN_PROGRESS → COMPLETED. ACCEPTED → CANCELLED when every request on
 * it is cancelled before pickup (frees the Toto; the record is kept for audit).
 */
export const TRIP_STATUSES = ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

/** Trips in these states hold the Toto for their time window. */
export const ACTIVE_TRIP_STATUSES = ["ACCEPTED", "IN_PROGRESS"] as const satisfies readonly TripStatus[];

export const BOARDING_STATUSES = ["PENDING", "BOARDED", "MISSED"] as const;
export type BoardingStatus = (typeof BOARDING_STATUSES)[number];

/** A ride request that is riding on this trip. */
export interface TripRequestRef {
  requestId: ObjectId;
  requesterId: ObjectId;
  requesterName: string;
  passengerCount: number;
  joinedAt: Date;
}

export interface TripPassenger {
  /** Same id as the passenger in the originating request. */
  _id: ObjectId;
  name: string;
  nameKey: string;
  userId: ObjectId | null;
  /** Which request this passenger came from (and who booked them). */
  requestId: ObjectId;
  requesterName: string;
  boardingStatus: BoardingStatus;
  boardedAt: Date | null;
  /** Last time the rider changed this passenger's status. */
  statusUpdatedAt: Date | null;
}

/**
 * The permanent, factual record of a Toto run. Passenger entries are embedded:
 * they are always read with the trip, bounded by the Toto's capacity, and must
 * stay exactly as they were when the trip completed.
 */
export interface TripDoc {
  _id: ObjectId;
  vehicleId: string;
  /** Requests sharing this run, in the order they were accepted. */
  requests: TripRequestRef[];
  riderId: ObjectId;
  riderName: string;
  from: Location;
  to: Location;
  /** Departure from `from`. */
  scheduledAt: Date;
  /** Estimated arrival at `to` (scheduledAt + estimatedDurationMinutes). */
  endsAt: Date;
  estimatedDurationMinutes: number;
  /** Seats in the Toto when the trip was created. */
  capacity: number;
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

export type Seats = { capacity: number; taken: number; left: number };

export function seatsOf(trip: Pick<TripDoc, "capacity" | "passengers">): Seats {
  const taken = trip.passengers.length;
  return { capacity: trip.capacity, taken, left: Math.max(0, trip.capacity - taken) };
}

export type TripDTO = {
  id: string;
  requests: { requestId: string; requesterId: string; requesterName: string; passengerCount: number }[];
  /** Ids of the requests on this trip (convenience). */
  requestIds: string[];
  rider: { id: string; name: string };
  from: Location;
  to: Location;
  scheduledAt: string;
  /** Estimated arrival at the destination. */
  endsAt: string;
  estimatedDurationMinutes: number;
  seats: Seats;
  passengers: {
    id: string;
    name: string;
    requestId: string;
    requesterName: string;
    boardingStatus: BoardingStatus;
    boardedAt: string | null;
    statusUpdatedAt: string | null;
  }[];
  /** Total passengers on the trip, including any hidden from this viewer. */
  passengerTotal: number;
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

export function toTripDTO(
  doc: TripDoc,
  opts: {
    anotherTripInProgress?: boolean;
    /** Only include passengers from these requests (privacy for non-riders). */
    visibleRequestIds?: ObjectId[];
  } = {},
): TripDTO {
  const boarding = summariseBoarding(doc.passengers);
  const visible = opts.visibleRequestIds
    ? doc.passengers.filter((p) => opts.visibleRequestIds!.some((id) => id.equals(p.requestId)))
    : doc.passengers;
  const requests = opts.visibleRequestIds
    ? doc.requests.filter((r) => opts.visibleRequestIds!.some((id) => id.equals(r.requestId)))
    : doc.requests;
  return {
    id: doc._id.toHexString(),
    requests: requests.map((r) => ({
      requestId: r.requestId.toHexString(),
      requesterId: r.requesterId.toHexString(),
      requesterName: r.requesterName,
      passengerCount: r.passengerCount,
    })),
    requestIds: requests.map((r) => r.requestId.toHexString()),
    rider: { id: doc.riderId.toHexString(), name: doc.riderName },
    from: doc.from,
    to: doc.to,
    scheduledAt: doc.scheduledAt.toISOString(),
    endsAt: doc.endsAt.toISOString(),
    estimatedDurationMinutes: doc.estimatedDurationMinutes,
    seats: seatsOf(doc),
    passengers: visible.map((p) => ({
      id: p._id.toHexString(),
      name: p.name,
      requestId: p.requestId.toHexString(),
      requesterName: p.requesterName,
      boardingStatus: p.boardingStatus,
      boardedAt: p.boardedAt?.toISOString() ?? null,
      statusUpdatedAt: p.statusUpdatedAt?.toISOString() ?? null,
    })),
    passengerTotal: doc.passengers.length,
    boarding: opts.visibleRequestIds ? summariseBoarding(visible) : boarding,
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

/** Public schedule entry: where the Toto will be and how full it is — no names. */
export type ScheduleEntryDTO = {
  tripId: string;
  from: Location;
  to: Location;
  departAt: string;
  arriveAt: string;
  status: TripStatus;
  seats: Seats;
  /** True when a new request for this exact route and time can still join. */
  joinable: boolean;
};

export function toScheduleEntry(doc: TripDoc, now = new Date()): ScheduleEntryDTO {
  const seats = seatsOf(doc);
  return {
    tripId: doc._id.toHexString(),
    from: doc.from,
    to: doc.to,
    departAt: doc.scheduledAt.toISOString(),
    arriveAt: doc.endsAt.toISOString(),
    status: doc.status,
    seats,
    joinable: doc.status === "ACCEPTED" && seats.left > 0 && doc.scheduledAt.getTime() > now.getTime(),
  };
}
