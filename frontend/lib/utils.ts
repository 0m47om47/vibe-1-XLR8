import { Location, LOCATION_LABELS } from './types';

export function getLocationLabel(loc: Location): string {
  return LOCATION_LABELS[loc] || loc;
}

export function formatRoute(from: Location, to: Location): string {
  return `${getLocationLabel(from)} → ${getLocationLabel(to)}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`;
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

let idCounter = 1027;
export function generateId(): string {
  return `TOTO-${idCounter++}`;
}
