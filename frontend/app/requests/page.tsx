'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import type { RequestStatus, RideRequest } from '@/lib/types';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import RideListRow from '@/components/rides/RideListRow';
import { ErrorState, SkeletonRows } from '@/components/ui/PageState';
import { cn } from '@/lib/utils';
import { ListChecks, Plus } from 'lucide-react';

const FILTERS: { label: string; value: RequestStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Clashed', value: 'CLASHED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function MyRequestsPage() {
  return (
    <AppLayout allow="PASSENGER">
      <MyRequests />
    </AppLayout>
  );
}

function MyRequests() {
  const router = useRouter();
  const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const path = filter === 'ALL' ? '/requests?limit=100' : `/requests?status=${filter}&limit=100`;
  const { data, error, loading, reload } = useApiData<{ requests: RideRequest[] }>(path, { keepPrevious: true });

  return (
    <div className="page-enter">
      <TopHeader
        title="My Requests"
        subtitle="Every ride you've requested and where it stands."
        actions={
          <Button onClick={() => router.push('/request')} icon={<Plus className="w-4 h-4" />} size="sm">
            New Request
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 sm:mb-6" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border',
              filter === f.value
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading && !data ? (
            <SkeletonRows rows={4} />
          ) : data && data.requests.length > 0 ? (
            <div className={cn('divide-y divide-gray-50 transition-opacity', loading && 'opacity-60')}>
              {data.requests.map((r) => (
                <RideListRow
                  key={r.id}
                  scheduledAt={r.scheduledAt}
                  from={r.from}
                  to={r.to}
                  meta={
                    <span>
                      {r.passengerCount} passenger{r.passengerCount !== 1 ? 's' : ''}
                      {r.status === 'CLASHED' && ' · time slot unavailable'}
                    </span>
                  }
                  badge={<StatusBadge status={r.status} />}
                  onClick={() => router.push(`/rides/${r.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ListChecks className="w-7 h-7" />}
              title={filter === 'ALL' ? 'No requests yet' : 'Nothing here'}
              description={
                filter === 'ALL'
                  ? 'Request a Toto and it will show up here.'
                  : 'No requests with this status.'
              }
              action={filter === 'ALL' ? { label: 'Request a Ride', onClick: () => router.push('/request') } : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
