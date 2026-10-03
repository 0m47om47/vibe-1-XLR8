'use client';

import { useRouter } from 'next/navigation';
import { useDemo, useCurrentUser } from '@/lib/demo-state';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatBlock from '@/components/ui/StatBlock';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import RouteVisualization from '@/components/rides/RouteVisualization';
import EmptyState from '@/components/ui/EmptyState';
import { formatRoute, formatDate, isToday, formatDateFull } from '@/lib/utils';
import { Plus, Clock, CheckCircle, UserCheck, UserX, ArrowRight, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const { getUpcomingRide, getPersonTrips } = useDemo();

  const upcoming = getUpcomingRide(user.name);
  const personTrips = getPersonTrips(user.name);

  const totalTrips = personTrips.length;
  const boarded = personTrips.reduce(
    (sum, t) => sum + t.passengers.filter((p) => p.name === user.name && p.status === 'BOARDED').length,
    0
  );
  const missed = personTrips.reduce(
    (sum, t) => sum + t.passengers.filter((p) => p.name === user.name && p.status === 'MISSED').length,
    0
  );

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppLayout>
      <div className="page-enter">
        <TopHeader
          title={`${greeting()}, ${user.name.split(' ')[0]}.`}
          subtitle="Here's what's happening with your Toto rides."
          actions={
            <Button onClick={() => router.push('/request')} icon={<Plus className="w-4 h-4" />} size="sm" className="sm:hidden">
              Request
            </Button>
          }
        />

        {/* Desktop request button (separate from header on mobile) */}
        <div className="hidden sm:flex justify-end -mt-4 mb-6">
          <Button onClick={() => router.push('/request')} icon={<Plus className="w-4 h-4" />}>
            Request a Ride
          </Button>
        </div>

        {/* Stats — 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatBlock
            label="Upcoming Ride"
            value={upcoming ? 1 : 0}
            icon={<Clock className="w-4 h-4" />}
            color="blue"
          />
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

        {/* Upcoming Ride Hero */}
        {upcoming ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 lg:p-8 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Upcoming Ride
              </span>
              <StatusBadge status={upcoming.status} />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">{upcoming.time}</span>
                  <span className="text-xs sm:text-sm text-gray-400">
                    {isToday(upcoming.date) ? 'Today' : formatDate(upcoming.date)} •{' '}
                    {formatDateFull(upcoming.date)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-sm text-gray-500">
                  <span>{upcoming.passengers.length} passengers</span>
                  <span className="text-gray-300 hidden sm:inline">•</span>
                  <span className="text-xs sm:text-sm">By {upcoming.requestedByName}</span>
                </div>
                <div className="mt-4 sm:mt-5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/rides/${upcoming.id}`)}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View ride
                  </Button>
                </div>
              </div>

              {/* Route — vertical on mobile, side column on desktop */}
              <div className="flex justify-center lg:border-l lg:border-gray-100 lg:pl-8 py-4 lg:py-0">
                <RouteVisualization from={upcoming.from} to={upcoming.to} size="lg" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl mb-6 sm:mb-8">
            <EmptyState
              icon={<Calendar className="w-7 h-7" />}
              title="Your schedule is clear."
              description="No Toto rides planned yet."
              action={{ label: 'Request a Ride', onClick: () => router.push('/request') }}
            />
          </div>
        )}

        {/* Recent Trips */}
        <div className="bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent trips</h2>
            <button
              onClick={() => router.push('/my-trips')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              View all →
            </button>
          </div>

          {personTrips.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {personTrips.slice(0, 5).map((trip) => {
                const myStatus = trip.passengers.find((p) => p.name === user.name)?.status;
                return (
                  <button
                    key={trip.id}
                    onClick={() => router.push(`/rides/${trip.id}`)}
                    className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 sm:py-4 hover:bg-gray-50 transition-colors cursor-pointer text-left min-h-[56px]"
                  >
                    {/* Date */}
                    <div className="flex flex-col items-center w-10 sm:w-12 flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-900 uppercase">
                        {formatDate(trip.date).split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase">
                        {formatDate(trip.date).split(' ')[1]}
                      </span>
                    </div>
                    {/* Time - hidden on small mobile */}
                    <div className="hidden sm:block text-sm text-gray-500 w-20 flex-shrink-0">{trip.time}</div>
                    {/* Route */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate block">
                        {formatRoute(trip.from, trip.to)}
                      </span>
                      <span className="text-xs text-gray-400 sm:hidden">{trip.time}</span>
                    </div>
                    <StatusBadge status={myStatus || trip.status} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">No trips yet</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
