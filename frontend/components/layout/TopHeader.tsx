'use client';

import { useCurrentUser } from '@/lib/app-state';
import { getInitials, roleLabel } from '@/lib/utils';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
}

export default function TopHeader({ title, subtitle, breadcrumb, actions }: TopHeaderProps) {
  const user = useCurrentUser();

  return (
    <header className="mb-6 sm:mb-8">
      {/* Top row: title + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          {breadcrumb && (
            <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wide">
              {breadcrumb}
            </p>
          )}
          <h1 className="text-2xl sm:text-[28px] lg:text-[32px] font-bold text-gray-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm sm:text-[15px] text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Desktop controls */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          {actions}
          <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 rounded-lg">
            {roleLabel(user.role)}
          </span>
          <div
            className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold"
            title={user.name}
          >
            {getInitials(user.name)}
          </div>
        </div>

        {/* Mobile actions row */}
        {actions && <div className="sm:hidden flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
