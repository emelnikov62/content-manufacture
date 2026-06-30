'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  locale: string;
  theme: string;
}

interface AppNotification {
  id: string;
  type: 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  generationId?: string;
}

interface AppState {
  currentBrandId: string | null;
  setCurrentBrandId: (id: string | null) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  setTokens: (access: string, refresh: string) => void;
  setAuth: (access: string, refresh: string, user: UserProfile) => void;
  setUser: (user: UserProfile) => void;
  clearTokens: () => void;
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentBrandId: null,
      setCurrentBrandId: (id) => set({ currentBrandId: id }),
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      mobileMenuOpen: false,
      toggleMobileMenu: () =>
        set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),
      setAuth: (access, refresh, user) =>
        set({ accessToken: access, refreshToken: refresh, user }),
      setUser: (user) => set({ user }),
      clearTokens: () =>
        set({ accessToken: null, refreshToken: null, user: null, currentBrandId: null }),
      notifications: [],
      addNotification: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString() },
            ...s.notifications,
          ].slice(0, 50),
        })),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    { name: 'content-manufacture-store' },
  ),
);

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
