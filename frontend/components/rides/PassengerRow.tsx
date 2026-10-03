'use client';

import { Passenger } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { UserCheck, UserX } from 'lucide-react';

interface PassengerRowProps {
  passenger: Passenger;
  index: number;
  showControls?: boolean;
  onBoard?: (id: string) => void;
  onMiss?: (id: string) => void;
  disabled?: boolean;
}

export default function PassengerRow({
  passenger,
  index,
  showControls = false,
  onBoard,
  onMiss,
  disabled = false,
}: PassengerRowProps) {
  const isHandled = passenger.status !== 'PENDING';

  return (
    <div className="py-3 px-3 sm:px-4 rounded-xl hover:bg-gray-50 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="text-xs text-gray-400 font-medium w-5 text-right tabular-nums flex-shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 ${
              passenger.status === 'BOARDED'
                ? 'bg-green-100 text-green-700'
                : passenger.status === 'MISSED'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {getInitials(passenger.name)}
          </div>
          <span className="text-sm font-medium text-gray-900 truncate">{passenger.name}</span>
        </div>

        {/* Desktop inline status / controls */}
        {!showControls && (
          <div className="flex-shrink-0 ml-2">
            <StatusBadge status={passenger.status} />
          </div>
        )}
        {showControls && isHandled && (
          <div className="flex-shrink-0 ml-2">
            <StatusBadge status={passenger.status} />
          </div>
        )}
      </div>

      {/* Boarding controls — inline on desktop, full-width on mobile */}
      {showControls && !isHandled && (
        <div className="flex items-center gap-2 mt-2.5 ml-[52px] sm:ml-[60px]">
          <button
            onClick={() => onBoard?.(passenger.id)}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
          >
            <UserCheck className="w-4 h-4" />
            Boarded
          </button>
          <button
            onClick={() => onMiss?.(passenger.id)}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
          >
            <UserX className="w-4 h-4" />
            Missed
          </button>
        </div>
      )}
    </div>
  );
}
