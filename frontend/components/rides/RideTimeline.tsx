'use client';

import { TimelineEvent } from '@/lib/types';
import { Check, Circle } from 'lucide-react';

interface RideTimelineProps {
  events: TimelineEvent[];
}

export default function RideTimeline({ events }: RideTimelineProps) {
  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <div key={i} className="flex gap-3">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              {event.completed ? (
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full border-2 border-gray-200 flex items-center justify-center flex-shrink-0 bg-white">
                  <Circle className="w-3 h-3 text-gray-300" />
                </div>
              )}
              {!isLast && (
                <div className={`w-px h-8 ${event.completed ? 'bg-green-200' : 'bg-gray-200'}`} />
              )}
            </div>

            {/* Content */}
            <div className="pb-6">
              <span className={`text-sm font-medium ${event.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                {event.label}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">{event.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
