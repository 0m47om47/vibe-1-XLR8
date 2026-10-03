/**
 * Central runtime configuration. Values are read lazily so scripts (seed, tests)
 * can populate process.env before first use.
 */

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Environment variable ${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export const config = {
  get mongoUri(): string {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
    return uri;
  },
  get mongoDb(): string {
    const db = process.env.MONGODB_DB;
    if (!db) throw new Error("MONGODB_DB is not set. Copy .env.example to .env.local and fill it in.");
    return db;
  },
  /**
   * Travel time of one run. A run departs at scheduledAt and arrives at
   * scheduledAt + this; it holds the Toto for exactly that window.
   */
  get tripDurationMinutes(): number {
    return intFromEnv("TRIP_DURATION_MINUTES", 15, 5, 240);
  },
  /** Seats in the Toto: the most passengers one run can carry (shared across requests). */
  get totoCapacity(): number {
    return intFromEnv("TOTO_CAPACITY", 5, 1, 20);
  },
  /** Passengers allowed in a single request (never more than the Toto holds). */
  get maxPassengers(): number {
    return Math.min(intFromEnv("MAX_PASSENGERS", this.totoCapacity, 1, 20), this.totoCapacity);
  },
  get sessionTtlDays(): number {
    return intFromEnv("SESSION_TTL_DAYS", 7, 1, 90);
  },
  get frontendOrigin(): string | undefined {
    return process.env.FRONTEND_ORIGIN || undefined;
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  /** The single Toto. Every reservation serialises on this vehicle document. */
  vehicleId: "toto-1",
  sessionCookieName: "toto_session",
  /** How far into the future a ride may be requested. */
  maxBookingDaysAhead: 60,
} as const;
