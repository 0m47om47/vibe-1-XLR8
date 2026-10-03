'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApiData } from '@/lib/use-api';
import { api, errorMessage } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { cn, getInitials, roleLabel, formatDateFull } from '@/lib/utils';
import { Search, MoreHorizontal, Eye, Route, UserCog, Ban, ShieldOff, UserCheck } from 'lucide-react';
import type { User, Role, AccountStatus } from '@/lib/types';

interface UserWithTrips {
  user: User;
  tripCount: number;
}

const ROLE_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Student', value: 'STUDENT' },
  { label: 'Employee', value: 'EMPLOYEE' },
  { label: 'Rider', value: 'RIDER' },
  { label: 'Admin', value: 'ADMIN' },
];

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Suspended', value: 'SUSPENDED' },
];

export default function AdminUsersPage() {
  return (
    <AppLayout allow="ADMIN">
      <UsersContent />
    </AppLayout>
  );
}

function UsersContent() {
  const router = useRouter();
  const { addToast } = useApp();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<UserWithTrips | null>(null);
  const [suspendModal, setSuspendModal] = useState<UserWithTrips | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('STUDENT');
  const [loading, setLoading] = useState(false);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('accountStatus', statusFilter);
    return params.toString();
  }, [search, roleFilter, statusFilter]);

  const { data, error, loading: dataLoading, reload } = useApiData<UserWithTrips[]>(
    `/admin/users${queryParams ? `?${queryParams}` : ''}`
  );

  const handleChangeRole = async () => {
    if (!roleModal) return;
    setLoading(true);
    try {
      await api.patch(`/admin/users/${roleModal.user.id}`, { role: selectedRole });
      addToast('success', 'Role updated successfully.');
      setRoleModal(null);
      reload();
    } catch (err) {
      addToast('error', errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (u: UserWithTrips, action: 'suspend' | 'activate') => {
    setLoading(true);
    try {
      await api.patch(`/admin/users/${u.user.id}`, {
        accountStatus: action === 'suspend' ? 'SUSPENDED' : 'ACTIVE',
      });
      addToast('success', action === 'suspend' ? 'User suspended.' : 'User activated.');
      setSuspendModal(null);
      reload();
    } catch (err) {
      addToast('error', errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={reload} />;

  return (
    <div className="page-enter">
      <TopHeader title="Users" subtitle="Manage people using Lawazia Toto Desk." />

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {ROLE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {dataLoading && !data ? (
        <PageLoader />
      ) : data ? (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Trips</th>
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="text-right px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((item) => (
                  <tr key={item.user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {getInitials(item.user.name)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{item.user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.user.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', roleBadgeColor(item.user.role))}>
                        {roleLabel(item.user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.tripCount} trips</td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', statusColor(item.user.accountStatus ?? 'ACTIVE'))}>
                        {(item.user.accountStatus ?? 'ACTIVE').charAt(0) + (item.user.accountStatus ?? 'ACTIVE').slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDateFull(item.user.createdAt)}</td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === item.user.id ? null : item.user.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                      {actionMenu === item.user.id && (
                        <ActionMenu
                          item={item}
                          onClose={() => setActionMenu(null)}
                          onViewProfile={() => { router.push(`/admin/users/${item.user.id}`); setActionMenu(null); }}
                          onViewTrips={() => { router.push(`/admin/users/${item.user.id}`); setActionMenu(null); }}
                          onChangeRole={() => { setSelectedRole(item.user.role); setRoleModal(item); setActionMenu(null); }}
                          onSuspend={() => { setSuspendModal(item); setActionMenu(null); }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-400">No users found</div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {data.map((item) => (
              <div key={item.user.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                      {getInitials(item.user.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.user.name}</p>
                      <p className="text-xs text-gray-400">{item.user.email}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === item.user.id ? null : item.user.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                    {actionMenu === item.user.id && (
                      <ActionMenu
                        item={item}
                        onClose={() => setActionMenu(null)}
                        onViewProfile={() => { router.push(`/admin/users/${item.user.id}`); setActionMenu(null); }}
                        onViewTrips={() => { router.push(`/admin/users/${item.user.id}`); setActionMenu(null); }}
                        onChangeRole={() => { setSelectedRole(item.user.role); setRoleModal(item); setActionMenu(null); }}
                        onSuspend={() => { setSuspendModal(item); setActionMenu(null); }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', roleBadgeColor(item.user.role))}>
                    {roleLabel(item.user.role)}
                  </span>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', statusColor(item.user.accountStatus ?? 'ACTIVE'))}>
                    {(item.user.accountStatus ?? 'ACTIVE').charAt(0) + (item.user.accountStatus ?? 'ACTIVE').slice(1).toLowerCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{item.tripCount} trips</p>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/admin/users/${item.user.id}`)}
                    icon={<Eye className="w-3.5 h-3.5" />}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-400">No users found</div>
            )}
          </div>
        </>
      ) : null}

      {/* Change Role Modal */}
      <Modal
        open={!!roleModal}
        onClose={() => setRoleModal(null)}
        title="Change Role"
        subtitle={roleModal ? `Change role for ${roleModal.user.name}` : ''}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRoleModal(null)}>Cancel</Button>
            <Button onClick={handleChangeRole} loading={loading}>Update Role</Button>
          </>
        }
      >
        {roleModal && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Current role</p>
              <p className="text-sm font-medium text-gray-900">{roleLabel(roleModal.user.role)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">New role</p>
              <div className="space-y-2">
                {(['STUDENT', 'EMPLOYEE', 'RIDER', 'ADMIN'] as Role[]).map((r) => (
                  <label
                    key={r}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all',
                      selectedRole === r
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={selectedRole === r}
                      onChange={() => setSelectedRole(r)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-900">{roleLabel(r)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Suspend/Activate Modal */}
      <Modal
        open={!!suspendModal}
        onClose={() => setSuspendModal(null)}
        title={suspendModal?.user.accountStatus === 'SUSPENDED' ? 'Activate User' : 'Suspend User'}
        subtitle={suspendModal ? `${suspendModal.user.name}` : ''}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSuspendModal(null)}>Cancel</Button>
            {suspendModal?.user.accountStatus === 'SUSPENDED' ? (
              <Button onClick={() => handleSuspend(suspendModal!, 'activate')} loading={loading}>
                Activate User
              </Button>
            ) : (
              <Button variant="danger" onClick={() => handleSuspend(suspendModal!, 'suspend')} loading={loading}>
                Suspend User
              </Button>
            )}
          </>
        }
      >
        {suspendModal && (
          <p className="text-sm text-gray-600">
            {suspendModal.user.accountStatus === 'SUSPENDED'
              ? `Are you sure you want to reactivate ${suspendModal.user.name}'s account? They will be able to use the application again.`
              : `Are you sure you want to suspend ${suspendModal.user.name}'s account? They will not be able to use the application until reactivated.`}
          </p>
        )}
      </Modal>
    </div>
  );
}

function ActionMenu({
  item,
  onClose,
  onViewProfile,
  onViewTrips,
  onChangeRole,
  onSuspend,
}: {
  item: UserWithTrips;
  onClose: () => void;
  onViewProfile: () => void;
  onViewTrips: () => void;
  onChangeRole: () => void;
  onSuspend: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 modal-enter">
        <button onClick={onViewProfile} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
          <Eye className="w-4 h-4 text-gray-400" /> View Profile
        </button>
        <button onClick={onViewTrips} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
          <Route className="w-4 h-4 text-gray-400" /> View Trips
        </button>
        <button onClick={onChangeRole} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
          <UserCog className="w-4 h-4 text-gray-400" /> Change Role
        </button>
        <div className="h-px bg-gray-100 my-1" />
        <button onClick={onSuspend} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
          {item.user.accountStatus === 'SUSPENDED' ? (
            <><UserCheck className="w-4 h-4" /> Activate User</>
          ) : (
            <><Ban className="w-4 h-4" /> Suspend User</>
          )}
        </button>
        {item.user.role === 'ADMIN' && (
          <button onClick={onChangeRole} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer">
            <ShieldOff className="w-4 h-4" /> Remove Admin Access
          </button>
        )}
      </div>
    </>
  );
}
