'use client';

import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import type { PersonHistory } from '@/lib/types';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatBlock from '@/components/ui/StatBlock';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import RideListRow from '@/components/rides/RideListRow';
import { ErrorState, SkeletonRows } from '@/components/ui/PageState';
import { MapPin, CheckCircle, UserCheck, UserX } from 'lucide-react';

export default function MyTripsPage() {
  return (
    <AppLayout allow="PASSENGER">
      <MyTrips />
    </AppLayout>
  );
}

/**
 * Person history: every trip where this user appears as a passenger — including
 * trips someone else requested, and trips they MISSED. Read from trip records.
 */
function MyTrips() {
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<PersonHistory>('/history/person');

  return (
    <div className="page-enter">
      <TopHeader title="My Trips" subtitle="Every Toto trip you were part of, and whether you boarded." />

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
            <StatBlock label="Total Trips" value={data?.summary.total ?? '—'} icon={<CheckCircle className="w-4 h-4" />} />
            <StatBlock label="Boarded" value={data?.summary.boarded ?? '—'} icon={<UserCheck className="w-4 h-4" />} color="green" />
            <StatBlock label="Missed" value={data?.summary.missed ?? '—'} icon={<UserX className="w-4 h-4" />} color="red" />
          </div>

          {/* Trip List */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {loading && !data ? (
              <SkeletonRows rows={4} />
            ) : data && data.entries.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {data.entries.map((entry) => (
                  <RideListRow
                    key={entry.tripId}
                    scheduledAt={entry.scheduledAt}
                    from={entry.from}
                    to={entry.to}
                    meta={
                      <>
                        <span>Requested by {entry.requesterName}</span>
                        {entry.tripStatus !== 'COMPLETED' && <StatusBadge status={entry.tripStatus} />}
                      </>
                    }
                    badge={<StatusBadge status={entry.boardingStatus} kind="boarding" />}
                    onClick={() => router.push(`/rides/${entry.requestId}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MapPin className="w-7 h-7" />}
                title="No trips yet"
                description="Trips appear here once the rider accepts a ride you're on."
                action={{ label: 'Request a Ride', onClick: () => router.push('/request') }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
