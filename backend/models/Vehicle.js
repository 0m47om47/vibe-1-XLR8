/**
 * The Toto itself. There is exactly one document. Besides describing the vehicle
 * it acts as the reservation lock: every transaction that can create or change
 * a booking writes to this document first, which makes MongoDB serialise those
 * transactions (see lib/totoLock.js).
 */
function toVehicleDTO(doc) {
  return {
    id: doc._id,
    name: doc.name,
    status: doc.status,
    currentTripId: doc.currentTripId?.toHexString() ?? null,
  };
}

module.exports = { toVehicleDTO };
