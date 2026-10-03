'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { cn, formatDate, formatTime, formatRoute } from '@/lib/utils';
import type { Trip, TripStatus } from '@/lib/types';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function AdminTripsPage() {
  return (
    <AppLayout allow="ADMIN">
      <TripsContent />
    </AppLayout>
  );
}

function TripsContent() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');

  const queryParam = statusFilter ? `?status=${statusFilter}` : '';
  const { data, error, loading, reload } = useApiData<Trip[]>(
    `/admin/trips${queryParam}`,
    { keepPrevious: true }
  );

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={reload} />;

  return (
    <div className="page-enter">
      <TopHeader title="All Trips" subtitle="Complete history of Toto operations." />

      {/* Filters */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              statusFilter === f.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : data ? (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Route</th>
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Rider</th>
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Passengers</th>
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((trip) => (
                  <tr
                    key={trip.id}
                    onClick={() => router.push(`/admin/trips/${trip.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{formatDate(trip.scheduledAt)}</p>
                      <p className="text-xs text-gray-400">{formatTime(trip.scheduledAt)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatRoute(trip.from, trip.to)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{trip.rider.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{trip.passengers.length}</span>
                      {trip.status === 'COMPLETED' && (
                        <span className="text-xs text-gray-400 ml-1.5">
                          ({trip.boarding.boarded} boarded · {trip.boarding.missed} missed)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={trip.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-400">No trips found</div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {data.map((trip) => (
              <button
                key={trip.id}
                onClick={() => router.push(`/admin/trips/${trip.id}`)}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatRoute(trip.from, trip.to)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(trip.scheduledAt)} · {formatTime(trip.scheduledAt)}</p>
                  </div>
                  <StatusBadge status={trip.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Rider: {trip.rider.name}</span>
                  <span>{trip.passengers.length} passengers</span>
                </div>
              </button>
            ))}
            {data.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-400">No trips found</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
