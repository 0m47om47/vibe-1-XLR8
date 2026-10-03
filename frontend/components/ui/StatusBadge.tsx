'use client';

import { RideStatus, BoardingStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RideStatus | BoardingStatus;
  size?: 'sm' | 'md';
}

const CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  REQUESTED: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Requested' },
  ACCEPTED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Accepted' },
  CLASHED: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Clashed' },
  IN_PROGRESS: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'In Progress' },
  COMPLETED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Completed' },
  PENDING: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: 'Pending' },
  BOARDED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Boarded' },
  MISSED: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Missed' },
};

const ICONS: Record<string, string> = {
  ACCEPTED: '✓',
  COMPLETED: '✓',
  BOARDED: '✓',
  CLASHED: '⚠',
  MISSED: '✕',
  IN_PROGRESS: '→',
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = CONFIG[status] || CONFIG.PENDING;
  const icon = ICONS[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border font-medium rounded-md whitespace-nowrap',
        config.bg,
        config.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {icon && <span className="text-[10px]">{icon}</span>}
      {config.label}
    </span>
  );
}
