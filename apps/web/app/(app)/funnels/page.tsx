'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';

const NETWORK_COLORS: Record<string, string> = {
  INSTAGRAM: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)',
  TIKTOK: '#111315', TELEGRAM: '#2AABEE', FACEBOOK: '#1877F2',
};

const DEMO_FUNNELS = [
  {
    id: '1',
    name: '«ГАЙД» → ссылка',
    keywords: 'гайд, guide, гайдик',
    network: 'INSTAGRAM',
    networkIcon: '📷',
    active: true,
    conversion: '34%',
    trigger: 'Instagram · @coffee.house · все посты',
    action: 'Лови гайд 👉 ссылка + подпишись на наш Telegram‑канал!',
  },
  {
    id: '2',
    name: '«МЕНЮ» → PDF',
    keywords: 'меню, menu',
    network: 'FACEBOOK',
    networkIcon: '📘',
    active: true,
    conversion: '28%',
    trigger: 'Facebook · Coffee House Page',
    action: 'Вот наше меню 📋 ссылка',
  },
  {
    id: '3',
    name: '«СКИДКА» → промокод',
    keywords: 'скидка',
    network: 'TELEGRAM',
    networkIcon: '✈️',
    active: false,
    conversion: '—',
    trigger: 'Telegram · Coffee House канал',
    action: 'Твой промокод: COFFEE10 🎉',
  },
];

export default function FunnelsPage() {
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const [selectedId, setSelectedId] = useState(DEMO_FUNNELS[0].id);

  const selected = DEMO_FUNNELS.find((f) => f.id === selectedId) || DEMO_FUNNELS[0];

  if (!currentBrandId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Выберите направление для работы с воронками
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Воронки авто‑ответа
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Ключевое слово → ссылка на гайд / Telegram‑канал.
          </p>
        </div>
        <div className="ml-auto">
          <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all">
            + Новая воронка
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-start">
        {/* Table */}
        <div className="bg-card border border-border rounded-[22px] shadow-card" style={{ padding: '8px 10px' }}>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                  Воронка
                </th>
                <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                  Канал
                </th>
                <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                  Статус
                </th>
                <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                  Конверсия
                </th>
              </tr>
            </thead>
            <tbody>
              {DEMO_FUNNELS.map((funnel) => (
                <tr
                  key={funnel.id}
                  className={`cursor-pointer transition-colors ${
                    selectedId === funnel.id ? 'bg-secondary' : 'hover:bg-secondary'
                  }`}
                  onClick={() => setSelectedId(funnel.id)}
                >
                  <td className="py-[13px] px-3 border-t border-border">
                    <span className="font-bold">{funnel.name}</span>
                    <div className="text-[11.5px] text-muted-foreground">
                      ключевые: {funnel.keywords}
                    </div>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border">
                    <span
                      className="w-[24px] h-[24px] rounded-[7px] grid place-items-center text-white text-[12px] font-extrabold inline-grid"
                      style={{ background: NETWORK_COLORS[funnel.network] || '#333' }}
                    >
                      {funnel.networkIcon}
                    </span>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border">
                    <span className={`pill-status ${funnel.active ? 'pill-published' : 'pill-draft'}`}>
                      <span className="pill-dot" />
                      {funnel.active ? 'Активна' : 'Пауза'}
                    </span>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border font-bold">
                    {funnel.conversion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Constructor */}
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
            Конструктор · {selected.name}
          </div>
          <div className="flex flex-col gap-3">
            {/* Trigger */}
            <div className="border border-border rounded-xl p-3">
              <div className="flex items-center gap-2.5 font-semibold text-[13px]">
                ① Триггер
              </div>
              <div className="mt-2 text-[12.5px] text-muted-foreground">
                {selected.trigger}
              </div>
              <div className="mt-2 border border-border rounded-[11px] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
                <input
                  defaultValue={selected.keywords}
                  className="w-full border-0 rounded-[11px] px-3 py-2 text-[13.5px] bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="text-center text-muted-foreground">↓</div>

            {/* Action */}
            <div className="border border-border rounded-xl p-3">
              <div className="flex items-center gap-2.5 font-semibold text-[13px]">
                ② Действие · private reply + личка
              </div>
              <div className="mt-2 border border-border rounded-[11px] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
                <textarea
                  rows={2}
                  defaultValue={selected.action}
                  className="w-full border-0 rounded-[11px] px-3 py-2 text-[13.5px] bg-transparent outline-none resize-none"
                />
              </div>
            </div>

            <p className="text-[11.5px] text-muted-foreground">
              Учтены окна Meta (24 ч / 7 дней private reply) и пейсинг ≤200/час.
            </p>

            <button className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all">
              Сохранить воронку
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
