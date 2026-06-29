'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, useHydrated } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const accessToken = useAppStore((s) => s.accessToken);
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated) {
      router.replace(accessToken ? '/dashboard' : '/login');
    }
  }, [hydrated, accessToken, router]);

  return null;
}
