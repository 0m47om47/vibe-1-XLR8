'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/app-state';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import type { PassengerDashboard, Schedule } from '@/lib/types';
import TotoSchedule from '@/components/rides/TotoSchedule';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatBlock from '@/components/ui/StatBlock';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import RouteVisualization from '@/components/rides/RouteVisualization';
import RideListRow from '@/components/rides/RideListRow';
import EmptyState from '@/components/ui/EmptyState';
import { ErrorState, PageLoader, SkeletonRows } from '@/components/ui/PageState';
import { formatDayLabel, formatDateFull, formatTime } from '@/lib/utils';
import { Plus, Clock, CheckCircle, AlertTriangle, ArrowRight, Calendar, Hourglass } from 'lucide-react';

export default function DashboardPage() {
  return (
    <AppLayout allow="PASSENGER">
      <Dashboard />
    </AppLayout>
  );
}

function Dashboard() {
  const router = useRouter();
  const user = useCurrentUser();
  const { data, error, loading, reload } = useApiData<PassengerDashboard>('/dashboard');
  const schedule = useApiData<Schedule>('/schedule?days=7');

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const upcoming = data?.upcomingRide;

  return (
    <div className="page-enter">
      <TopHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}.`}
        subtitle="Here's what's happening with your Toto rides."
        actions={
          <Button onClick={() => router.push('/request')} icon={<Plus className="w-4 h-4" />} size="sm">
            Request a Ride
          </Button>
        }
      />

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : loading && !data ? (
        <PageLoader />
      ) : data ? (
        <>
          {/* Stats — 2 cols on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatBlock label="Pending Requests" value={data.counts.PENDING} icon={<Hourglass className="w-4 h-4" />} color="amber" />
            <StatBlock label="Accepted" value={data.counts.ACCEPTED + data.counts.IN_PROGRESS} icon={<Clock className="w-4 h-4" />} color="blue" />
            <StatBlock label="Completed Rides" value={data.counts.COMPLETED} icon={<CheckCircle className="w-4 h-4" />} color="green" />
            <StatBlock label="Clashed" value={data.counts.CLASHED} icon={<AlertTriangle className="w-4 h-4" />} />
          </div>

          {/* Upcoming Ride Hero */}
          {upcoming ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 lg:p-8 mb-6 sm:mb-8">
              <div className="flex items-center gap-2 mb-4 sm:mb-5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  Upcoming Ride
                </span>
                <StatusBadge status={upcoming.request.status} />
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {formatTime(upcoming.request.scheduledAt)}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-400">
                      {formatDayLabel(upcoming.request.scheduledAt)} • {formatDateFull(upcoming.request.scheduledAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-sm text-gray-500">
                    <span>
                      {upcoming.request.passengerCount} passenger{upcoming.request.passengerCount !== 1 ? 's' : ''}
                    </span>
                    {upcoming.trip && (
                      <>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span className="text-xs sm:text-sm">Rider: {upcoming.trip.rider.name}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-4 sm:mt-5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/rides/${upcoming.request.id}`)}
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      View ride
                    </Button>
                  </div>
                </div>

                {/* Route — vertical on mobile, side column on desktop */}
                <div className="flex justify-center lg:border-l lg:border-gray-100 lg:pl-8 py-4 lg:py-0">
                  <RouteVisualization from={upcoming.request.from} to={upcoming.request.to} size="lg" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl mb-6 sm:mb-8">
              <EmptyState
                icon={<Calendar className="w-7 h-7" />}
                title="Your schedule is clear."
                description={
                  data.counts.PENDING > 0
                    ? `You have ${data.counts.PENDING} request${data.counts.PENDING !== 1 ? 's' : ''} waiting for the rider.`
                    : 'No accepted Toto rides coming up.'
                }
                action={{ label: 'Request a Ride', onClick: () => router.push('/request') }}
              />
            </div>
          )}

          {/* Toto schedule — shared with everyone: where it goes, when it arrives, free seats */}
          <div className="bg-white border border-gray-200 rounded-2xl mb-6 sm:mb-8">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Toto schedule</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Runs with free seats can be shared — book a seat on the same run.
                </p>
              </div>
            </div>
            {schedule.data ? (
              <TotoSchedule
                entries={schedule.data.entries}
                emptyText="The Toto has no runs booked this week."
                onBook={(e) =>
                  router.push(`/request?from=${e.from}&to=${e.to}&at=${encodeURIComponent(e.departAt)}`)
                }
              />
            ) : schedule.error ? (
              <p className="px-6 py-6 text-sm text-red-600">{errorMessage(schedule.error)}</p>
            ) : (
              <SkeletonRows rows={2} />
            )}
          </div>

          {/* Pending requests */}
          {data.pendingRequests.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl mb-6 sm:mb-8">
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Waiting for the rider</h2>
                <button
                  onClick={() => router.push('/requests')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  All requests →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {data.pendingRequests.map((r) => (
                  <RideListRow
                    key={r.id}
                    scheduledAt={r.scheduledAt}
                    from={r.from}
                    to={r.to}
                    meta={<span>{r.passengerCount} passenger{r.passengerCount !== 1 ? 's' : ''}</span>}
                    badge={<StatusBadge status={r.status} />}
                    onClick={() => router.push(`/rides/${r.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Trips — from trip records, with this person's boarding status */}
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

            {data.recentHistory.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {data.recentHistory.map((entry) => (
                  <RideListRow
                    key={entry.tripId}
                    scheduledAt={entry.scheduledAt}
                    from={entry.from}
                    to={entry.to}
                    meta={<span>Requested by {entry.requesterName}</span>}
                    badge={
                      entry.tripStatus === 'COMPLETED' || entry.boardingStatus !== 'PENDING' ? (
                        <StatusBadge status={entry.boardingStatus} kind="boarding" />
                      ) : (
                        <StatusBadge status={entry.tripStatus} />
                      )
                    }
                    onClick={() => router.push(`/rides/${entry.requestId}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-400">No trips yet</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
