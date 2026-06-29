'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const NETWORK_ICONS: Record<string, string> = {
  INSTAGRAM: '📷',
  TIKTOK: '🎵',
  TELEGRAM: '✈️',
  THREADS: '🧵',
  FACEBOOK: '📘',
  TWITTER: '𝕏',
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentBrandId = useAppStore((s) => s.currentBrandId);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const { data: posts = [] } = useQuery({
    queryKey: ['calendar-posts', currentBrandId, year, month],
    queryFn: () =>
      currentBrandId
        ? api.get<any[]>(
            `/posts/calendar?brandId=${currentBrandId}&from=${firstDay.toISOString()}&to=${lastDay.toISOString()}`,
          )
        : Promise.resolve([]),
    enabled: !!currentBrandId,
  });

  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const postsByDay: Record<number, any[]> = {};
  posts.forEach((post: any) => {
    if (post.scheduledAt) {
      const d = new Date(post.scheduledAt).getDate();
      if (!postsByDay[d]) postsByDay[d] = [];
      postsByDay[d].push(post);
    }
  });

  const views = ['Месяц', 'Неделя', 'День'];
  const [view, setView] = useState('Месяц');

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Календарь
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Планируйте и отслеживайте публикации
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="inline-flex bg-secondary rounded-xl p-[3px]">
            {views.map((v) => (
              <button
                key={v}
                className={`border-0 bg-transparent font-bold text-[12.5px] px-3.5 py-2 rounded-[9px] transition-colors ${
                  view === v
                    ? 'bg-card text-foreground shadow-card'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="w-[36px] h-[36px] rounded-xl bg-card border border-border shadow-card grid place-items-center text-foreground hover:bg-secondary transition-colors"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-[15px] min-w-[160px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button
              className="w-[36px] h-[36px] rounded-xl bg-card border border-border shadow-card grid place-items-center text-foreground hover:bg-secondary transition-colors"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Link
            href="/composer"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
          >
            ✎ Создать пост
          </Link>
        </div>
      </div>

      {!currentBrandId ? (
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px] text-center text-muted-foreground py-12">
          Выберите направление в боковом меню для просмотра календаря
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 md:gap-2 overflow-x-auto min-w-0">
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-[11px] font-bold text-muted-foreground uppercase text-center pb-1"
            >
              {day}
            </div>
          ))}
          {cells.map((day, i) => {
            const isToday = isThisMonth && day === today.getDate();
            const isOut = day === null;
            return (
              <div
                key={i}
                className={`bg-secondary border border-border rounded-xl min-h-[96px] p-2 flex flex-col gap-1 ${
                  isOut ? 'opacity-45' : ''
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`text-[12px] font-bold ${
                        isToday
                          ? 'text-primary-foreground bg-primary w-[22px] h-[22px] rounded-full grid place-items-center'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {day}
                    </span>
                    {postsByDay[day]?.map((post: any) => (
                      <div
                        key={post.id}
                        className="text-[11px] font-semibold py-1 px-[7px] rounded-lg flex items-center gap-[5px] bg-card border-l-[3px] border-l-primary overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {post.targets?.[0]?.account?.network && (
                          <span className="text-[9px]">
                            {NETWORK_ICONS[post.targets[0].account.network]}
                          </span>
                        )}
                        <span className="truncate">
                          {post.body?.slice(0, 20) || 'Без текста'}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
