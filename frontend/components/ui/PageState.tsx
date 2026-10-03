'use client';

import { Loader2, WifiOff } from 'lucide-react';
import Button from './Button';

/** Full-area spinner for initial page loads. */
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-gray-400 page-enter" role="status">
      <Loader2 className="w-6 h-6 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/** Pulsing placeholder blocks while a section loads. */
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4 sm:p-6" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  );
}

/** Error card with a retry button. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-white border border-red-100 rounded-2xl flex flex-col items-center text-center py-12 px-4 page-enter" role="alert">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4 text-red-400">
        <WifiOff className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">Couldn&apos;t load this</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-5">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
