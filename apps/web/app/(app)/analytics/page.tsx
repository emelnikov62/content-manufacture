'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Eye,
  BarChart3,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';

interface OverviewData {
  accounts: number;
  posts: number;
  publications: number;
  totalFollowers: number;
  totalReach: number;
}

export default function AnalyticsPage() {
  const currentBrandId = useAppStore((s) => s.currentBrandId);

  const { data } = useQuery<OverviewData>({
    queryKey: ['analytics-overview', currentBrandId],
    queryFn: () => api.get(`/analytics/overview?brandId=${currentBrandId}`),
    enabled: !!currentBrandId,
  });

  if (!currentBrandId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Выберите направление для просмотра аналитики
      </div>
    );
  }

  const metrics = [
    {
      label: 'Подписчики',
      value: data?.totalFollowers?.toLocaleString() ?? '—',
      icon: TrendingUp,
      dark: true,
    },
    {
      label: 'Охват',
      value: data?.totalReach?.toLocaleString() ?? '—',
      icon: Eye,
    },
    {
      label: 'Аккаунты',
      value: data?.accounts ?? '—',
      icon: BarChart3,
    },
    {
      label: 'Постов',
      value: data?.posts ?? '—',
      icon: FileText,
    },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Аналитика
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Аудитория, охваты, вовлечённость
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div
            key={i}
            className={`rounded-[22px] p-4 min-h-[140px] flex flex-col ${
              m.dark
                ? 'bg-feature text-feature-foreground'
                : 'bg-card border border-border shadow-card'
            }`}
          >
            <span className={`text-[12px] ${m.dark ? 'text-[#A8ADB4]' : 'text-muted-foreground'}`}>
              {m.label}
            </span>
            <span className="text-[28px] font-extrabold tracking-tight mt-1 leading-none">
              {m.value}
            </span>
            <div className="mt-auto">
              <m.icon className={`h-4 w-4 ${m.dark ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[18px] items-start">
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-[26px] h-[26px] rounded-[9px] bg-secondary grid place-items-center">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="font-bold text-[15px]">Динамика</span>
          </div>
          <div className="flex items-center justify-center py-16">
            <p className="text-[13.5px] text-muted-foreground">
              Графики появятся после накопления данных аналитики
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-[18px]">
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-[26px] h-[26px] rounded-[9px] bg-secondary grid place-items-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              </div>
              <span className="font-bold text-[15px]">Публикации</span>
            </div>
            <div className="text-[28px] font-extrabold tracking-tight leading-none">
              {data?.publications ?? '—'}
            </div>
            <p className="text-[12px] text-muted-foreground mt-2">
              Всего опубликовано
            </p>
          </div>

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
                href="/calendar"
                className="flex items-center justify-center gap-2 py-3 px-2 rounded-[13px] border border-border bg-card font-bold text-[12.5px] hover:shadow-card"
              >
                ▤ Календарь
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
