'use client';

import type { BoardingStatus, RequestStatus, TripStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RequestStatus | TripStatus | BoardingStatus;
  /** "ride" = request/trip lifecycle (default); "boarding" = a passenger's boarding status. */
  kind?: 'ride' | 'boarding';
  size?: 'sm' | 'md';
}

type Style = { bg: string; text: string; label: string; icon?: string };

const RIDE: Record<string, Style> = {
  PENDING: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Pending', icon: '•' },
  ACCEPTED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Accepted', icon: '✓' },
  CLASHED: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Clashed', icon: '⚠' },
  IN_PROGRESS: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'In Progress', icon: '→' },
  COMPLETED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Completed', icon: '✓' },
  CANCELLED: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: 'Cancelled', icon: '⊘' },
};

const BOARDING: Record<string, Style> = {
  PENDING: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: 'Pending', icon: '•' },
  BOARDED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Boarded', icon: '✓' },
  MISSED: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Missed', icon: '✕' },
};

export default function StatusBadge({ status, kind, size = 'sm' }: StatusBadgeProps) {
  // BOARDED / MISSED only exist as boarding statuses.
  const table = kind === 'boarding' || status === 'BOARDED' || status === 'MISSED' ? BOARDING : RIDE;
  const config = table[status] ?? RIDE.PENDING;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border font-medium rounded-md whitespace-nowrap transition-colors',
        config.bg,
        config.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {config.icon && (
        <span className="text-[10px]" aria-hidden>
          {config.icon}
        </span>
      )}
      {config.label}
    </span>
  );
}
