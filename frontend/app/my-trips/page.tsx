'use client';

import { useRouter } from 'next/navigation';
import { useDemo, useCurrentUser } from '@/lib/demo-state';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatBlock from '@/components/ui/StatBlock';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { formatRoute, formatDate } from '@/lib/utils';
import { MapPin, CheckCircle, UserCheck, UserX } from 'lucide-react';

export default function MyTripsPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const { getPersonTrips } = useDemo();

  const trips = getPersonTrips(user.name);

  const totalTrips = trips.length;
  const boarded = trips.reduce(
    (sum, t) => sum + t.passengers.filter((p) => p.name === user.name && p.status === 'BOARDED').length,
    0
  );
  const missed = trips.reduce(
    (sum, t) => sum + t.passengers.filter((p) => p.name === user.name && p.status === 'MISSED').length,
    0
  );

  return (
    <AppLayout>
      <div className="page-enter">
        <TopHeader
          title="My Trips"
          subtitle="Your complete Toto travel history."
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
          <StatBlock
            label="Total Trips"
            value={totalTrips}
            icon={<CheckCircle className="w-4 h-4" />}
          />
          <StatBlock
            label="Boarded"
            value={boarded}
            icon={<UserCheck className="w-4 h-4" />}
            color="green"
          />
          <StatBlock
            label="Missed"
            value={missed}
            icon={<UserX className="w-4 h-4" />}
            color="red"
          />
        </div>

        {/* Trip List */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {trips.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {trips.map((trip) => {
                const myStatus = trip.passengers.find((p) => p.name === user.name)?.status;
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
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span className="sm:hidden">{trip.time} •</span>
                        <span>{trip.passengers.length} passenger{trip.passengers.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {myStatus && <StatusBadge status={myStatus} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<MapPin className="w-7 h-7" />}
              title="No trips yet"
              description="Your Toto travel history will appear here."
              action={{ label: 'Request a Ride', onClick: () => router.push('/request') }}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
