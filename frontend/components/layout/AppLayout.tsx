'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { homeFor, useApp } from '@/lib/app-state';
import Sidebar from '@/components/layout/Sidebar';
import ToastContainer from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/PageState';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Restrict the page to riders or to passengers (students/employees). */
  allow?: 'RIDER' | 'PASSENGER';
}

/**
 * Authenticated page shell. Waits for the session check, sends logged-out users
 * to /login and wrong-role users to their own home. The backend enforces the
 * same rules on every API call — this only keeps the UI coherent.
 */
export default function AppLayout({ children, allow }: AppLayoutProps) {
  const { user } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const wrongRole =
    !!user &&
    ((allow === 'RIDER' && user.role !== 'RIDER') || (allow === 'PASSENGER' && user.role === 'RIDER'));

  useEffect(() => {
    if (user === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (user && wrongRole) router.replace(homeFor(user.role));
  }, [user, wrongRole, router, pathname]);

  if (!user || wrongRole) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      {/* Main content: mobile has top header (56px) + bottom nav (~60px), desktop has sidebar (260px) */}
      <main className="pt-14 pb-16 lg:pt-0 lg:pb-0 lg:ml-[260px]">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
          {children}
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
