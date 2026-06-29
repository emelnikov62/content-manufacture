'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';
import { useAppStore } from './store';
import { api } from './api';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  const accessToken = useAppStore((s) => s.accessToken);

  useEffect(() => {
    // Clean up stale _hydrated field from old store version
    try {
      const raw = localStorage.getItem('content-manufacture-store');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?._hydrated !== undefined) {
          delete parsed.state._hydrated;
          localStorage.setItem('content-manufacture-store', JSON.stringify(parsed));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    api.setToken(accessToken);
  }, [accessToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
