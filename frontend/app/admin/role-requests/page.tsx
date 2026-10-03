'use client';

import { useState } from 'react';
import { useApiData } from '@/lib/use-api';
import { api, errorMessage } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ErrorState, PageLoader } from '@/components/ui/PageState';
import { cn, getInitials, roleLabel, formatDateFull, formatTime } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import type { RoleRequest, RoleRequestStatus } from '@/lib/types';

const TABS: { label: string; value: RoleRequestStatus | '' }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export default function AdminRoleRequestsPage() {
  return (
    <AppLayout allow="ADMIN">
      <RoleRequestsContent />
    </AppLayout>
  );
}

function RoleRequestsContent() {
  const { addToast } = useApp();
  const [tab, setTab] = useState<RoleRequestStatus | ''>('PENDING');
  const [approveModal, setApproveModal] = useState<RoleRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<RoleRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const queryParam = tab ? `?status=${tab}` : '';
  const { data, error, loading: dataLoading, reload } = useApiData<RoleRequest[]>(
    `/admin/role-requests${queryParam}`,
    { keepPrevious: true }
  );

  const handleApprove = async () => {
    if (!approveModal) return;
    setLoading(true);
    try {
      await api.patch(`/admin/role-requests/${approveModal.id}`, { action: 'approve' });
      addToast('success', `Role request approved. ${approveModal.userName} is now ${roleLabel(approveModal.requestedRole)}.`);
      setApproveModal(null);
      reload();
    } catch (err) {
      addToast('error', errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setLoading(true);
    try {
      await api.patch(`/admin/role-requests/${rejectModal.id}`, {
        action: 'reject',
        rejectionReason: rejectionReason.trim() || undefined,
      });
      addToast('success', 'Role request rejected.');
      setRejectModal(null);
      setRejectionReason('');
      reload();
    } catch (err) {
      addToast('error', errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: RoleRequestStatus) => {
    if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'APPROVED') return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={reload} />;

  return (
    <div className="page-enter">
      <TopHeader title="Role Requests" subtitle="Review requests for access and role changes." />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as RoleRequestStatus)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
              tab === t.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {dataLoading && !data ? (
        <PageLoader />
      ) : data ? (
        <div className="space-y-4">
          {data.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center">
              <p className="text-sm text-gray-400">
                {tab === 'PENDING' ? 'No pending role requests' : `No ${tab.toLowerCase()} requests`}
              </p>
            </div>
          )}
          {data.map((req) => (
            <div key={req.id} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                    {getInitials(req.userName)}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">{req.userName}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{req.userEmail}</p>
                  </div>
                </div>
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border self-start', statusColor(req.status))}>
                  {req.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Current role</p>
                  <p className="text-sm font-medium text-gray-900">{roleLabel(req.currentRole)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Requested role</p>
                  <p className="text-sm font-medium text-gray-900">{roleLabel(req.requestedRole)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Requested</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateFull(req.createdAt)} · {formatTime(req.createdAt)}</p>
                </div>
              </div>

              {req.reason && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-0.5">Reason</p>
                  <p className="text-sm text-gray-600">{req.reason}</p>
                </div>
              )}

              {req.status === 'REJECTED' && req.rejectionReason && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-400 mb-0.5">Rejection reason</p>
                  <p className="text-sm text-red-700">{req.rejectionReason}</p>
                </div>
              )}

              {req.status === 'APPROVED' && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-green-700">
                    ✓ Approved by {req.reviewerName} · {req.reviewedAt ? formatDateFull(req.reviewedAt) : ''}
                  </p>
                </div>
              )}

              {req.status === 'PENDING' && (
                <div className="mt-5 flex items-center gap-3 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setRejectModal(req)}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => setApproveModal(req)}>
                    Approve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Approve Modal */}
      <Modal
        open={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Approve role change?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setApproveModal(null)}>Cancel</Button>
            <Button onClick={handleApprove} loading={loading}>Approve Request</Button>
          </>
        }
      >
        {approveModal && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-900">{approveModal.userName}</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{roleLabel(approveModal.currentRole)}</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">{roleLabel(approveModal.requestedRole)}</span>
            </div>
            <p className="text-sm text-gray-500">
              After approval, the user will receive {roleLabel(approveModal.requestedRole)} access.
            </p>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectionReason(''); }}
        title="Reject role request?"
        subtitle={rejectModal?.userName}
        actions={
          <>
            <Button variant="secondary" onClick={() => { setRejectModal(null); setRejectionReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} loading={loading}>Reject Request</Button>
          </>
        }
      >
        {rejectModal && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Requested: <span className="font-medium text-gray-700">{roleLabel(rejectModal.requestedRole)}</span>
            </p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Optional rejection reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter a reason..."
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
