'use client';

import { useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo-state';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatBlock from '@/components/ui/StatBlock';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { formatRoute, formatDate } from '@/lib/utils';
import { History, Users, UserCheck, UserX, Car } from 'lucide-react';

export default function RiderHistoryPage() {
  const router = useRouter();
  const { getRiderTrips } = useDemo();

  const trips = getRiderTrips();

  const totalTrips = trips.length;
  const totalPassengers = trips.reduce((sum, t) => sum + t.passengers.length, 0);
  const totalBoarded = trips.reduce(
    (sum, t) => sum + t.passengers.filter((p) => p.status === 'BOARDED').length,
    0
  );
  const totalMissed = trips.reduce(
    (sum, t) => sum + t.passengers.filter((p) => p.status === 'MISSED').length,
    0
  );

  return (
    <AppLayout>
      <div className="page-enter">
        <TopHeader
          title="Rider History"
          subtitle="Every Toto trip you've handled."
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatBlock
            label="Trips"
            value={totalTrips}
            icon={<Car className="w-4 h-4" />}
          />
          <StatBlock
            label="Passengers"
            value={totalPassengers}
            icon={<Users className="w-4 h-4" />}
          />
          <StatBlock
            label="Boarded"
            value={totalBoarded}
            icon={<UserCheck className="w-4 h-4" />}
            color="green"
          />
          <StatBlock
            label="Missed"
            value={totalMissed}
            icon={<UserX className="w-4 h-4" />}
            color="red"
          />
        </div>

        {/* Trip List */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {trips.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {trips.map((trip) => {
                const boarded = trip.passengers.filter((p) => p.status === 'BOARDED').length;
                const missed = trip.passengers.filter((p) => p.status === 'MISSED').length;

                return (
                  <button
                    key={trip.id}
                    onClick={() => router.push(`/rides/${trip.id}`)}
                    className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 sm:py-4 hover:bg-gray-50 transition-colors cursor-pointer text-left min-h-[56px]"
                  >
                    <div className="flex flex-col items-center w-10 sm:w-12 flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-900 uppercase">
                        {formatDate(trip.date).split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase">
                        {formatDate(trip.date).split(' ')[1]}
                      </span>
                    </div>
                    <div className="hidden sm:block text-sm text-gray-500 w-20 flex-shrink-0">{trip.time}</div>
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="text-sm font-medium text-gray-900 truncate block">
                        {formatRoute(trip.from, trip.to)}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-0.5">
                        <span className="text-xs text-gray-400 sm:hidden">
                          {trip.time} •
                        </span>
                        <span className="text-xs text-gray-400">
                          {trip.passengers.length} pass.
                        </span>
                        <span className="text-xs text-green-600 font-medium">
                          ✓ {boarded}
                        </span>
                        {missed > 0 && (
                          <span className="text-xs text-red-600 font-medium">
                            ✕ {missed}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status="COMPLETED" />
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<History className="w-7 h-7" />}
              title="No trips yet"
              description="Completed Toto trips will appear here."
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
