'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/app-state';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { Trip } from '@/lib/types';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import RouteVisualization from '@/components/rides/RouteVisualization';
import PassengerRow from '@/components/rides/PassengerRow';
import { SeatMeter } from '@/components/rides/TotoSchedule';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { formatRoute, formatDateFull, formatDayLabel, formatStamp, formatTime, shortId } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Check, Users, UserCheck, UserX, AlertCircle } from 'lucide-react';

export default function ActiveTripPage() {
  return (
    <AppLayout allow="RIDER">
      <ActiveTrip />
    </AppLayout>
  );
}

function ActiveTrip() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useApp();
  const tripId = params.id as string;
  const { data, error, loading, reload, setData } = useApiData<{ trip: Trip }>(`/trips/${tripId}`);
  const [showComplete, setShowComplete] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [busyPassenger, setBusyPassenger] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  if (error && !data) {
    return (
      <div className="page-enter">
        <BackToDesk onClick={() => router.push('/rider')} />
        <ErrorState message={error.status === 404 ? 'Trip not found.' : errorMessage(error)} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    );
  }
  if (loading && !data) return <PageLoader />;
  if (!data) return null;

  const trip = data.trip;
  const { boarded: boardedCount, missed: missedCount, pending: pendingCount } = trip.boarding;
  const inProgress = trip.status === 'IN_PROGRESS';

  const handleStart = async () => {
    setWorking(true);
    try {
      const res = await api.post<{ trip: Trip }>(`/trips/${trip.id}/start`);
      setData(res);
      addToast('info', 'Trip started — mark passengers as they board.');
    } catch (err) {
      addToast('error', errorMessage(err));
      reload();
    } finally {
      setWorking(false);
    }
  };

  const updatePassenger = async (passengerId: string, boardingStatus: 'BOARDED' | 'MISSED') => {
    setBusyPassenger(passengerId);
    try {
      const res = await api.patch<{ trip: Trip }>(`/trips/${trip.id}/passengers/${passengerId}`, { boardingStatus });
      setData(res);
      const name = res.trip.passengers.find((p) => p.id === passengerId)?.name ?? 'Passenger';
      addToast(boardingStatus === 'BOARDED' ? 'success' : 'error', `${name} marked as ${boardingStatus === 'BOARDED' ? 'boarded' : 'missed'}`);
    } catch (err) {
      addToast('error', errorMessage(err));
      reload();
    } finally {
      setBusyPassenger(null);
    }
  };

  const handleComplete = async () => {
    setWorking(true);
    try {
      const res = await api.post<{ trip: Trip }>(`/trips/${trip.id}/complete`);
      setData(res);
      setShowComplete(false);
      setJustCompleted(true);
      addToast('success', 'Trip completed — the Toto is available again.');
    } catch (err) {
      const pending = err instanceof ApiError ? (err.details as { pendingPassengers?: string[] } | undefined)?.pendingPassengers : undefined;
      addToast('error', pending?.length ? `Still pending: ${pending.join(', ')}` : errorMessage(err));
      setShowComplete(false);
      reload();
    } finally {
      setWorking(false);
    }
  };

  if (justCompleted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] page-enter">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 check-enter">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip completed</h2>
          <p className="text-gray-500 text-sm mb-2">Toto is now available for the next ride.</p>
          <p className="text-sm mb-8">
            <span className="text-green-600 font-semibold">{boardedCount} boarded</span>
            <span className="text-gray-300"> · </span>
            <span className="text-red-600 font-semibold">{missedCount} missed</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push('/rider')}>Back to Rider Desk</Button>
            <Button variant="secondary" onClick={() => setJustCompleted(false)}>
              View Trip Record
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const label =
    trip.status === 'IN_PROGRESS' ? 'Active Trip' : trip.status === 'ACCEPTED' ? 'Upcoming Trip' : 'Trip Record';

  return (
    <div className="page-enter">
      {/* Header */}
      <BackToDesk onClick={() => router.push('/rider')} />

      <div className="flex items-center gap-2 sm:gap-3 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
          {label}
        </span>
        <StatusBadge status={trip.status} size="md" />
      </div>

      <h1 className="text-xl sm:text-2xl lg:text-[28px] font-bold text-gray-900 tracking-tight mb-1">
        {formatRoute(trip.from, trip.to)}
      </h1>
      <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
        {formatTime(trip.scheduledAt)} → arrives {trip.to} ~{formatTime(trip.endsAt)} • {formatDayLabel(trip.scheduledAt)} ·{' '}
        {formatDateFull(trip.scheduledAt)}
        {trip.requests.length > 1 && <> • Shared run · {trip.requests.length} requests</>}
      </p>

      {trip.status === 'ACCEPTED' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-800">Ready for pickup</p>
            <p className="text-xs sm:text-sm text-blue-700">
              {trip.canStart
                ? 'Start the trip when you begin picking passengers up.'
                : 'Another trip is in progress. Complete it before starting this one.'}
            </p>
          </div>
          <Button onClick={handleStart} loading={working} disabled={!trip.canStart} icon={<ArrowRight className="w-4 h-4" />}>
            Start Trip
          </Button>
        </div>
      )}

      {trip.status === 'CANCELLED' && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700">Cancelled by the requester</p>
          <p className="text-xs sm:text-sm text-gray-500">This booking no longer holds the Toto.</p>
        </div>
      )}

      {trip.status === 'COMPLETED' && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-5 mb-6">
          <p className="text-sm font-semibold text-green-800">Completed {formatStamp(trip.completedAt, '')}</p>
          <p className="text-xs sm:text-sm text-green-700">Boarding records are final and kept in history.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          {/* Route */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex items-center justify-center">
            <RouteVisualization from={trip.from} to={trip.to} size="lg" />
          </div>

          {/* Pickup Checklist */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Pickup Checklist</h3>
              {inProgress && pendingCount > 0 && <span className="text-xs text-gray-400">{pendingCount} remaining</span>}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
              {inProgress
                ? 'Mark each passenger as Boarded or Missed. You can change a mark until the trip is completed.'
                : trip.status === 'ACCEPTED'
                  ? 'Start the trip to mark passengers.'
                  : 'Final boarding status for each passenger.'}
            </p>

            <div className="space-y-1">
              {trip.passengers.map((p, i) => (
                <PassengerRow
                  key={p.id}
                  passenger={p}
                  index={i}
                  subtitle={trip.requests.length > 1 ? `Booked by ${p.requesterName}` : undefined}
                  showControls={inProgress}
                  busy={busyPassenger === p.id}
                  disabled={busyPassenger !== null || working}
                  onBoard={(id) => updatePassenger(id, 'BOARDED')}
                  onMiss={(id) => updatePassenger(id, 'MISSED')}
                />
              ))}
            </div>

            {/* Complete button */}
            {inProgress && (
              <div className="mt-5 sm:mt-6 pt-4 border-t border-gray-100">
                <Button
                  onClick={() => setShowComplete(true)}
                  disabled={!trip.canComplete || busyPassenger !== null}
                  className="w-full"
                  size="lg"
                  icon={trip.canComplete ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                >
                  {trip.canComplete ? 'Complete Trip' : `${pendingCount} passenger${pendingCount !== 1 ? 's' : ''} pending`}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Live Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Pickup Summary</h3>

            <div className="space-y-4">
              <SummaryLine icon={<UserCheck className="w-4 h-4 text-green-600" />} tint="bg-green-50" label="Boarded" value={boardedCount} color="text-green-600" />
              <SummaryLine icon={<UserX className="w-4 h-4 text-red-600" />} tint="bg-red-50" label="Missed" value={missedCount} color="text-red-600" />
              <div className="h-px bg-gray-100" />
              <SummaryLine icon={<Users className="w-4 h-4 text-gray-500" />} tint="bg-gray-50" label="Total" value={trip.passengers.length} color="text-gray-900" />
              <SeatMeter seats={trip.seats} className="pt-1" />
            </div>
          </div>

          {/* Trip Info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Trip Info</h3>
            <div className="space-y-3 text-sm">
              <InfoLine label="Trip ID" value={`#${shortId(trip.id)}`} />
              <InfoLine
                label={trip.requests.length > 1 ? `Requests (${trip.requests.length})` : 'Requested by'}
                value={trip.requests.map((r) => `${r.requesterName} (${r.passengerCount})`).join(', ')}
              />
              <InfoLine label="Arrives" value={`${trip.to}, ~${formatTime(trip.endsAt)}`} />
              <InfoLine label="Rider" value={trip.rider.name} />
              <InfoLine label="Accepted" value={formatStamp(trip.acceptedAt)} />
              {trip.startedAt && <InfoLine label="Started" value={formatStamp(trip.startedAt)} />}
              {trip.completedAt && <InfoLine label="Completed" value={formatStamp(trip.completedAt)} />}
            </div>
          </div>
        </div>
      </div>

      {/* Complete Trip Modal */}
      <Modal
        open={showComplete}
        onClose={() => !working && setShowComplete(false)}
        title="Complete this trip?"
        subtitle="Boarding records become final and the Toto is released."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowComplete(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={handleComplete} loading={working} icon={<Check className="w-4 h-4" />}>
              Complete Trip
            </Button>
          </>
        }
      >
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Passengers</span>
            <span className="font-semibold text-gray-900">{trip.passengers.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Boarded</span>
            <span className="font-semibold text-green-600">{boardedCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Missed</span>
            <span className="font-semibold text-red-600">{missedCount}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function BackToDesk({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 mb-2">
      <button
        onClick={onClick}
        aria-label="Back to Rider Desk"
        className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Rider Desk</span>
    </div>
  );
}

function SummaryLine({ icon, tint, label, value, color }: { icon: React.ReactNode; tint: string; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${tint} flex items-center justify-center`}>{icon}</div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}
