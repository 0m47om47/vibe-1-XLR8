'use client';

import { Location } from '@/lib/types';
import { getLocationLabel } from '@/lib/utils';
import { MapPin, Car } from 'lucide-react';

interface RouteVisualizationProps {
  from: Location;
  to: Location;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  horizontal?: boolean;
}

export default function RouteVisualization({
  from,
  to,
  size = 'md',
  showIcon = true,
  horizontal = false,
}: RouteVisualizationProps) {
  if (horizontal) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 max-w-full">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <span className={`font-medium ${size === 'sm' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} text-gray-900 whitespace-nowrap`}>
            {getLocationLabel(from)}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 text-gray-300 min-w-0 flex-1 justify-center">
          <div className="w-4 sm:w-8 h-px bg-gray-300 flex-shrink" />
          {showIcon && <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />}
          <div className="w-4 sm:w-8 h-px bg-gray-300 flex-shrink" />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className={`font-medium ${size === 'sm' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} text-gray-900 whitespace-nowrap`}>
            {getLocationLabel(to)}
          </span>
        </div>
      </div>
    );
  }

  const textSize = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base';
  const dotSize = size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  const lineH = size === 'lg' ? 'h-10' : size === 'sm' ? 'h-5' : 'h-8';

  return (
    <div className="flex flex-col items-center">
      {/* From */}
      <div className="flex items-center gap-2">
        <div className={`${dotSize} rounded-full bg-blue-500 ring-4 ring-blue-100`} />
        <span className={`font-semibold ${textSize} text-gray-900 uppercase tracking-wide`}>
          {getLocationLabel(from)}
        </span>
      </div>

      {/* Line */}
      <div className={`w-px ${lineH} bg-gray-200 relative my-1`}>
        {showIcon && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full shadow-sm border border-gray-100">
            <Car className="w-4 h-4 text-amber-500" />
          </div>
        )}
      </div>

      {/* To */}
      <div className="flex items-center gap-2">
        <div className={`${dotSize} rounded-full bg-green-500 ring-4 ring-green-100`} />
        <span className={`font-semibold ${textSize} text-gray-900 uppercase tracking-wide`}>
          {getLocationLabel(to)}
        </span>
      </div>
    </div>
  );
}
