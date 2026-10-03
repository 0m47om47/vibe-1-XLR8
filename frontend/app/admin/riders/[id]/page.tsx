'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import StatBlock from '@/components/ui/StatBlock';
import StatusBadge from '@/components/ui/StatusBadge';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { getInitials, formatDate, formatTime, formatRoute } from '@/lib/utils';
import { ArrowLeft, Route, CheckCircle, XCircle, Users, AlertTriangle } from 'lucide-react';
import type { User, Trip } from '@/lib/types';

interface RiderDetail {
  user: User;
  stats: {
    totalTrips: number;
    completedTrips: number;
    clashedTrips: number;
    totalPassengers: number;
    boardedPassengers: number;
    missedPassengers: number;
  };
  isAvailable: boolean;
  activeTrip: Trip | null;
  trips: Trip[];
}

export default function AdminRiderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppLayout allow="ADMIN">
      <RiderDetailContent riderId={id} />
    </AppLayout>
  );
}

function RiderDetailContent({ riderId }: { riderId: string }) {
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<RiderDetail>(`/admin/riders/${riderId}`);

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  if (loading && !data) return <PageLoader />;
  if (!data) return null;

  const { user, stats, isAvailable, activeTrip, trips } = data;

  return (
    <div className="page-enter">
      <button
        onClick={() => router.push('/admin/riders')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Riders
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl font-semibold">
          {getInitials(user.name)}
        </div>
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight">{user.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Rider
            </span>
            {isAvailable ? (
              <span className="text-xs font-medium text-green-600">🟢 Available</span>
            ) : (
              <span className="text-xs font-medium text-blue-600">🔵 On Trip</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <StatBlock label="Total Trips" value={stats.totalTrips} icon={<Route className="w-4 h-4" />} />
        <StatBlock label="Completed" value={stats.completedTrips} icon={<CheckCircle className="w-4 h-4" />} color="green" />
        <StatBlock label="Clashed" value={stats.clashedTrips} icon={<AlertTriangle className="w-4 h-4" />} color="amber" />
        <StatBlock label="Passengers" value={stats.totalPassengers} icon={<Users className="w-4 h-4" />} />
        <StatBlock label="Boarded" value={stats.boardedPassengers} icon={<CheckCircle className="w-4 h-4" />} color="green" />
        <StatBlock label="Missed" value={stats.missedPassengers} icon={<XCircle className="w-4 h-4" />} color="red" />
      </div>

      {/* Active Trip */}
      {activeTrip && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 sm:p-6 mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 mb-2">Active Trip</p>
          <p className="text-lg font-semibold text-gray-900">{formatRoute(activeTrip.from, activeTrip.to)}</p>
          <p className="text-sm text-gray-500 mt-1">{formatTime(activeTrip.scheduledAt)} · {activeTrip.passengers.length} passengers</p>
        </div>
      )}

      {/* Trip History */}
      <div className="bg-white border border-gray-200 rounded-2xl">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Trip History</h2>
        </div>
        {trips.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {trips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => router.push(`/admin/trips/${trip.id}`)}
                className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-center flex-shrink-0 w-16">
                    <p className="text-xs font-semibold text-gray-900">{formatDate(trip.scheduledAt)}</p>
                    <p className="text-[11px] text-gray-400">{formatTime(trip.scheduledAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{formatRoute(trip.from, trip.to)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {trip.passengers.length} passengers
                      {trip.status === 'COMPLETED' && (
                        <span> · ✓ {trip.boarding.boarded} Boarded · ✕ {trip.boarding.missed} Missed</span>
                      )}
                    </p>
                  </div>
                </div>
                <StatusBadge status={trip.status} />
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">No trips yet</div>
        )}
      </div>
    </div>
  );
}
