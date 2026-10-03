'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp, useCurrentUser } from '@/lib/app-state';
import { api, errorMessage } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { RideRequest, Trip } from '@/lib/types';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import RouteVisualization from '@/components/rides/RouteVisualization';
import RideTimeline from '@/components/rides/RideTimeline';
import PassengerRow from '@/components/rides/PassengerRow';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { formatDateFull, formatDayLabel, formatStamp, formatTime, shortId } from '@/lib/utils';
import { ArrowLeft, Users, XCircle } from 'lucide-react';

export default function RideDetailPage() {
  return (
    <AppLayout>
      <RideDetail />
    </AppLayout>
  );
}

function RideDetail() {
  const params = useParams();
  const router = useRouter();
  const user = useCurrentUser();
  const { addToast } = useApp();
  const id = params.id as string;
  const { data, error, loading, reload, setData } = useApiData<{ request: RideRequest; trip: Trip | null }>(
    `/requests/${id}`,
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (error && !data) {
    return (
      <div className="page-enter">
        <BackButton onClick={() => router.back()} />
        <ErrorState
          message={error.status === 404 ? 'This ride does not exist or is not yours.' : errorMessage(error)}
          onRetry={error.status === 404 ? undefined : reload}
        />
      </div>
    );
  }
  if (loading && !data) return <PageLoader />;
  if (!data) return null;

  const { request: ride, trip } = data;
  const isOwner = ride.requester.id === user.id;
  const canCancel = isOwner && (ride.status === 'PENDING' || ride.status === 'ACCEPTED');

  // Passengers with their boarding status come from the trip once it exists.
  const passengers = trip
    ? trip.passengers
    : ride.passengers.map((p) => ({ ...p, boardingStatus: 'PENDING' as const }));

  const timeline = [
    { label: 'Request created', time: formatStamp(ride.createdAt), completed: true },
    ride.status === 'CLASHED'
      ? { label: 'Clashed — Toto unavailable', time: formatStamp(ride.updatedAt), completed: true }
      : { label: 'Toto accepted', time: formatStamp(trip?.acceptedAt), completed: !!trip },
    { label: 'Pickup', time: formatStamp(trip?.startedAt), completed: !!trip?.startedAt },
    { label: 'Completed', time: formatStamp(trip?.completedAt), completed: !!trip?.completedAt },
  ];
  if (ride.status === 'CANCELLED') {
    timeline.splice(1, 3, { label: 'Cancelled', time: formatStamp(ride.cancelledAt), completed: true });
  }

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await api.post<{ request: RideRequest }>(`/requests/${ride.id}/cancel`);
      setData({ request: res.request, trip: trip ? { ...trip, status: 'CANCELLED' } : null });
      addToast('success', 'Request cancelled');
      setConfirmCancel(false);
    } catch (err) {
      addToast('error', errorMessage(err));
      setConfirmCancel(false);
      reload();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <BackButton onClick={() => router.back()} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Ride #{shortId(ride.id)}</h1>
            <StatusBadge status={ride.status} size="md" />
          </div>
        </div>
        {canCancel && (
          <Button variant="secondary" size="sm" onClick={() => setConfirmCancel(true)} icon={<XCircle className="w-4 h-4" />}>
            Cancel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          {/* Route Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
              <RouteVisualization from={ride.from} to={ride.to} horizontal size="md" />
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{formatTime(ride.scheduledAt)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 border-t border-gray-100 pt-4">
              <span>
                {formatDayLabel(ride.scheduledAt)} · {formatDateFull(ride.scheduledAt)}
              </span>
              <span className="text-gray-200 hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {ride.passengerCount} passenger{ride.passengerCount !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-200 hidden sm:inline">•</span>
              <span>Requested by {isOwner ? 'you' : ride.requester.name}</span>
              {trip && (
                <>
                  <span className="text-gray-200 hidden sm:inline">•</span>
                  <span>Rider: {trip.rider.name}</span>
                </>
              )}
            </div>
          </div>

          {/* Clash Warning */}
          {ride.status === 'CLASHED' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5" role="status">
              <p className="text-sm font-semibold text-amber-800 mb-1">Time slot unavailable</p>
              <p className="text-xs sm:text-sm text-amber-700">
                {ride.statusReason ?? `The Toto is already assigned to another trip at ${formatTime(ride.scheduledAt)}.`}
              </p>
              {isOwner && (
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => router.push('/request')}>
                  Request another time
                </Button>
              )}
            </div>
          )}

          {ride.status === 'CANCELLED' && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">Cancelled</p>
              <p className="text-xs sm:text-sm text-gray-500">{ride.statusReason ?? 'This request was cancelled.'}</p>
            </div>
          )}

          {/* Passengers */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Passengers</h3>
              {trip && (trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED') && (
                <span className="text-xs text-gray-500">
                  <span className="text-green-600 font-medium">{trip.boarding.boarded} boarded</span> ·{' '}
                  <span className="text-red-600 font-medium">{trip.boarding.missed} missed</span>
                </span>
              )}
            </div>
            <div className="space-y-1">
              {passengers.map((p, i) => (
                <PassengerRow
                  key={p.id}
                  passenger={p}
                  index={i}
                  highlight={p.name.toLowerCase() === user.name.toLowerCase()}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar — Timeline */}
        <div className="space-y-5 sm:space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Timeline</h3>
            <RideTimeline events={timeline} />
          </div>
        </div>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => !cancelling && setConfirmCancel(false)}
        title="Cancel this request?"
        subtitle={
          ride.status === 'ACCEPTED'
            ? 'The Toto has been reserved for you. Cancelling frees it for others.'
            : 'The rider will no longer see this request.'
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)} disabled={cancelling}>
              Keep Request
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelling}>
              Cancel Request
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {ride.from} → {ride.to} · {formatDayLabel(ride.scheduledAt)}, {formatTime(ride.scheduledAt)}
        </p>
      </Modal>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
