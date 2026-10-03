'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/app-state';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { RideRequest, RiderDashboard, Trip } from '@/lib/types';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import StatBlock from '@/components/ui/StatBlock';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { formatDayLabel, formatRoute, formatTime, getInitials, startOfTodayIso } from '@/lib/utils';
import {
  Car,
  Users,
  Clock,
  AlertTriangle,
  ArrowRight,
  Inbox,
  RefreshCw,
  CheckCircle,
  UserCheck,
  UserX,
} from 'lucide-react';

const SHOWN: RideRequest['status'][] = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'CLASHED'];

export default function RiderDeskPage() {
  return (
    <AppLayout allow="RIDER">
      <RiderDesk />
    </AppLayout>
  );
}

function RiderDesk() {
  const router = useRouter();
  const { addToast } = useApp();
  const [dayStart] = useState(startOfTodayIso);
  const dash = useApiData<RiderDashboard>(`/dashboard?dayStart=${encodeURIComponent(dayStart)}`);
  const queue = useApiData<{ requests: RideRequest[] }>('/requests?upcoming=true&limit=100');
  const [acting, setActing] = useState<string | null>(null);

  const refresh = async () => {
    await Promise.all([dash.reload(), queue.reload()]);
  };

  const requests = useMemo(
    () => (queue.data?.requests ?? []).filter((r) => SHOWN.includes(r.status)),
    [queue.data],
  );

  const handleAccept = async (request: RideRequest) => {
    setActing(request.id);
    try {
      const res = await api.post<{ request: RideRequest; trip: Trip; clashedRequestIds: string[] }>(
        `/requests/${request.id}/accept`,
      );
      const n = res.clashedRequestIds.length;
      if (n > 0) {
        addToast('warning', `Ride accepted. ${n} overlapping request${n > 1 ? 's were' : ' was'} marked as clashed.`);
      } else {
        addToast('success', 'Ride accepted — the Toto is reserved.');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TRIP_CLASH') {
        addToast('warning', 'Time slot unavailable — the Toto is already booked then. Request marked as clashed.');
      } else {
        addToast('error', errorMessage(err));
      }
    } finally {
      setActing(null);
      refresh();
    }
  };

  const handleStart = async (trip: Trip) => {
    setActing(trip.id);
    try {
      await api.post(`/trips/${trip.id}/start`);
      addToast('info', 'Trip started — mark passengers as they board.');
      router.push(`/rider/active/${trip.id}`);
    } catch (err) {
      addToast('error', errorMessage(err));
      setActing(null);
      refresh();
    }
  };

  if (dash.error && !dash.data) return <ErrorState message={errorMessage(dash.error)} onRetry={refresh} />;
  if (!dash.data) return <PageLoader />;

  const { vehicle, currentTrip, nextTrip, today } = dash.data;
  const onTrip = vehicle.status === 'ON_TRIP';
  const inProgress = currentTrip?.status === 'IN_PROGRESS' ? currentTrip : null;
  const readyTrip = !inProgress && currentTrip?.status === 'ACCEPTED' ? currentTrip : null;
  // The next trip to run: the one after the active trip, or the ready trip itself.
  const nextToRun = inProgress ? nextTrip : readyTrip;

  return (
    <div className="page-enter">
      <TopHeader
        title="Rider Desk"
        subtitle="Toto operations, live from the schedule."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={refresh}
            loading={dash.loading || queue.loading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        }
      />

      {/* Toto Status */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          onTrip ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${onTrip ? 'bg-blue-100' : 'bg-green-100'}`}>
            <Car className={`w-5 h-5 ${onTrip ? 'text-blue-600' : 'text-green-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${onTrip ? 'bg-blue-500' : 'bg-green-500 pulse-online'}`} />
              <span className={`text-xs sm:text-sm font-semibold uppercase tracking-wide ${onTrip ? 'text-blue-700' : 'text-green-700'}`}>
                {onTrip ? 'Toto On Trip' : 'Toto Available'}
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-0.5 ${onTrip ? 'text-blue-600' : 'text-green-600'}`}>
              {inProgress
                ? `${formatRoute(inProgress.from, inProgress.to)} — ${inProgress.boarding.pending} passenger${inProgress.boarding.pending !== 1 ? 's' : ''} to mark`
                : readyTrip
                  ? `Next: ${formatRoute(readyTrip.from, readyTrip.to)} · ${formatDayLabel(readyTrip.scheduledAt)}, ${formatTime(readyTrip.scheduledAt)}`
                  : 'Ready for the next trip'}
            </p>
          </div>
        </div>

        {readyTrip && (
          <div className="w-full sm:w-auto flex gap-2">
            <Button variant="secondary" onClick={() => router.push(`/rider/active/${readyTrip.id}`)} className="flex-1 sm:flex-none">
              Details
            </Button>
            <Button
              onClick={() => handleStart(readyTrip)}
              loading={acting === readyTrip.id}
              disabled={!readyTrip.canStart || acting !== null}
              icon={<ArrowRight className="w-4 h-4" />}
              className="flex-1 sm:flex-none"
            >
              Start Trip
            </Button>
          </div>
        )}

        {inProgress && (
          <div className="w-full sm:w-auto">
            <Button onClick={() => router.push(`/rider/active/${inProgress.id}`)} icon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto">
              Active Trip
            </Button>
          </div>
        )}
      </div>

      {/* Today */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatBlock
          label={nextToRun ? `Next Trip · ${formatDayLabel(nextToRun.scheduledAt)}` : "Next Trip"}
          value={nextToRun ? formatTime(nextToRun.scheduledAt) : '—'}
          icon={<Clock className="w-4 h-4" />}
          color="blue"
        />
        <StatBlock label="Completed Today" value={today.completedTrips} icon={<CheckCircle className="w-4 h-4" />} />
        <StatBlock label="Boarded Today" value={today.passengersBoarded} icon={<UserCheck className="w-4 h-4" />} color="green" />
        <StatBlock label="Missed Today" value={today.passengersMissed} icon={<UserX className="w-4 h-4" />} color="red" />
      </div>

      {/* Schedule / Requests */}
      <div className="mb-4 sm:mb-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5">Ride Requests</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Upcoming requests and bookings · {dash.data.pendingCount} waiting for you
          </p>
        </div>
      </div>

      {queue.error && !queue.data ? (
        <ErrorState message={errorMessage(queue.error)} onRetry={queue.reload} />
      ) : requests.length > 0 ? (
        <div className="space-y-0">
          {requests.map((request, i) => {
            const isClashed = request.status === 'CLASHED';
            const isBooked = request.status === 'ACCEPTED' || request.status === 'IN_PROGRESS';
            const newDay = i === 0 || formatDayLabel(requests[i - 1].scheduledAt) !== formatDayLabel(request.scheduledAt);

            return (
              <div key={request.id}>
                {newDay && (
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2 mt-4 first:mt-0 sm:ml-[100px]">
                    {formatDayLabel(request.scheduledAt)}
                  </p>
                )}
                <div className="flex gap-3 sm:gap-5">
                  {/* Timeline on tablet/desktop */}
                  <div className="hidden sm:flex flex-col items-center pt-6 w-16 sm:w-20 flex-shrink-0">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 whitespace-nowrap">
                      {formatTime(request.scheduledAt)}
                    </span>
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${
                        isBooked ? 'bg-green-500 border-green-500' : isClashed ? 'bg-amber-400 border-amber-400' : 'bg-white border-gray-300'
                      }`}
                    />
                    {i < requests.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-2" />}
                  </div>

                  {/* Card */}
                  <div
                    className={`flex-1 bg-white border rounded-2xl p-4 sm:p-5 mb-3 sm:mb-4 transition-all ${
                      isClashed
                        ? 'border-amber-200 opacity-70'
                        : isBooked
                          ? 'border-green-200 ring-1 ring-green-100'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Mobile time badge */}
                    <div className="sm:hidden flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatTime(request.scheduledAt)}
                      </span>
                      <StatusBadge status={request.status} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="hidden sm:flex items-center gap-3 mb-2">
                          <span className="text-base font-semibold text-gray-900 truncate">{formatRoute(request.from, request.to)}</span>
                          <StatusBadge status={request.status} />
                        </div>
                        <div className="sm:hidden text-base font-semibold text-gray-900 mb-1 truncate">
                          {formatRoute(request.from, request.to)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {request.passengerCount} passenger{request.passengerCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-gray-200 hidden sm:inline">•</span>
                          <span>Requested by {request.requester.name}</span>
                        </div>

                        {/* Passenger avatars */}
                        <div className="flex items-center gap-1 mt-3">
                          {request.passengers.map((p) => (
                            <div
                              key={p.id}
                              title={p.name}
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 border-2 border-white -ml-1 first:ml-0"
                            >
                              {getInitials(p.name)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 pt-1 sm:pt-0">
                        {request.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => handleAccept(request)}
                            loading={acting === request.id}
                            disabled={acting !== null}
                            className="w-full sm:w-auto"
                          >
                            Accept
                          </Button>
                        )}
                        {isBooked && request.tripId && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => router.push(`/rider/active/${request.tripId}`)}
                            className="w-full sm:w-auto"
                          >
                            Open Trip
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Clash message */}
                    {isClashed && (
                      <div className="flex items-start gap-2 mt-3 sm:mt-4 pt-3 border-t border-amber-100">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-amber-800">Time slot unavailable</p>
                          <p className="text-xs text-amber-600">The Toto is already assigned for this time.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : queue.loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl">
          <EmptyState icon={<Inbox className="w-7 h-7" />} title="Nothing waiting." description="No upcoming Toto requests right now." />
        </div>
      )}
    </div>
  );
}
