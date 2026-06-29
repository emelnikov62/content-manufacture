'use client';

import { Bell, Search } from 'lucide-react';
import { useTheme } from 'next-themes';

export function Topbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex items-center gap-3">
      {/* Search */}
      <div className="flex-1 max-w-[480px]">
        <div className="flex items-center gap-2.5 bg-card rounded-[13px] shadow-card px-3.5 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Найти пост, медиа, аккаунт…"
            className="flex-1 bg-transparent outline-none text-[13.5px] text-foreground placeholder:text-muted-foreground"
          />
          <span className="text-[11px] bg-secondary border border-border rounded-[7px] px-1.5 py-0.5 text-muted-foreground">
            ⌘K
          </span>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="ml-auto inline-flex bg-card border border-border rounded-full p-[3px] shadow-card">
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
      <button className="relative w-[42px] h-[42px] rounded-[13px] bg-card shadow-card border-0 grid place-items-center text-foreground">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute -top-[3px] -right-[3px] bg-primary text-primary-foreground text-[10px] font-extrabold rounded-full min-w-[17px] h-[17px] grid place-items-center border-2 border-background">
          0
        </span>
      </button>
    </header>
  );
}
