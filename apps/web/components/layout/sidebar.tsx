'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  PenSquare,
  Image,
  BarChart3,
  Users,
  Settings,
  ClipboardList,
  ChevronLeft,
  LogOut,
  Link2,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
  GitFork,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { BrandSwitcher } from './brand-switcher';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; badge?: string }[] = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/studio', label: 'AI‑Студия', icon: Sparkles },
  { href: '/calendar', label: 'Календарь', icon: CalendarDays },
  { href: '/media', label: 'Медиа', icon: Image },
  { href: '/posts', label: 'Посты', icon: PenSquare },
  { href: '/funnels', label: 'Воронки', icon: GitFork },
  { href: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/messages', label: 'Сообщения', icon: MessageSquare, badge: '12' },
  { href: '/team', label: 'Команда', icon: Users },
  { href: '/settings', label: 'Настройки', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const clearTokens = useAppStore((s) => s.clearTokens);

  return (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          'flex flex-col bg-card rounded-[22px] shadow-card transition-all duration-200 sticky top-4 h-[calc(100vh-32px)]',
          collapsed ? 'w-[68px] p-3' : 'w-[248px] p-4',
        )}
      >
        {/* Brand logo */}
        <div className="flex items-center gap-2.5 px-1.5 pb-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-feature text-primary font-extrabold text-lg">
            К
          </div>
          {!collapsed && (
            <>
              <span className="font-extrabold text-[16px]">Контент‑Завод</span>
              <span className="ml-auto text-[10px] font-extrabold bg-primary text-primary-foreground px-[7px] py-[2px] rounded-full">
                PRO
              </span>
            </>
          )}
          {collapsed && (
            <button
              onClick={toggleSidebar}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          )}
        </div>

        {/* Workspace switcher */}
        {!collapsed && (
          <div className="mt-3 mb-1">
            <BrandSwitcher />
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 mt-2">
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger
                      className={cn(
                        'flex items-center justify-center rounded-xl p-2.5 transition-colors cursor-pointer',
                        isActive
                          ? 'bg-feature text-feature-foreground'
                          : 'text-muted-foreground hover:bg-secondary',
                      )}
                      onClick={() => (window.location.href = item.href)}
                    >
                      <item.icon
                        className={cn(
                          'h-[18px] w-[18px]',
                          isActive && 'text-primary',
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                    isActive
                      ? 'bg-feature text-feature-foreground'
                      : 'text-foreground hover:bg-secondary',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-primary text-primary-foreground text-[11px] font-extrabold rounded-full px-2 py-[1px]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Budget widget */}
        {!collapsed && (
          <div className="bg-secondary rounded-[14px] p-3 mt-2">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] font-bold">Бюджет</span>
              <span className="text-[11px] text-muted-foreground">за месяц</span>
            </div>
            <div className="text-[19px] font-extrabold mt-0.5">
              $0 <span className="text-[12px] text-muted-foreground font-semibold">/ $300</span>
            </div>
            <div className="h-[7px] rounded-full bg-background mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '0%' }} />
            </div>
          </div>
        )}

        {/* User profile */}
        <div className={cn('flex items-center gap-2.5 border-t border-border pt-3 mt-3', collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-800 text-white text-xs font-bold">
            U
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold leading-tight truncate">Пользователь</p>
                <p className="text-[11px] text-muted-foreground">Владелец</p>
              </div>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  clearTokens();
                  window.location.href = '/login';
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle for expanded state */}
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </aside>
    </TooltipProvider>
  );
}
