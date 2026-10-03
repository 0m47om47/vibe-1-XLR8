'use client';

import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatBlock from '@/components/ui/StatBlock';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { formatDate, formatTime, formatRoute, getInitials } from '@/lib/utils';
import {
  Users,
  GraduationCap,
  Briefcase,
  Car,
  Route,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import type { Trip, RoleRequest } from '@/lib/types';

interface AdminDashboard {
  userCounts: { total: number; students: number; employees: number; riders: number; admins: number };
  tripCounts: { total: number; completed: number; clashed: number; pendingRequests: number };
  vehicle: { status: 'AVAILABLE' | 'ON_TRIP'; currentTripId: string | null } | null;
  currentTrip: Trip | null;
  recentTrips: Trip[];
  recentRoleRequests: RoleRequest[];
}

export default function AdminPage() {
  return (
    <AppLayout allow="ADMIN">
      <AdminDashboardContent />
    </AppLayout>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<AdminDashboard>('/admin');

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  if (loading && !data) return <PageLoader />;
  if (!data) return null;

  return (
    <div className="page-enter">
      <TopHeader
        title="Admin Overview"
        subtitle="Manage users, roles and Toto operations."
      />

      {/* User Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <StatBlock label="Total Users" value={data.userCounts.total} icon={<Users className="w-4 h-4" />} />
        <StatBlock label="Students" value={data.userCounts.students} icon={<GraduationCap className="w-4 h-4" />} color="blue" />
        <StatBlock label="Employees" value={data.userCounts.employees} icon={<Briefcase className="w-4 h-4" />} color="green" />
        <StatBlock label="Riders" value={data.userCounts.riders} icon={<Car className="w-4 h-4" />} color="amber" />
      </div>

      {/* Trip Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatBlock label="Total Trips" value={data.tripCounts.total} icon={<Route className="w-4 h-4" />} />
        <StatBlock label="Completed" value={data.tripCounts.completed} icon={<CheckCircle className="w-4 h-4" />} color="green" />
        <StatBlock label="Clashed" value={data.tripCounts.clashed} icon={<AlertTriangle className="w-4 h-4" />} color="amber" />
        <StatBlock label="Pending Requests" value={data.tripCounts.pendingRequests} icon={<Clock className="w-4 h-4" />} color="blue" />
      </div>

      {/* Toto Status */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Toto Status</p>
            {data.vehicle?.status === 'ON_TRIP' ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">🔵</span>
                <span className="text-lg font-bold text-blue-600">ON TRIP</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg">🟢</span>
                <span className="text-lg font-bold text-green-600">AVAILABLE</span>
              </div>
            )}
            {data.currentTrip ? (
              <div className="mt-3 text-sm text-gray-500 space-y-1">
                <p className="font-medium text-gray-900">{formatRoute(data.currentTrip.from, data.currentTrip.to)}</p>
                <p>{formatTime(data.currentTrip.scheduledAt)}</p>
                <p>Rider: {data.currentTrip.rider.name}</p>
                <p>Passengers: {data.currentTrip.passengers.length}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">Ready for next trip</p>
            )}
          </div>
          {data.currentTrip && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/admin/trips/${data.currentTrip!.id}`)}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Trip
            </Button>
          )}
        </div>
      </div>

      {/* Recent Trips */}
      <div className="bg-white border border-gray-200 rounded-2xl mb-6">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Trips</h2>
          <button
            onClick={() => router.push('/admin/trips')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            View all →
          </button>
        </div>
        {data.recentTrips.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {data.recentTrips.slice(0, 5).map((trip) => (
              <button
                key={trip.id}
                onClick={() => router.push(`/admin/trips/${trip.id}`)}
                className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-center flex-shrink-0 w-12">
                    <p className="text-xs font-semibold text-gray-900">{formatDate(trip.scheduledAt)}</p>
                    <p className="text-[11px] text-gray-400">{formatTime(trip.scheduledAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{formatRoute(trip.from, trip.to)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Rider: {trip.rider.name} · {trip.passengers.length} passengers
                    </p>
                  </div>
                </div>
                <StatusBadge status={trip.status} />
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">No trips yet</div>
        )}
      </div>

      {/* Recent Role Requests */}
      <div className="bg-white border border-gray-200 rounded-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Pending Role Requests</h2>
          <button
            onClick={() => router.push('/admin/role-requests')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            View all requests →
          </button>
        </div>
        {data.recentRoleRequests.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {data.recentRoleRequests.map((req) => (
              <div key={req.id} className="px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                    {getInitials(req.userName)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.userName}</p>
                    <p className="text-xs text-gray-400">
                      Requested: <span className="font-medium text-gray-600">{req.requestedRole}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push('/admin/role-requests')}
                >
                  Review
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">No pending role requests</div>
        )}
      </div>
    </div>
  );
}
