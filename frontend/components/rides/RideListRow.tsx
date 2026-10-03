'use client';

import type { Location } from '@/lib/types';
import { formatDate, formatRoute, formatTime } from '@/lib/utils';

interface RideListRowProps {
  scheduledAt: string;
  from: Location;
  to: Location;
  /** Secondary line under the route (passenger counts, requester, …). */
  meta?: React.ReactNode;
  /** Right-aligned status badge(s). */
  badge?: React.ReactNode;
  onClick?: () => void;
}

/** One ride in a list: date block · time · route · status. Shared by all history/request lists. */
export default function RideListRow({ scheduledAt, from, to, meta, badge, onClick }: RideListRowProps) {
  const [day, month] = formatDate(scheduledAt).split(' ');
  const time = formatTime(scheduledAt);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 sm:py-4 hover:bg-gray-50 transition-colors cursor-pointer text-left min-h-[56px]"
    >
      <div className="flex flex-col items-center w-10 sm:w-12 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-900 uppercase">{day}</span>
        <span className="text-[10px] text-gray-400 uppercase">{month}</span>
      </div>
      <div className="hidden sm:block text-sm text-gray-500 w-20 flex-shrink-0">{time}</div>
      <div className="flex-1 min-w-0 pr-2">
        <span className="text-sm font-medium text-gray-900 truncate block">{formatRoute(from, to)}</span>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs text-gray-400 mt-0.5">
          <span className="sm:hidden">{time}</span>
          {meta}
        </div>
      </div>
      {badge && <div className="flex items-center gap-1.5 flex-shrink-0">{badge}</div>}
    </button>
  );
}
