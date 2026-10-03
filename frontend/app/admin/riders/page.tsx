'use client';

import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatBlock from '@/components/ui/StatBlock';
import Button from '@/components/ui/Button';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { getInitials, formatRoute, formatTime } from '@/lib/utils';
import { ArrowRight, CheckCircle, XCircle, Users, Route } from 'lucide-react';
import type { User, Trip } from '@/lib/types';

interface RiderData {
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
}

export default function AdminRidersPage() {
  return (
    <AppLayout allow="ADMIN">
      <RidersContent />
    </AppLayout>
  );
}

function RidersContent() {
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<RiderData[]>('/admin/riders');

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  if (loading && !data) return <PageLoader />;
  if (!data) return null;

  return (
    <div className="page-enter">
      <TopHeader title="Riders" subtitle="Manage Toto riders and their performance." />

      <div className="space-y-6">
        {data.map((rider) => (
          <div key={rider.user.id} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-semibold">
                  {getInitials(rider.user.name)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{rider.user.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Rider
                    </span>
                    {rider.isAvailable ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        🟢 Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                        🔵 On Trip
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/admin/riders/${rider.user.id}`)}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Details
              </Button>
            </div>

            {/* Active Trip */}
            {rider.activeTrip && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 mb-1.5">Active Trip</p>
                <p className="text-sm font-medium text-gray-900">{formatRoute(rider.activeTrip.from, rider.activeTrip.to)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatTime(rider.activeTrip.scheduledAt)} · {rider.activeTrip.passengers.length} passengers</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-gray-900">{rider.stats.totalTrips}</p>
                <p className="text-[11px] text-gray-400 font-medium">Total Trips</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-green-600">{rider.stats.completedTrips}</p>
                <p className="text-[11px] text-gray-400 font-medium">Completed</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-gray-900">{rider.stats.totalPassengers}</p>
                <p className="text-[11px] text-gray-400 font-medium">Passengers</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-green-600">{rider.stats.boardedPassengers}</p>
                <p className="text-[11px] text-gray-400 font-medium">Boarded</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-red-600">{rider.stats.missedPassengers}</p>
                <p className="text-[11px] text-gray-400 font-medium">Missed</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-amber-600">{rider.stats.clashedTrips}</p>
                <p className="text-[11px] text-gray-400 font-medium">Clashed</p>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-sm text-gray-400">
            No riders found
          </div>
        )}
      </div>
    </div>
  );
}
