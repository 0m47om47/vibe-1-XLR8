'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import RouteVisualization from '@/components/rides/RouteVisualization';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { formatDate, formatTime, formatRoute, formatDateFull, shortId } from '@/lib/utils';
import { ArrowLeft, Clock, User2 } from 'lucide-react';
import type { Trip } from '@/lib/types';

export default function AdminTripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppLayout allow="ADMIN">
      <TripDetailContent tripId={id} />
    </AppLayout>
  );
}

function TripDetailContent({ tripId }: { tripId: string }) {
  const router = useRouter();
  const { data: trip, error, loading, reload } = useApiData<Trip>(`/admin/trips/${tripId}`);

  if (error && !trip) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  if (loading && !trip) return <PageLoader />;
  if (!trip) return null;

  return (
    <div className="page-enter">
      <button
        onClick={() => router.push('/admin/trips')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> All Trips
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 lg:p-8 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Trip #{shortId(trip.id)}
          </span>
          <StatusBadge status={trip.status} size="md" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {formatRoute(trip.from, trip.to)}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{formatDateFull(trip.scheduledAt)} · {formatTime(trip.scheduledAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User2 className="w-4 h-4 text-gray-400" />
                <span>Rider: {trip.rider.name}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center lg:border-l lg:border-gray-100 lg:pl-8">
            <RouteVisualization from={trip.from} to={trip.to} size="lg" />
          </div>
        </div>
      </div>

      {/* Trip Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1">Requested by</p>
          <p className="text-sm font-medium text-gray-900">{trip.requester.name}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1">Rider</p>
          <p className="text-sm font-medium text-gray-900">{trip.rider.name}</p>
        </div>
      </div>

      {/* Passengers */}
      <div className="bg-white border border-gray-200 rounded-2xl">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Passengers ({trip.passengers.length})
          </h2>
          {trip.status === 'COMPLETED' && (
            <p className="text-xs text-gray-400 mt-0.5">
              {trip.boarding.boarded} boarded · {trip.boarding.missed} missed
            </p>
          )}
        </div>
        <div className="divide-y divide-gray-50">
          {trip.passengers.map((p) => (
            <div key={p.id} className="px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                  {p.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className="text-sm font-medium text-gray-900">{p.name}</span>
              </div>
              <StatusBadge status={p.boardingStatus} kind="boarding" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
