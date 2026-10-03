/**
 * Client-side checks for instant feedback only. The backend re-validates every
 * request (lib/validation.ts there) and is the source of truth.
 */

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

export function cleanName(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function validatePersonName(raw: string): string | null {
  const name = cleanName(raw);
  if (!name) return 'Name is required';
  if (name.length > 60) return 'Name must be at most 60 characters';
  if (!NAME_PATTERN.test(name)) return 'Only letters, spaces, dots, apostrophes and hyphens';
  return null;
}

/** Errors per passenger row (index → message) — empty, invalid or duplicate names. */
export function validatePassengers(names: string[], max: number): { rows: Record<number, string>; general?: string } {
  const rows: Record<number, string> = {};
  const seen = new Map<string, number>();
  names.forEach((raw, i) => {
    const err = validatePersonName(raw);
    if (err) {
      rows[i] = err;
      return;
    }
    const key = cleanName(raw).toLowerCase();
    if (seen.has(key)) rows[i] = 'This name is already listed';
    else seen.set(key, i);
  });
  if (names.length === 0) return { rows, general: 'Add at least one passenger' };
  if (names.length > max) return { rows, general: `At most ${max} passengers per request` };
  return { rows };
}

/** Combines a local `YYYY-MM-DD` date and `HH:mm` time into a zoned ISO string. */
export function toScheduledIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function validateSchedule(date: string, time: string, maxDaysAhead: number): string | null {
  const iso = toScheduledIso(date, time);
  if (!iso) return 'Choose a valid date and time';
  const when = new Date(iso).getTime();
  if (when <= Date.now()) return 'Pick a time in the future';
  if (when > Date.now() + maxDaysAhead * 86_400_000) return `Rides can be booked at most ${maxDaysAhead} days ahead`;
  return null;
}

export function validateEmail(raw: string): string | null {
  const email = raw.trim();
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return null;
}

/** Local `YYYY-MM-DD` for a Date. */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
