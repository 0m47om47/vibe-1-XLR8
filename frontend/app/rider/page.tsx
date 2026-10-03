'use client';

import { useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo-state';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { formatRoute, getLocationLabel, getInitials } from '@/lib/utils';
import { Car, Users, Clock, AlertTriangle, CheckCircle, ArrowRight, Inbox } from 'lucide-react';

export default function RiderDeskPage() {
  const router = useRouter();
  const { rideRequests, totoStatus, activeTrip, acceptRide, startTrip } = useDemo();

  // Group requests by time for timeline view
  const pendingRequests = rideRequests.filter(
    (r) => r.status === 'REQUESTED' || r.status === 'ACCEPTED' || r.status === 'CLASHED'
  );
  const acceptedRide = rideRequests.find((r) => r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS');
  const inProgressRide = rideRequests.find((r) => r.status === 'IN_PROGRESS');

  const handleAccept = (rideId: string) => {
    acceptRide(rideId);
  };

  const handleStartTrip = (rideId: string) => {
    startTrip(rideId);
    router.push(`/rider/active/${rideId}`);
  };

  return (
    <AppLayout>
      <div className="page-enter">
        <TopHeader
          title="Rider Desk"
          subtitle="Today's Toto operations."
        />

        {/* Toto Status */}
        <div className={`rounded-2xl border p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          totoStatus === 'available'
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              totoStatus === 'available' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              <Car className={`w-5 h-5 ${
                totoStatus === 'available' ? 'text-green-600' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  totoStatus === 'available' ? 'bg-green-500 pulse-online' : 'bg-blue-500'
                }`} />
                <span className={`text-xs sm:text-sm font-semibold uppercase tracking-wide ${
                  totoStatus === 'available' ? 'text-green-700' : 'text-blue-700'
                }`}>
                  {totoStatus === 'available' ? 'Toto Available' : 'Toto On Trip'}
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-0.5 ${
                totoStatus === 'available' ? 'text-green-600' : 'text-blue-600'
              }`}>
                {totoStatus === 'available'
                  ? 'Ready for the next trip'
                  : inProgressRide
                    ? `${formatRoute(inProgressRide.from, inProgressRide.to)}`
                    : acceptedRide
                      ? `${formatRoute(acceptedRide.from, acceptedRide.to)} — ready to start`
                      : 'Trip in progress'
                }
              </p>
            </div>
          </div>

          {/* Start trip button when accepted but not started */}
          {acceptedRide && !inProgressRide && (
            <div className="w-full sm:w-auto">
              <Button
                onClick={() => handleStartTrip(acceptedRide.id)}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Start Trip
              </Button>
            </div>
          )}

          {/* Go to active trip */}
          {inProgressRide && (
            <div className="w-full sm:w-auto">
              <Button
                onClick={() => router.push(`/rider/active/${inProgressRide.id}`)}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Active Trip
              </Button>
            </div>
          )}
        </div>

        {/* Schedule / Requests */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5">Ride Requests</h2>
          <p className="text-xs sm:text-sm text-gray-500">Incoming Toto requests for today</p>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="space-y-0">
            {pendingRequests.map((request, i) => {
              const isClashed = request.status === 'CLASHED';
              const isAccepted = request.status === 'ACCEPTED';

              return (
                <div key={request.id} className="relative">
                  {/* Timeline dot and line */}
                  <div className="flex gap-3 sm:gap-5">
                    {/* Timeline on tablet/desktop */}
                    <div className="hidden sm:flex flex-col items-center pt-6 w-16 sm:w-20 flex-shrink-0">
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">{request.time}</span>
                      <div className={`w-3 h-3 rounded-full border-2 ${
                        isAccepted
                          ? 'bg-green-500 border-green-500'
                          : isClashed
                            ? 'bg-amber-400 border-amber-400'
                            : 'bg-white border-gray-300'
                      }`} />
                      {i < pendingRequests.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 mt-2" />
                      )}
                    </div>

                    {/* Card */}
                    <div className={`flex-1 bg-white border rounded-2xl p-4 sm:p-5 mb-3 sm:mb-4 transition-all ${
                      isClashed
                        ? 'border-amber-200 opacity-60'
                        : isAccepted
                          ? 'border-green-200 ring-1 ring-green-100'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}>
                      {/* Mobile time badge */}
                      <div className="sm:hidden flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {request.time}
                        </span>
                        <StatusBadge status={request.status} />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="hidden sm:flex items-center gap-3 mb-2">
                            <span className="text-base font-semibold text-gray-900 truncate">
                              {formatRoute(request.from, request.to)}
                            </span>
                            <StatusBadge status={request.status} />
                          </div>

                          <div className="sm:hidden text-base font-semibold text-gray-900 mb-1 truncate">
                            {formatRoute(request.from, request.to)}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {request.passengers.length} passenger{request.passengers.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-gray-200 hidden sm:inline">•</span>
                            <span>Requested by {request.requestedByName}</span>
                          </div>

                          {/* Passenger avatars */}
                          <div className="flex items-center gap-1 mt-3">
                            {request.passengers.map((p) => (
                              <div
                                key={p.id}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 border-2 border-white -ml-1 first:ml-0"
                              >
                                {getInitials(p.name)}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 pt-1 sm:pt-0">
                          {request.status === 'REQUESTED' && (
                            <Button
                              size="sm"
                              onClick={() => handleAccept(request.id)}
                              disabled={!!acceptedRide}
                              className="w-full sm:w-auto"
                            >
                              Accept
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
                            <p className="text-xs text-amber-600">
                              The Toto is already assigned to another trip at {request.time}.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl">
            <EmptyState
              icon={<Inbox className="w-7 h-7" />}
              title="Nothing waiting."
              description="All Toto requests have been handled."
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
