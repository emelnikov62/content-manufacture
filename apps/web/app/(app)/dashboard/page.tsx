'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  TrendingUp,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  PenSquare,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { NetworkIcon } from '@/components/icons/network-icon';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SCHEDULED: 'bg-primary/20 text-foreground',
  PUBLISHING: 'bg-warning/20 text-warning',
  PUBLISHED: 'bg-success/20 text-success',
  ERROR: 'bg-destructive/15 text-destructive',
};

interface DashboardData {
  totalPosts: number;
  scheduledPosts: number;
  publishedPosts: number;
  errorPosts: number;
  upcomingPosts: any[];
  errorPublications: any[];
}

export default function DashboardPage() {
  const currentBrandId = useAppStore((s) => s.currentBrandId);

  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard', currentBrandId],
    queryFn: () => {
      const params = currentBrandId ? `?brandId=${currentBrandId}` : '';
      return api.get(`/analytics/dashboard${params}`);
    },
  });

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Page header */}
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Добро пожаловать! 👋
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Вот что происходит с вашим контентом
            {currentBrandId ? ' в этом направлении' : ' сегодня'}.
          </p>
        </div>
        <div className="ml-auto">
          <Link
            href="/composer"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
          >
            <PenSquare className="h-4 w-4" />
            Создать пост
          </Link>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-feature text-feature-foreground rounded-[22px] p-4 min-h-[140px] flex flex-col">
          <span className="text-[12px] text-[#A8ADB4]">Всего постов</span>
          <span className="text-[28px] font-extrabold tracking-tight mt-1 leading-none">
            {data?.totalPosts ?? '—'}
          </span>
          <div className="mt-auto flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11.5px] font-bold text-primary">активно</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[22px] p-4 min-h-[140px] flex flex-col shadow-card">
          <span className="text-[12px] text-muted-foreground">Запланировано</span>
          <span className="text-[28px] font-extrabold tracking-tight mt-1 leading-none">
            {data?.scheduledPosts ?? '—'}
          </span>
          <div className="mt-auto">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-[22px] p-4 min-h-[140px] flex flex-col shadow-card">
          <span className="text-[12px] text-muted-foreground">Опубликовано</span>
          <span className="text-[28px] font-extrabold tracking-tight mt-1 leading-none">
            {data?.publishedPosts ?? '—'}
          </span>
          <div className="mt-auto">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-[22px] p-4 min-h-[140px] flex flex-col shadow-card">
          <span className="text-[12px] text-muted-foreground">Ошибки</span>
          <span className={`text-[28px] font-extrabold tracking-tight mt-1 leading-none ${(data?.errorPosts ?? 0) > 0 ? 'text-destructive' : ''}`}>
            {data?.errorPosts ?? '—'}
          </span>
          <div className="mt-auto">
            <XCircle className="h-4 w-4 text-destructive" />
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[18px] items-start">
        {/* Left column */}
        <div className="flex flex-col gap-[18px]">
          {/* Schedule */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-[26px] h-[26px] rounded-[9px] bg-secondary grid place-items-center">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="font-bold text-[15px]">Ближайшие публикации</span>
              <Link href="/calendar" className="ml-auto text-[12.5px] font-semibold text-muted-foreground hover:text-foreground">
                Календарь
              </Link>
            </div>
            {!data?.upcomingPosts?.length ? (
              <p className="text-[13.5px] text-muted-foreground py-4">
                Нет запланированных постов.{' '}
                <Link href="/composer" className="text-primary font-semibold hover:underline">
                  Создать пост
                </Link>
              </p>
            ) : (
              <div className="flex flex-col">
                {data.upcomingPosts.map((post: any) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 py-[9px] border-t border-border first:border-t-0"
                  >
                    <span className="text-[12px] font-bold text-muted-foreground w-[42px] shrink-0">
                      {post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </span>
                    <div className="flex gap-1.5">
                      {post.targets?.map((t: any, i: number) => (
                        <NetworkIcon key={i} network={t.account?.network} className="w-[14px] h-[14px]" />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">
                        {post.body?.slice(0, 50) || 'Без текста'}
                      </p>
                    </div>
                    <span className={`text-[11.5px] font-bold px-[11px] py-1 rounded-full inline-flex items-center gap-1.5 ${STATUS_STYLES[post.status] || ''}`}>
                      <span className="w-[7px] h-[7px] rounded-full bg-current" />
                      {post.status === 'SCHEDULED' ? 'План' : post.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-[18px]">
          {/* Alerts */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-[26px] h-[26px] rounded-[9px] bg-secondary grid place-items-center">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <span className="font-bold text-[15px]">Алерты</span>
            </div>
            {!data?.errorPublications?.length ? (
              <p className="text-[13.5px] text-muted-foreground">
                Нет активных проблем
              </p>
            ) : (
              <div className="flex flex-col">
                {data.errorPublications.map((pub: any) => (
                  <div
                    key={pub.id}
                    className="flex items-start gap-2 py-[9px] border-t border-border first:border-t-0"
                  >
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">
                        <NetworkIcon network={pub.postTarget?.account?.network} className="w-[14px] h-[14px] inline" />{' '}
                        @{pub.postTarget?.account?.handle}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground truncate">
                        {pub.error || 'Ошибка публикации'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <span className="font-bold text-[15px] block mb-3.5">Быстрые действия</span>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/composer"
                className="flex items-center justify-center gap-2 py-3 px-2 rounded-[13px] bg-primary text-primary-foreground font-bold text-[12.5px]"
              >
                ✎ Создать пост
              </Link>
              <Link
                href="/media"
                className="flex items-center justify-center gap-2 py-3 px-2 rounded-[13px] border border-border bg-card font-bold text-[12.5px] hover:shadow-card"
              >
                ⤴ Медиа
              </Link>
              <Link
                href="/calendar"
                className="flex items-center justify-center gap-2 py-3 px-2 rounded-[13px] border border-border bg-card font-bold text-[12.5px] hover:shadow-card"
              >
                ▤ Календарь
              </Link>
              <Link
                href="/analytics"
                className="flex items-center justify-center gap-2 py-3 px-2 rounded-[13px] border border-border bg-card font-bold text-[12.5px] hover:shadow-card"
              >
                ▮ Аналитика
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
