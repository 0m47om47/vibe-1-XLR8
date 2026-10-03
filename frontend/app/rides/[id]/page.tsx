'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo-state';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import RouteVisualization from '@/components/rides/RouteVisualization';
import RideTimeline from '@/components/rides/RideTimeline';
import PassengerRow from '@/components/rides/PassengerRow';
import { formatDateFull, isToday, getLocationLabel } from '@/lib/utils';
import { ArrowLeft, Users, Car } from 'lucide-react';

export default function RideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { rideRequests, pastTrips } = useDemo();

  const rideId = params.id as string;
  const ride = [...rideRequests, ...pastTrips].find((r) => r.id === rideId);

  if (!ride) {
    return (
      <AppLayout>
        <div className="page-enter text-center py-20">
          <p className="text-gray-500">Ride not found</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const timeline = [
    { label: 'Request created', time: ride.createdAt, completed: true },
    {
      label: 'Toto accepted',
      time: ride.acceptedAt || 'Pending',
      completed: !!ride.acceptedAt,
    },
    {
      label: 'Pickup',
      time: ride.startedAt || 'Pending',
      completed: !!ride.startedAt,
    },
    {
      label: 'Completed',
      time: ride.completedAt || 'Pending',
      completed: !!ride.completedAt,
    },
  ];

  return (
    <AppLayout>
      <div className="page-enter">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Ride #{ride.id}</h1>
              <StatusBadge status={ride.status} size="md" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
            {/* Route Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                <RouteVisualization from={ride.from} to={ride.to} horizontal size="md" />
                <span className="text-xl sm:text-2xl font-bold text-gray-900">{ride.time}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 border-t border-gray-100 pt-4">
                <span>
                  {isToday(ride.date) ? 'Today' : ''} {formatDateFull(ride.date)}
                </span>
                <span className="text-gray-200 hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {ride.passengers.length} passengers
                </span>
                <span className="text-gray-200 hidden sm:inline">•</span>
                <span>Requested by {ride.requestedByName}</span>
              </div>
            </div>

            {/* Clash Warning */}
            {ride.status === 'CLASHED' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5">
                <p className="text-sm font-semibold text-amber-800 mb-1">Time slot unavailable</p>
                <p className="text-xs sm:text-sm text-amber-700">
                  The Toto is already assigned to another trip at {ride.time}.
                </p>
              </div>
            )}

            {/* Passengers */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Passengers</h3>
              <div className="space-y-1">
                {ride.passengers.map((p, i) => (
                  <PassengerRow key={p.id} passenger={p} index={i} />
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
      </div>
    </AppLayout>
  );
}
