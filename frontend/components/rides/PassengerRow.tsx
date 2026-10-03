'use client';

import { useState } from 'react';
import type { BoardingStatus } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { Loader2, UserCheck, UserX } from 'lucide-react';

interface PassengerRowProps {
  passenger: { id: string; name: string; boardingStatus: BoardingStatus };
  index: number;
  showControls?: boolean;
  onBoard?: (id: string) => void;
  onMiss?: (id: string) => void;
  disabled?: boolean;
  /** This row's update is in flight. */
  busy?: boolean;
  /** Highlight the row (e.g. "you" in a passenger list). */
  highlight?: boolean;
  /** Small line under the name (e.g. who booked this passenger on a shared run). */
  subtitle?: string;
}

export default function PassengerRow({
  passenger,
  index,
  showControls = false,
  onBoard,
  onMiss,
  disabled = false,
  busy = false,
  highlight = false,
  subtitle,
}: PassengerRowProps) {
  const status = passenger.boardingStatus;
  const isHandled = status !== 'PENDING';
  // The rider can correct a mark until the trip is completed.
  const [editing, setEditing] = useState(false);
  const showButtons = showControls && (!isHandled || editing);

  const mark = (fn?: (id: string) => void) => {
    setEditing(false);
    fn?.(passenger.id);
  };

  return (
    <div className={`py-3 px-3 sm:px-4 rounded-xl hover:bg-gray-50 transition-colors group ${highlight ? 'bg-blue-50/40' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="text-xs text-gray-400 font-medium w-5 text-right tabular-nums flex-shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 ${
              status === 'BOARDED'
                ? 'bg-green-100 text-green-700'
                : status === 'MISSED'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {getInitials(passenger.name)}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate block">{passenger.name}</span>
            {subtitle && <span className="text-xs text-gray-400 truncate block">{subtitle}</span>}
          </div>
          {highlight && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex-shrink-0">
              You
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          {(!showControls || isHandled) && <StatusBadge status={status} kind="boarding" />}
          {showControls && isHandled && !editing && (
            <button
              onClick={() => setEditing(true)}
              disabled={disabled || busy}
              className="text-xs text-gray-400 hover:text-gray-700 font-medium px-2 py-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Change
            </button>
          )}
        </div>
      </div>

      {/* Boarding controls — inline on desktop, full-width on mobile */}
      {showButtons && (
        <div className="flex items-center gap-2 mt-2.5 ml-[52px] sm:ml-[60px]">
          <button
            onClick={() => mark(onBoard)}
            disabled={disabled || busy}
            aria-pressed={status === 'BOARDED'}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
          >
            <UserCheck className="w-4 h-4" />
            Boarded
          </button>
          <button
            onClick={() => mark(onMiss)}
            disabled={disabled || busy}
            aria-pressed={status === 'MISSED'}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
          >
            <UserX className="w-4 h-4" />
            Missed
          </button>
          {editing && (
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-400 hover:text-gray-700 font-medium px-2 py-1 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
