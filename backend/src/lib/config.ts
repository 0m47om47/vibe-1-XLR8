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
  /** Default estimated trip duration used for overlap detection. */
  get tripDurationMinutes(): number {
    return intFromEnv("TRIP_DURATION_MINUTES", 30, 5, 240);
  },
  get maxPassengers(): number {
    return intFromEnv("MAX_PASSENGERS", 6, 1, 20);
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
