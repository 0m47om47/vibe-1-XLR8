'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { errorMessage } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import StatBlock from '@/components/ui/StatBlock';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { cn, getInitials, roleLabel, formatDate, formatTime, formatRoute, formatDateFull } from '@/lib/utils';
import { ArrowLeft, MapPin, CheckCircle, XCircle } from 'lucide-react';
import type { User, Trip, RoleRequest, Role, AccountStatus } from '@/lib/types';

interface UserDetail {
  user: User;
  stats: { totalTrips: number; boardedTrips: number; missedTrips: number };
  trips: Trip[];
  pendingRoleRequest: RoleRequest | null;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppLayout allow="ADMIN">
      <UserDetailContent userId={id} />
    </AppLayout>
  );
}

function UserDetailContent({ userId }: { userId: string }) {
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<UserDetail>(`/admin/users/${userId}`);

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  if (loading && !data) return <PageLoader />;
  if (!data) return null;

  const { user, stats, trips, pendingRoleRequest } = data;

  const statusColor = (status: AccountStatus) => {
    if (status === 'ACTIVE') return 'bg-green-50 text-green-700 border-green-200';
    if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const roleBadgeColor = (role: Role) => {
    if (role === 'ADMIN') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (role === 'RIDER') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (role === 'EMPLOYEE') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="page-enter">
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/users')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Users
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl font-semibold">
              {getInitials(user.name)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight">{user.name}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border', roleBadgeColor(user.role))}>
                  {roleLabel(user.role)}
                </span>
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border', statusColor(user.accountStatus ?? 'ACTIVE'))}>
                  {(user.accountStatus ?? 'ACTIVE').charAt(0) + (user.accountStatus ?? 'ACTIVE').slice(1).toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">Email</p>
            <p className="text-sm font-medium text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Role</p>
            <p className="text-sm font-medium text-gray-900">{roleLabel(user.role)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Status</p>
            <p className="text-sm font-medium text-gray-900">{(user.accountStatus ?? 'ACTIVE').charAt(0) + (user.accountStatus ?? 'ACTIVE').slice(1).toLowerCase()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Joined</p>
            <p className="text-sm font-medium text-gray-900">{formatDateFull(user.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Pending Role Request */}
      {pendingRoleRequest && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
              Pending Request
            </span>
          </div>
          <p className="text-sm text-gray-900">
            Requesting role change to <span className="font-semibold">{roleLabel(pendingRoleRequest.requestedRole)}</span>
          </p>
          {pendingRoleRequest.reason && (
            <p className="text-sm text-gray-500 mt-1">Reason: {pendingRoleRequest.reason}</p>
          )}
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={() => router.push('/admin/role-requests')}>
              Review Request
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatBlock label="Total Trips" value={stats.totalTrips} icon={<MapPin className="w-4 h-4" />} />
        <StatBlock label="Boarded" value={stats.boardedTrips} icon={<CheckCircle className="w-4 h-4" />} color="green" />
        <StatBlock label="Missed" value={stats.missedTrips} icon={<XCircle className="w-4 h-4" />} color="red" />
      </div>

      {/* Trip History */}
      <div className="bg-white border border-gray-200 rounded-2xl">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Trip History</h2>
        </div>
        {trips.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {trips.map((trip) => {
              const passenger = trip.passengers.find((p) => p.name.toLowerCase().includes(user.name.split(' ')[0].toLowerCase()));
              return (
                <button
                  key={trip.id}
                  onClick={() => router.push(`/admin/trips/${trip.id}`)}
                  className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-center flex-shrink-0 w-16">
                      <p className="text-xs font-semibold text-gray-900">{formatDate(trip.scheduledAt)}</p>
                      <p className="text-[11px] text-gray-400">{formatTime(trip.scheduledAt)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{formatRoute(trip.from, trip.to)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Rider: {trip.rider.name}</p>
                      {passenger && (
                        <p className="text-xs mt-0.5">
                          Your status:{' '}
                          <StatusBadge status={passenger.boardingStatus} kind="boarding" />
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={trip.status} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">No trips yet</div>
        )}
      </div>
    </div>
  );
}
