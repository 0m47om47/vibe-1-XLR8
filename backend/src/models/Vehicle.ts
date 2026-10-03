import type { ObjectId } from "mongodb";

export type VehicleStatus = "AVAILABLE" | "ON_TRIP";

/**
 * The Toto itself. There is exactly one document. Besides describing the vehicle
 * it acts as the reservation lock: every transaction that can create or change
 * a booking writes to this document first, which makes MongoDB serialise those
 * transactions (see lib/totoLock.ts).
 */
export interface VehicleDoc {
  _id: string;
  name: string;
  /** ON_TRIP while a trip is IN_PROGRESS; back to AVAILABLE when it completes. */
  status: VehicleStatus;
  currentTripId: ObjectId | null;
  /** Incremented by every reservation transaction; the write is what takes the lock. */
  lockVersion: number;
  lastLockedAt: Date | null;
  createdAt: Date;
}

export type VehicleDTO = { id: string; name: string; status: VehicleStatus; currentTripId: string | null };

export function toVehicleDTO(doc: VehicleDoc): VehicleDTO {
  return {
    id: doc._id,
    name: doc.name,
    status: doc.status,
    currentTripId: doc.currentTripId?.toHexString() ?? null,
  };
}
