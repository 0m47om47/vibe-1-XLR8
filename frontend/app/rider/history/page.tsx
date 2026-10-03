'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import type { PersonHistory, RiderHistory, TripStatus } from '@/lib/types';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatBlock from '@/components/ui/StatBlock';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import RideListRow from '@/components/rides/RideListRow';
import { ErrorState, SkeletonRows } from '@/components/ui/PageState';
import { cn } from '@/lib/utils';
import { History, Users, UserCheck, UserX, Car, Search, X } from 'lucide-react';

const FILTERS: { label: string; value: TripStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function RiderHistoryPage() {
  return (
    <AppLayout allow="RIDER">
      <RiderHistoryView />
    </AppLayout>
  );
}

/** Rider history: every trip this rider operated, plus a passenger lookup. */
function RiderHistoryView() {
  const router = useRouter();
  const [filter, setFilter] = useState<TripStatus | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [person, setPerson] = useState<string | null>(null);

  const history = useApiData<RiderHistory>(filter === 'ALL' ? '/history/rider' : `/history/rider?status=${filter}`, {
    keepPrevious: true,
  });
  const personHistory = useApiData<PersonHistory>(person ? `/history/person?name=${encodeURIComponent(person)}` : null);

  const totals = history.data?.totals;

  return (
    <div className="page-enter">
      <TopHeader title="Rider History" subtitle="Every Toto trip you've handled." />

      {/* Stats — all-time totals for this rider */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatBlock label="Trips Completed" value={totals?.completed ?? '—'} icon={<Car className="w-4 h-4" />} />
        <StatBlock label="Passengers" value={totals?.passengers ?? '—'} icon={<Users className="w-4 h-4" />} />
        <StatBlock label="Boarded" value={totals?.boarded ?? '—'} icon={<UserCheck className="w-4 h-4" />} color="green" />
        <StatBlock label="Missed" value={totals?.missed ?? '—'} icon={<UserX className="w-4 h-4" />} color="red" />
      </div>

      {/* Passenger lookup */}
      <form
        className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8"
        onSubmit={(e) => {
          e.preventDefault();
          const name = query.trim();
          if (name) setPerson(name);
        }}
      >
        <label htmlFor="passenger-lookup" className="block text-sm font-semibold text-gray-900 mb-1">
          Passenger lookup
        </label>
        <p className="text-xs sm:text-sm text-gray-500 mb-3">See one passenger&apos;s boarding history across your trips.</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="passenger-lookup"
              value={query}
              maxLength={60}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Priya"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            />
          </div>
          <Button type="submit" disabled={!query.trim()} loading={personHistory.loading && !!person}>
            Search
          </Button>
        </div>

        {person && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{person}</span>
                {personHistory.data && (
                  <span className="text-gray-400">
                    {' '}
                    · {personHistory.data.summary.total} trip{personHistory.data.summary.total !== 1 ? 's' : ''} ·{' '}
                    <span className="text-green-600">{personHistory.data.summary.boarded} boarded</span> ·{' '}
                    <span className="text-red-600">{personHistory.data.summary.missed} missed</span>
                  </span>
                )}
              </p>
              <button
                type="button"
                aria-label="Clear lookup"
                onClick={() => {
                  setPerson(null);
                  setQuery('');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {personHistory.error ? (
              <p className="text-sm text-red-600">{errorMessage(personHistory.error)}</p>
            ) : personHistory.data && personHistory.data.entries.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No trips with this passenger.</p>
            ) : (
              <div className="divide-y divide-gray-50 -mx-4 sm:-mx-5">
                {personHistory.data?.entries.map((e) => (
                  <RideListRow
                    key={e.tripId}
                    scheduledAt={e.scheduledAt}
                    from={e.from}
                    to={e.to}
                    meta={<span>{e.passengerName} · requested by {e.requesterName}</span>}
                    badge={<StatusBadge status={e.boardingStatus} kind="boarding" />}
                    onClick={() => router.push(`/rider/active/${e.tripId}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4" role="tablist" aria-label="Filter trips">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border',
              filter === f.value ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Trip List */}
      {history.error && !history.data ? (
        <ErrorState message={errorMessage(history.error)} onRetry={history.reload} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {history.loading && !history.data ? (
            <SkeletonRows rows={4} />
          ) : history.data && history.data.entries.length > 0 ? (
            <div className={cn('divide-y divide-gray-50 transition-opacity', history.loading && 'opacity-60')}>
              {history.data.entries.map((trip) => (
                <RideListRow
                  key={trip.tripId}
                  scheduledAt={trip.scheduledAt}
                  from={trip.from}
                  to={trip.to}
                  meta={
                    <>
                      <span>{trip.boarding.total} pass.</span>
                      <span className="text-green-600 font-medium">✓ {trip.boarding.boarded} boarded</span>
                      {trip.boarding.missed > 0 && <span className="text-red-600 font-medium">✕ {trip.boarding.missed} missed</span>}
                    </>
                  }
                  badge={<StatusBadge status={trip.status} />}
                  onClick={() => router.push(`/rider/active/${trip.tripId}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={<History className="w-7 h-7" />} title="No trips yet" description="Trips you accept and complete will appear here." />
          )}
        </div>
      )}
    </div>
  );
}
