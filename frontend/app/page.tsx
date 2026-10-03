'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { homeFor, useApp } from '@/lib/app-state';
import { PageLoader } from '@/components/ui/PageState';

export default function Home() {
  const router = useRouter();
  const { user } = useApp();

  useEffect(() => {
    if (user === undefined) return;
    router.replace(user ? homeFor(user.role) : '/login');
  }, [user, router]);

  return <PageLoader />;
}
