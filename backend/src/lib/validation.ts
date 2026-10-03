import { config } from "./config";
import { validationError } from "./errors";
import { LOCATIONS, type Location } from "@/models/RideRequest";
import { BOARDING_STATUSES, type BoardingStatus } from "@/models/Trip";
import { PASSENGER_ROLES, type UserRole } from "@/models/User";

/**
 * Server-side validation and sanitisation. Every value is type-checked before use,
 * which also blocks NoSQL operator injection (e.g. { "email": { "$ne": null } }):
 * only plain strings/numbers ever reach a query. Output objects are built field by
 * field, so unknown input properties are dropped.
 */

type Errors = Record<string, string>;

function throwIfAny(errors: Errors): void {
  if (Object.keys(errors).length > 0) throw validationError(errors);
}

/** Trims, normalises Unicode and collapses internal whitespace. */
export function cleanName(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Case-insensitive key used to match passenger names across trips and users. */
export function nameKey(value: string): string {
  return cleanName(value).toLocaleLowerCase("en");
}

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkPersonName(raw: unknown, field: string, errors: Errors): string | undefined {
  if (typeof raw !== "string" || cleanName(raw) === "") {
    errors[field] = "Name is required";
    return undefined;
  }
  const name = cleanName(raw);
  if (name.length > 60) errors[field] = "Name must be at most 60 characters";
  else if (!NAME_PATTERN.test(name)) errors[field] = "Name may contain only letters, spaces, dots, apostrophes and hyphens";
  else return name;
  return undefined;
}

function checkEmail(raw: unknown, errors: Errors): string | undefined {
  if (typeof raw !== "string" || raw.trim() === "") {
    errors.email = "Email is required";
    return undefined;
  }
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address";
    return undefined;
  }
  return email;
}

// ---------------------------------------------------------------- auth

export type RegisterInput = { name: string; email: string; password: string; role: UserRole };

export function validateRegister(body: Record<string, unknown>): RegisterInput {
  const errors: Errors = {};
  const name = checkPersonName(body.name, "name", errors);
  const email = checkEmail(body.email, errors);

  const password = body.password;
  if (typeof password !== "string" || password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (password.length > 128) errors.password = "Password must be at most 128 characters";

  // Riders cannot self-register: the rider account is provisioned (seed/admin).
  const role = body.role;
  if (typeof role !== "string" || !(PASSENGER_ROLES as readonly string[]).includes(role)) {
    errors.role = "Role must be STUDENT or EMPLOYEE";
  }

  throwIfAny(errors);
  return { name: name!, email: email!, password: password as string, role: role as UserRole };
}

export type LoginInput = { email: string; password: string };

export function validateLogin(body: Record<string, unknown>): LoginInput {
  const errors: Errors = {};
  const email = checkEmail(body.email, errors);
  const password = body.password;
  if (typeof password !== "string" || password === "") errors.password = "Password is required";
  else if (password.length > 128) errors.password = "Password is too long";
  throwIfAny(errors);
  return { email: email!, password: password as string };
}

// ---------------------------------------------------------------- ride requests

export type CreateRequestInput = {
  from: Location;
  to: Location;
  scheduledAt: Date;
  passengers: { name: string; nameKey: string }[];
};

/** ISO-8601 with an explicit timezone (Z or ±hh:mm) so the server never guesses the zone. */
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export function validateCreateRequest(body: Record<string, unknown>, now = new Date()): CreateRequestInput {
  const errors: Errors = {};

  const isLocation = (v: unknown): v is Location =>
    typeof v === "string" && (LOCATIONS as readonly string[]).includes(v);

  if (!isLocation(body.from)) errors.from = `From must be one of: ${LOCATIONS.join(", ")}`;
  if (!isLocation(body.to)) errors.to = `To must be one of: ${LOCATIONS.join(", ")}`;
  if (!errors.from && !errors.to && body.from === body.to) errors.to = "Destination must be different from pickup";

  let scheduledAt: Date | undefined;
  if (typeof body.scheduledAt !== "string" || !ISO_WITH_ZONE.test(body.scheduledAt)) {
    errors.scheduledAt = "Date and time are required (ISO-8601 with timezone)";
  } else {
    scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      errors.scheduledAt = "Invalid date or time";
    } else if (scheduledAt.getTime() < now.getTime() - 60_000) {
      errors.scheduledAt = "Ride time must be in the future";
    } else if (scheduledAt.getTime() > now.getTime() + config.maxBookingDaysAhead * 86_400_000) {
      errors.scheduledAt = `Rides can be booked at most ${config.maxBookingDaysAhead} days ahead`;
    } else {
      // Store at minute precision.
      scheduledAt.setUTCSeconds(0, 0);
    }
  }

  const passengers: { name: string; nameKey: string }[] = [];
  const raw = body.passengers;
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.passengers = "Add at least one passenger";
  } else if (raw.length > config.maxPassengers) {
    errors.passengers = `At most ${config.maxPassengers} passengers per request`;
  } else {
    const seen = new Set<string>();
    raw.forEach((entry, i) => {
      const field = `passengers.${i}.name`;
      const value = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>).name : undefined;
      const name = checkPersonName(value, field, errors);
      if (!name) return;
      const key = nameKey(name);
      if (seen.has(key)) {
        errors[field] = `"${name}" is listed more than once`;
        return;
      }
      seen.add(key);
      passengers.push({ name, nameKey: key });
    });
  }

  throwIfAny(errors);
  return { from: body.from as Location, to: body.to as Location, scheduledAt: scheduledAt!, passengers };
}

// ---------------------------------------------------------------- boarding

export function validateBoardingUpdate(body: Record<string, unknown>): Exclude<BoardingStatus, "PENDING"> {
  const status = body.boardingStatus;
  const allowed = BOARDING_STATUSES.filter((s) => s !== "PENDING");
  if (typeof status !== "string" || !(allowed as string[]).includes(status)) {
    throw validationError({ boardingStatus: "boardingStatus must be BOARDED or MISSED" });
  }
  return status as Exclude<BoardingStatus, "PENDING">;
}

// ---------------------------------------------------------------- query params

export function parseLimit(value: string | null, fallback = 50, max = 100): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function parseEnum<T extends string>(value: string | null, allowed: readonly T[], field: string): T | undefined {
  if (value === null || value === "") return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw validationError({ [field]: `Must be one of: ${allowed.join(", ")}` });
  }
  return value as T;
}
