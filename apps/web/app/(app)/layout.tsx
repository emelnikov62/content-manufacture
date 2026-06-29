'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useAppStore, useHydrated } from '@/lib/store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAppStore((s) => s.accessToken);
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hydrated, accessToken, router]);

  if (!hydrated) return null;
  if (!accessToken) return null;

  return (
    <div className="flex min-h-screen md:p-4 md:gap-4">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col gap-[18px] p-4 md:p-0">
        <Topbar />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
