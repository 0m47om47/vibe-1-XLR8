'use client';

import type { ScheduleEntry, Seats } from '@/lib/types';
import { cn, formatDayLabel, formatRoute, formatTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { ArrowRight, MapPin } from 'lucide-react';

/** "3/5 seats" with a small bar — the Toto's occupancy for one run. */
export function SeatMeter({ seats, className }: { seats: Seats; className?: string }) {
  const pct = Math.min(100, Math.round((seats.taken / seats.capacity) * 100));
  const full = seats.left === 0;
  return (
    <div className={cn('flex items-center gap-2', className)} title={`${seats.taken} of ${seats.capacity} seats taken`}>
      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden>
        <div className={cn('h-full rounded-full', full ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-medium whitespace-nowrap', full ? 'text-amber-700' : 'text-gray-600')}>
        {seats.taken}/{seats.capacity} seats{full ? ' · full' : ` · ${seats.left} left`}
      </span>
    </div>
  );
}

interface TotoScheduleProps {
  entries: ScheduleEntry[];
  /** Show a "Book a seat" action on runs that can still be joined. */
  onBook?: (entry: ScheduleEntry) => void;
  emptyText?: string;
}

/**
 * The Toto's upcoming runs: departure, route, arrival at the destination and
 * free seats. Everyone sees it, so people at the destination know when the Toto
 * will be there and others can share a run that has seats.
 */
export default function TotoSchedule({ entries, onBook, emptyText = 'No runs booked yet.' }: TotoScheduleProps) {
  if (entries.length === 0) {
    return <p className="px-4 sm:px-6 py-8 text-center text-sm text-gray-400">{emptyText}</p>;
  }

  return (
    <div className="divide-y divide-gray-50">
      {entries.map((e, i) => {
        const newDay = i === 0 || formatDayLabel(entries[i - 1].departAt) !== formatDayLabel(e.departAt);
        const onTheWay = e.status === 'IN_PROGRESS';
        return (
          <div key={e.tripId}>
            {newDay && (
              <p className="px-4 sm:px-6 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                {formatDayLabel(e.departAt)}
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3">
              <div className="w-20 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-900">{formatTime(e.departAt)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{formatRoute(e.from, e.to)}</span>
                  {onTheWay && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      → On the way
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  Arrives {e.to} ~{formatTime(e.arriveAt)}
                </p>
              </div>
              <SeatMeter seats={e.seats} />
              {onBook && (
                <div className="sm:w-[112px] flex sm:justify-end">
                  {e.joinable ? (
                    <Button size="sm" variant="secondary" onClick={() => onBook(e)} icon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Book seat
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">{onTheWay ? 'Departed' : 'Full'}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Does [aStart, aEnd) overlap [bStart, bEnd)? (display only — the server decides) */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}
