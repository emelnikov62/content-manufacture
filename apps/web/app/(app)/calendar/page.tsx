'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { NetworkIcon } from '@/components/icons/network-icon';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

type View = 'Месяц' | 'Неделя' | 'День';

function getPostDate(post: any): Date | null {
  if (post.scheduledAt) return new Date(post.scheduledAt);
  if (post.status === 'PUBLISHED' || post.status === 'PUBLISHING') {
    const pubAt = post.targets?.[0]?.publication?.publishedAt;
    return pubAt ? new Date(pubAt) : new Date(post.createdAt);
  }
  return null;
}

function borderColorForStatus(status: string) {
  if (status === 'PUBLISHED') return 'border-l-green-500';
  if (status === 'PUBLISHING') return 'border-l-yellow-500';
  if (status === 'SCHEDULED') return 'border-l-blue-500';
  if (status === 'ERROR') return 'border-l-red-500';
  return 'border-l-primary';
}

function PostEvent({ post }: { post: any }) {
  return (
    <Link
      href={`/composer?edit=${post.id}`}
      className={`text-[11px] font-semibold py-1 px-[7px] rounded-lg flex items-center gap-[5px] bg-card border-l-[3px] ${borderColorForStatus(post.status)} overflow-hidden whitespace-nowrap text-ellipsis hover:brightness-95 transition-all cursor-pointer no-underline text-foreground`}
    >
      {post.targets?.[0]?.account?.network && (
        <NetworkIcon network={post.targets[0].account.network} className="w-[10px] h-[10px] shrink-0" />
      )}
      <span className="truncate">
        {post.title || post.body?.slice(0, 20) || 'Без текста'}
      </span>
    </Link>
  );
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('Месяц');
  const currentBrandId = useAppStore((s) => s.currentBrandId);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const rangeFrom = useMemo(() => {
    if (view === 'День') {
      const d = new Date(currentDate);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (view === 'Неделя') return getMonday(currentDate);
    return new Date(year, month, 1);
  }, [view, currentDate, year, month]);

  const rangeTo = useMemo(() => {
    if (view === 'День') {
      const d = new Date(currentDate);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    if (view === 'Неделя') {
      const d = new Date(rangeFrom);
      d.setDate(d.getDate() + 6);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    return new Date(year, month + 1, 0, 23, 59, 59, 999);
  }, [view, currentDate, rangeFrom, year, month]);

  const { data: posts = [] } = useQuery({
    queryKey: ['calendar-posts', currentBrandId, rangeFrom.toISOString(), rangeTo.toISOString()],
    queryFn: () =>
      currentBrandId
        ? api.get<any[]>(
            `/posts/calendar?brandId=${currentBrandId}&from=${rangeFrom.toISOString()}&to=${rangeTo.toISOString()}`,
          )
        : Promise.resolve([]),
    enabled: !!currentBrandId,
  });

  const postsByDayKey: Record<string, any[]> = {};
  posts.forEach((post: any) => {
    const date = getPostDate(post);
    if (!date) return;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!postsByDayKey[key]) postsByDayKey[key] = [];
    postsByDayKey[key].push(post);
  });

  function getPostsForDate(d: Date) {
    return postsByDayKey[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] || [];
  }

  const today = new Date();
  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate);
    if (view === 'Месяц') d.setMonth(d.getMonth() + dir);
    else if (view === 'Неделя') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function headerLabel() {
    if (view === 'Месяц') return `${MONTHS[month]} ${year}`;
    if (view === 'Неделя') {
      const end = new Date(rangeFrom);
      end.setDate(end.getDate() + 6);
      if (rangeFrom.getMonth() === end.getMonth()) {
        return `${rangeFrom.getDate()} – ${end.getDate()} ${MONTHS_SHORT[rangeFrom.getMonth()]} ${rangeFrom.getFullYear()}`;
      }
      return `${rangeFrom.getDate()} ${MONTHS_SHORT[rangeFrom.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${currentDate.getDate()} ${MONTHS_SHORT[currentDate.getMonth()]} ${currentDate.getFullYear()}, ${DAYS[(currentDate.getDay() + 6) % 7]}`;
  }

  // Month view cells
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const monthCells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) monthCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) monthCells.push(d);

  // Week view days
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(rangeFrom);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  const views: View[] = ['День', 'Неделя', 'Месяц'];

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
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-[15px] min-w-[200px] text-center">
              {headerLabel()}
            </span>
            <button
              className="w-[36px] h-[36px] rounded-xl bg-card border border-border shadow-card grid place-items-center text-foreground hover:bg-secondary transition-colors"
              onClick={() => navigate(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            className="font-bold text-[12.5px] px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary transition-colors"
            onClick={() => setCurrentDate(new Date())}
          >
            Сегодня
          </button>
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
      ) : view === 'Месяц' ? (
        <div className="grid grid-cols-7 gap-1 md:gap-2 overflow-x-auto min-w-0">
          {DAYS.map((day) => (
            <div key={day} className="text-[11px] font-bold text-muted-foreground uppercase text-center pb-1">
              {day}
            </div>
          ))}
          {monthCells.map((day, i) => {
            const cellDate = day ? new Date(year, month, day) : null;
            const isToday = cellDate ? isSameDay(cellDate, today) : false;
            return (
              <div
                key={i}
                className={`bg-secondary border border-border rounded-xl min-h-[96px] p-2 flex flex-col gap-1 ${
                  day === null ? 'opacity-45' : ''
                }`}
              >
                {day && cellDate && (
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
                    {getPostsForDate(cellDate).map((post: any) => (
                      <PostEvent key={post.id} post={post} />
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : view === 'Неделя' ? (
        <div className="grid grid-cols-7 gap-1 md:gap-2 min-w-0">
          {weekDays.map((wd) => (
            <div key={wd.toISOString()} className="text-[11px] font-bold text-muted-foreground uppercase text-center pb-1">
              {DAYS[(wd.getDay() + 6) % 7]}, {wd.getDate()} {MONTHS_SHORT[wd.getMonth()]}
            </div>
          ))}
          {weekDays.map((wd) => {
            const isToday = isSameDay(wd, today);
            const dayPosts = getPostsForDate(wd);
            return (
              <div
                key={wd.toISOString()}
                className={`bg-secondary border rounded-xl min-h-[200px] p-2 flex flex-col gap-1 ${
                  isToday ? 'border-primary' : 'border-border'
                }`}
              >
                {dayPosts.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground mt-4 text-center">Нет постов</span>
                ) : (
                  dayPosts.map((post: any) => {
                    const d = getPostDate(post);
                    return (
                      <div key={post.id} className="flex flex-col gap-0.5">
                        {d && (
                          <span className="text-[10px] text-muted-foreground">
                            {d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <PostEvent post={post} />
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Day view */
        <div className="bg-card border border-border rounded-[22px] shadow-card overflow-hidden">
          {HOURS.map((hour, hi) => {
            const hourPosts = getPostsForDate(currentDate).filter((post: any) => {
              const d = getPostDate(post);
              return d && d.getHours() === hi;
            });
            return (
              <div
                key={hour}
                className={`flex border-b border-border last:border-b-0 min-h-[48px] ${
                  hi === today.getHours() && isSameDay(currentDate, today) ? 'bg-primary/5' : ''
                }`}
              >
                <div className="w-[60px] shrink-0 text-[11px] font-bold text-muted-foreground py-2 px-3 border-r border-border">
                  {hour}
                </div>
                <div className="flex-1 p-1.5 flex flex-col gap-1">
                  {hourPosts.map((post: any) => (
                    <PostEvent key={post.id} post={post} />
                  ))}
                </div>
              </div>
            );
          })}
          {getPostsForDate(currentDate).filter((post: any) => {
            const d = getPostDate(post);
            return !d || d.getHours() === undefined;
          }).length > 0 && null}
        </div>
      )}
    </div>
  );
}
