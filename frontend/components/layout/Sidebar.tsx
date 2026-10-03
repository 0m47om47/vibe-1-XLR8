'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useDemo, useCurrentUser } from '@/lib/demo-state';
import {
  LayoutDashboard,
  PlusCircle,
  MapPin,
  Gauge,
  History,
  Settings,
  LogOut,
  Car,
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const PASSENGER_ITEMS: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Request Ride', icon: PlusCircle, href: '/request' },
  { label: 'My Trips', icon: MapPin, href: '/my-trips' },
];

const RIDER_ITEMS: NavItem[] = [
  { label: 'Rider Desk', icon: Gauge, href: '/rider' },
  { label: 'Rider History', icon: History, href: '/rider/history' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, logout } = useDemo();
  const user = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/rider') return pathname === '/rider' && !pathname.startsWith('/rider/history');
    return pathname.startsWith(href);
  };

  const navigate = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  const primaryItems = currentRole === 'rider' ? RIDER_ITEMS : PASSENGER_ITEMS;
  const secondaryItems = currentRole === 'rider' ? PASSENGER_ITEMS : RIDER_ITEMS;

  // Mobile bottom nav items (max 4 + more)
  const mobileBottomItems = currentRole === 'rider'
    ? [
        { label: 'Desk', icon: Gauge, href: '/rider' },
        { label: 'History', icon: History, href: '/rider/history' },
        { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
      ]
    : [
        { label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
        { label: 'Request', icon: PlusCircle, href: '/request' },
        { label: 'Trips', icon: MapPin, href: '/my-trips' },
      ];

  return (
    <>
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-[260px] bg-white border-r border-gray-200 flex-col z-40">
        {/* Logo */}
        <div className="px-5 pt-6 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-[15px] font-bold text-gray-900 tracking-tight">LAWAZIA</div>
              <div className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">
                TOTO DESK
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {primaryItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <item.icon className={cn('w-[18px] h-[18px]', active ? 'text-blue-600' : 'text-gray-400')} />
                {item.label}
              </button>
            );
          })}

          <div className="!my-4 h-px bg-gray-100 mx-1" />

          {secondaryItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <item.icon className={cn('w-[18px] h-[18px]', active ? 'text-blue-600' : 'text-gray-400')} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom user section */}
        <div className="px-3 pb-4 mt-auto">
          <div className="h-px bg-gray-100 mb-4" />
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                {getInitials(user.name)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white pulse-online" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MOBILE TOP HEADER ==================== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">LAWAZIA</span>
            <span className="text-[9px] font-semibold text-gray-400 tracking-widest ml-1.5 uppercase">
              TOTO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* More menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
            {getInitials(user.name)}
          </div>
        </div>
      </header>

      {/* ==================== MOBILE MORE MENU DROPDOWN ==================== */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/20 z-40 mt-14"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-14 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 modal-enter">
            <nav className="p-3 space-y-1">
              {[...primaryItems, ...secondaryItems].map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer',
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className={cn('w-5 h-5', active ? 'text-blue-600' : 'text-gray-400')} />
                    {item.label}
                  </button>
                );
              })}

              <div className="h-px bg-gray-100 !my-2" />

              {/* User info */}
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                    {getInitials(user.name)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
              </div>

              <button
                onClick={() => { logout(); router.push('/login'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        </>
      )}

      {/* ==================== MOBILE BOTTOM NAV ==================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {mobileBottomItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[64px] cursor-pointer',
                  active ? 'text-blue-600' : 'text-gray-400'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className={cn('text-[10px] font-medium', active ? 'text-blue-600' : 'text-gray-500')}>
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[64px] cursor-pointer',
              mobileMenuOpen ? 'text-blue-600' : 'text-gray-400'
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className={cn('text-[10px] font-medium', mobileMenuOpen ? 'text-blue-600' : 'text-gray-500')}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
