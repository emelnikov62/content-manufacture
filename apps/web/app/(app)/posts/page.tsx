'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';

const NETWORK_ICONS: Record<string, string> = {
  INSTAGRAM: '📷', TIKTOK: '🎵', TELEGRAM: '✈️',
  THREADS: '🧵', FACEBOOK: '📘', TWITTER: '𝕏',
};

const NETWORK_COLORS: Record<string, string> = {
  INSTAGRAM: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)',
  TIKTOK: '#111315', TELEGRAM: '#2AABEE', THREADS: '#111315',
  FACEBOOK: '#1877F2', TWITTER: '#111315',
};

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: 'pill-draft', label: 'Черновик' },
  SCHEDULED: { cls: 'pill-scheduled', label: 'Запланировано' },
  PUBLISHING: { cls: 'pill-live', label: 'Публикуется' },
  PUBLISHED: { cls: 'pill-published', label: 'Опубликовано' },
  ERROR: { cls: 'pill-error', label: 'Ошибка' },
};

const TABS = [
  { key: 'all', label: 'Все' },
  { key: 'DRAFT', label: 'Черновики' },
  { key: 'SCHEDULED', label: 'Запланировано' },
  { key: 'PUBLISHED', label: 'Опубликовано' },
  { key: 'ERROR', label: 'Ошибки' },
];

interface Post {
  id: string;
  body: string | null;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  brand?: { name: string; color: string };
  targets?: { account: { network: string; handle: string } }[];
}

export default function PostsPage() {
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const [tab, setTab] = useState('all');

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['posts', currentBrandId],
    queryFn: () => {
      const params = currentBrandId ? `?brandId=${currentBrandId}` : '';
      return api.get(`/posts${params}`);
    },
  });

  const filtered = tab === 'all' ? posts : posts.filter((p) => p.status === tab);

  const counts: Record<string, number> = { all: posts.length };
  posts.forEach((p) => {
    counts[p.status] = (counts[p.status] || 0) + 1;
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Посты
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Все публикации по направлениям и сетям.
          </p>
        </div>
        <div className="ml-auto">
          <Link
            href="/composer"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
          >
            ✎ Создать пост
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`border-0 bg-transparent font-semibold text-[13px] px-3.5 py-[11px] border-b-2 mb-[-1px] transition-colors ${
              tab === t.key
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts[t.key] !== undefined && (
              <span className="text-[11px] text-muted-foreground ml-1.5">
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-[22px] shadow-card overflow-x-auto" style={{ padding: '8px 10px' }}>
        <table className="w-full border-collapse text-[13px] min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Пост
              </th>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Сети
              </th>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Направление
              </th>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Статус
              </th>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Время
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((post) => {
              const pill = STATUS_PILL[post.status] || STATUS_PILL.DRAFT;
              const networks = [...new Set(post.targets?.map((t) => t.account?.network) || [])];
              return (
                <tr key={post.id} className="hover:bg-secondary transition-colors">
                  <td className="py-[13px] px-3 border-t border-border">
                    <div className="flex items-center gap-[11px]">
                      <div
                        className="w-[38px] h-[38px] rounded-[10px] shrink-0"
                        style={{ background: 'linear-gradient(135deg,#caa46f,#6c4a2a)' }}
                      />
                      <div className="min-w-0">
                        <span className="block font-semibold truncate max-w-[200px]">
                          {post.body?.slice(0, 40) || 'Без текста'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border">
                    <div className="flex gap-[5px]">
                      {networks.map((net) => (
                        <span
                          key={net}
                          className="w-[24px] h-[24px] rounded-[7px] grid place-items-center text-white text-[12px] font-extrabold shrink-0"
                          style={{ background: NETWORK_COLORS[net] || '#333' }}
                        >
                          {NETWORK_ICONS[net]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border">
                    {post.brand && (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: post.brand.color }}
                        />
                        {post.brand.name}
                      </span>
                    )}
                  </td>
                  <td className="py-[13px] px-3 border-t border-border">
                    <span className={`pill-status ${pill.cls}`}>
                      <span className="pill-dot" />
                      {post.status === 'SCHEDULED' && post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' }) +
                          ' ' +
                          new Date(post.scheduledAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
                        : pill.label}
                    </span>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border text-muted-foreground">
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' })
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-[13.5px] text-muted-foreground py-8 text-center">
            Нет постов{tab !== 'all' ? ' с таким статусом' : ''}.{' '}
            <Link href="/composer" className="text-primary font-semibold hover:underline">
              Создать пост
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
