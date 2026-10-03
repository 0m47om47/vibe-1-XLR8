import type { Location, Role } from './types';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function getLocationLabel(loc: Location): string {
  return loc;
}

export function formatRoute(from: Location, to: Location): string {
  return `${getLocationLabel(from)} → ${getLocationLabel(to)}`;
}

/** "03 OCT" in the viewer's timezone. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`;
}

/** "03 October 2026" */
export function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** "10:30 AM" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** "Today", "Tomorrow", "Yesterday" or "Sat, 05 Oct". */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(new Date())) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

/** "10:30 AM" for timeline steps; "Pending" when absent. */
export function formatStamp(iso: string | null | undefined, fallback = 'Pending'): string {
  if (!iso) return fallback;
  return `${formatDayLabel(iso)}, ${formatTime(iso)}`;
}

export function isToday(iso: string): boolean {
  return formatDayLabel(iso) === 'Today';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function roleLabel(role: Role): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

/** Short, readable reference for a Mongo id: last 6 chars, upper-case. */
export function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}

/** Start of today in the viewer's timezone, as ISO (for the rider's daily stats). */
export function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
