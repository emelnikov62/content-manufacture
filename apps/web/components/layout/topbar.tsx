'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/lib/store';

export function Topbar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const toggleMobileMenu = useAppStore((s) => s.toggleMobileMenu);
  const notifications = useAppStore((s) => s.notifications);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const clearNotifications = useAppStore((s) => s.clearNotifications);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) markAllRead();
  };

  return (
    <header className="flex items-center gap-2 md:gap-3">
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden flex h-[42px] w-[42px] items-center justify-center rounded-[13px] bg-card shadow-card text-foreground shrink-0"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-[480px]">
        <div className="flex items-center gap-2.5 bg-card rounded-[13px] shadow-card px-3.5 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Найти пост, медиа, аккаунт…"
            className="flex-1 bg-transparent outline-none text-[13.5px] text-foreground placeholder:text-muted-foreground min-w-0"
          />
          <span className="text-[11px] bg-secondary border border-border rounded-[7px] px-1.5 py-0.5 text-muted-foreground hidden sm:block">
            ⌘K
          </span>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="ml-auto inline-flex bg-card border border-border rounded-full p-[3px] shadow-card shrink-0">
        <button
          className={`border-0 px-3 py-[7px] rounded-full text-[12px] font-bold transition-colors ${
            theme === 'light'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground'
          }`}
          onClick={() => setTheme('light')}
        >
          ☀︎
        </button>
        <button
          className={`border-0 px-3 py-[7px] rounded-full text-[12px] font-bold transition-colors ${
            theme === 'dark'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground'
          }`}
          onClick={() => setTheme('dark')}
        >
          ☾
        </button>
      </div>

      {/* Notifications */}
      <div className="relative" ref={ref}>
        <button
          onClick={handleOpen}
          className="relative w-[42px] h-[42px] rounded-[13px] bg-card shadow-card border-0 grid place-items-center text-foreground shrink-0"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-[3px] -right-[3px] bg-primary text-primary-foreground text-[10px] font-extrabold rounded-full min-w-[17px] h-[17px] grid place-items-center border-2 border-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-[50px] w-[340px] bg-card border border-border rounded-[16px] shadow-lg z-50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <span className="font-bold text-[14px]">Уведомления</span>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="ml-auto text-[11.5px] font-semibold text-muted-foreground hover:text-destructive transition-colors"
                >
                  Очистить
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-8">
                  Нет уведомлений
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-border last:border-b-0 ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[16px] ${n.type === 'success' ? '' : 'text-destructive'}`}>
                        {n.type === 'success' ? '✓' : '✕'}
                      </span>
                      <span className="text-[13px] font-semibold flex-1">{n.title}</span>
                      <span className="text-[10.5px] text-muted-foreground shrink-0">
                        {new Date(n.createdAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground ml-6 line-clamp-2">
                      {n.message}
                    </p>
                    {n.generationId && (
                      <button
                        onClick={() => {
                          setOpen(false);
                          router.push(`/media?preview=${n.generationId}`);
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline ml-6 mt-1"
                      >
                        Открыть в медиа →
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
