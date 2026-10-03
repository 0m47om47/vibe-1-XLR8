'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo-state';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import RouteVisualization from '@/components/rides/RouteVisualization';
import PassengerRow from '@/components/rides/PassengerRow';
import { formatRoute, formatDateFull, isToday } from '@/lib/utils';
import { ArrowLeft, Check, Users, UserCheck, UserX, AlertCircle, Car } from 'lucide-react';

export default function ActiveTripPage() {
  const params = useParams();
  const router = useRouter();
  const { rideRequests, updatePassengerStatus, completeTrip } = useDemo();
  const [showComplete, setShowComplete] = useState(false);
  const [completed, setCompleted] = useState(false);

  const rideId = params.id as string;
  const ride = rideRequests.find((r) => r.id === rideId);

  if (!ride) {
    return (
      <AppLayout>
        <div className="page-enter text-center py-20">
          <p className="text-gray-500">Trip not found</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.push('/rider')}>
            Back to Rider Desk
          </Button>
        </div>
      </AppLayout>
    );
  }

  const boardedCount = ride.passengers.filter((p) => p.status === 'BOARDED').length;
  const missedCount = ride.passengers.filter((p) => p.status === 'MISSED').length;
  const pendingCount = ride.passengers.filter((p) => p.status === 'PENDING').length;
  const allHandled = pendingCount === 0;

  const handleComplete = () => {
    completeTrip(rideId);
    setShowComplete(false);
    setCompleted(true);
  };

  if (completed || ride.status === 'COMPLETED') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] page-enter">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 check-enter">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip completed</h2>
            <p className="text-gray-500 text-sm mb-8">
              Toto is now available for the next ride.
            </p>
            <Button onClick={() => router.push('/rider')}>
              Back to Rider Desk
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-enter">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-2">
          <button
            onClick={() => router.push('/rider')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Rider Desk
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            Active Trip
          </span>
          <StatusBadge status="IN_PROGRESS" size="md" />
        </div>

        <h1 className="text-xl sm:text-2xl lg:text-[28px] font-bold text-gray-900 tracking-tight mb-1">
          {formatRoute(ride.from, ride.to)}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
          {ride.time} • {isToday(ride.date) ? 'Today' : ''} {formatDateFull(ride.date)}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
            {/* Route */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex items-center justify-center">
              <RouteVisualization from={ride.from} to={ride.to} size="lg" />
            </div>

            {/* Pickup Checklist */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Pickup Checklist</h3>
                {!allHandled && (
                  <span className="text-xs text-gray-400">{pendingCount} remaining</span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                Mark each passenger as they board.
              </p>

              <div className="space-y-1">
                {ride.passengers.map((p, i) => (
                  <PassengerRow
                    key={p.id}
                    passenger={p}
                    index={i}
                    showControls
                    onBoard={(id) => updatePassengerStatus(rideId, id, 'BOARDED')}
                    onMiss={(id) => updatePassengerStatus(rideId, id, 'MISSED')}
                  />
                ))}
              </div>

              {/* Complete button */}
              <div className="mt-5 sm:mt-6 pt-4 border-t border-gray-100">
                <Button
                  onClick={() => setShowComplete(true)}
                  disabled={!allHandled}
                  className="w-full"
                  size="lg"
                  icon={allHandled ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                >
                  {allHandled ? 'Complete Trip' : `${pendingCount} passenger${pendingCount !== 1 ? 's' : ''} pending`}
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar — Live Summary */}
          <div className="space-y-6">
            {/* Pickup Summary */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Pickup Summary</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-600">Boarded</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{boardedCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                      <UserX className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="text-sm text-gray-600">Missed</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{missedCount}</span>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm text-gray-600">Total</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{ride.passengers.length}</span>
                </div>
              </div>
            </div>

            {/* Trip Info */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Trip Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ride ID</span>
                  <span className="font-medium text-gray-900">{ride.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Requested by</span>
                  <span className="font-medium text-gray-900">{ride.requestedByName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="font-medium text-gray-900">{ride.createdAt}</span>
                </div>
                {ride.acceptedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Accepted</span>
                    <span className="font-medium text-gray-900">{ride.acceptedAt}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Trip Modal */}
      <Modal
        open={showComplete}
        onClose={() => setShowComplete(false)}
        title="Complete this trip?"
        subtitle="All passenger boarding statuses have been recorded."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowComplete(false)}>Cancel</Button>
            <Button onClick={handleComplete} icon={<Check className="w-4 h-4" />}>
              Complete Trip
            </Button>
          </>
        }
      >
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Passengers</span>
            <span className="font-semibold text-gray-900">{ride.passengers.length}</span>
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
    </AppLayout>
  );
}
