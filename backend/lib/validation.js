const { config } = require("./config");
const { validationError } = require("./errors");
const { LOCATIONS } = require("../models/RideRequest");
const { BOARDING_STATUSES } = require("../models/Trip");
const { PASSENGER_ROLES } = require("../models/User");

/**
 * Server-side validation and sanitisation. Every value is type-checked before use,
 * which also blocks NoSQL operator injection (e.g. { "email": { "$ne": null } }):
 * only plain strings/numbers ever reach a query. Output objects are built field by
 * field, so unknown input properties are dropped.
 */

function throwIfAny(errors) {
  if (Object.keys(errors).length > 0) throw validationError(errors);
}

/** Trims, normalises Unicode and collapses internal whitespace. */
function cleanName(value) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Case-insensitive key used to match passenger names across trips and users. */
function nameKey(value) {
  return cleanName(value).toLocaleLowerCase("en");
}

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkPersonName(raw, field, errors) {
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

function checkEmail(raw, errors) {
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

function validateRegister(body) {
  const errors = {};
  const name = checkPersonName(body.name, "name", errors);
  const email = checkEmail(body.email, errors);

  const password = body.password;
  if (typeof password !== "string" || password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (password.length > 128) errors.password = "Password must be at most 128 characters";

  // Riders (and admins) cannot self-register: those accounts are provisioned (seed/admin).
  const role = body.role;
  if (typeof role !== "string" || !PASSENGER_ROLES.includes(role)) {
    errors.role = "Role must be STUDENT or EMPLOYEE";
  }

  throwIfAny(errors);
  return { name, email, password, role };
}

function validateLogin(body) {
  const errors = {};
  const email = checkEmail(body.email, errors);
  const password = body.password;
  if (typeof password !== "string" || password === "") errors.password = "Password is required";
  else if (password.length > 128) errors.password = "Password is too long";
  throwIfAny(errors);
  return { email, password };
}

// ---------------------------------------------------------------- ride requests

/** ISO-8601 with an explicit timezone (Z or ±hh:mm) so the server never guesses the zone. */
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

function validateCreateRequest(body, now = new Date()) {
  const errors = {};

  const isLocation = (v) => typeof v === "string" && LOCATIONS.includes(v);

  if (!isLocation(body.from)) errors.from = `From must be one of: ${LOCATIONS.join(", ")}`;
  if (!isLocation(body.to)) errors.to = `To must be one of: ${LOCATIONS.join(", ")}`;
  if (!errors.from && !errors.to && body.from === body.to) errors.to = "Destination must be different from pickup";

  let scheduledAt;
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

  const passengers = [];
  const raw = body.passengers;
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.passengers = "Add at least one passenger";
  } else if (raw.length > config.maxPassengers) {
    errors.passengers = `At most ${config.maxPassengers} passengers per request`;
  } else {
    const seen = new Set();
    raw.forEach((entry, i) => {
      const field = `passengers.${i}.name`;
      const value = typeof entry === "object" && entry !== null ? entry.name : undefined;
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
  return { from: body.from, to: body.to, scheduledAt, passengers };
}

// ---------------------------------------------------------------- boarding

function validateBoardingUpdate(body) {
  const status = body.boardingStatus;
  const allowed = BOARDING_STATUSES.filter((s) => s !== "PENDING");
  if (typeof status !== "string" || !allowed.includes(status)) {
    throw validationError({ boardingStatus: "boardingStatus must be BOARDED or MISSED" });
  }
  return status;
}

// ---------------------------------------------------------------- query params

function parseLimit(value, fallback = 50, max = 100) {
  if (value === undefined || value === null) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function parseEnum(value, allowed, field) {
  if (value === undefined || value === null || value === "") return undefined;
  if (!allowed.includes(value)) {
    throw validationError({ [field]: `Must be one of: ${allowed.join(", ")}` });
  }
  return value;
}

module.exports = {
  cleanName,
  nameKey,
  validateRegister,
  validateLogin,
  validateCreateRequest,
  validateBoardingUpdate,
  parseLimit,
  parseEnum,
};
