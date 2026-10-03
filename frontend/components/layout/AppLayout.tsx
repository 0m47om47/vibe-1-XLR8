'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo-state';
import Sidebar from '@/components/layout/Sidebar';
import ToastContainer from '@/components/ui/Toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useDemo();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

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
