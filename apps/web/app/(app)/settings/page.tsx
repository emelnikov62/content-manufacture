'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useTheme } from 'next-themes';

interface IntegrationStatus {
  postproxy: boolean;
  kie: boolean;
  ensembleData: boolean;
}

const INTEGRATIONS = [
  { key: 'postproxy' as const, name: 'Postproxy', description: 'Публикация и личка во все сети', icon: '◍' },
  { key: 'kie' as const, name: 'kie.ai', description: 'AI‑генерация: текст, фото, видео', icon: '✦' },
  { key: 'ensembleData' as const, name: 'EnsembleData', description: 'Данные о трендах', icon: '▥' },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className={`w-[42px] h-[24px] rounded-full border relative shrink-0 transition-colors ${
        on ? 'bg-primary border-primary' : 'bg-secondary border-border'
      }`}
      onClick={onToggle}
    >
      <span
        className={`absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all ${
          on ? 'left-[20px] bg-primary-foreground' : 'left-[2px] bg-muted-foreground'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ['settings-status'],
    queryFn: () => api.get('/settings/integrations'),
    retry: false,
  });

  const [notifErrors, setNotifErrors] = useState(true);
  const [notifTokens, setNotifTokens] = useState(true);
  const [notifAI, setNotifAI] = useState(true);
  const [notifFunnels, setNotifFunnels] = useState(false);
  const [budgetAlert, setBudgetAlert] = useState(true);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Настройки
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Интеграции, бюджет и параметры рабочего пространства.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] items-start">
        {/* Integrations */}
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="font-bold text-[15px]">Интеграции</span>
          </div>
          {INTEGRATIONS.map((int, i) => {
            const connected = status?.[int.key] ?? false;
            return (
              <div
                key={int.key}
                className={`flex items-center gap-3 py-[13px] ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="w-[38px] h-[38px] rounded-[11px] bg-secondary grid place-items-center text-[16px]">
                  {int.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-bold">{int.name}</span>
                  <span className="text-[11.5px] text-muted-foreground">{int.description}</span>
                </div>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : connected ? (
                  <span className="pill-status pill-published">
                    <span className="pill-dot" />
                    Подключено
                  </span>
                ) : (
                  <span className="pill-status pill-draft">
                    <span className="pill-dot" />
                    Не настроено
                  </span>
                )}
              </div>
            );
          })}
          <div
            className={`flex items-center gap-3 py-[13px] border-t border-border`}
          >
            <div className="w-[38px] h-[38px] rounded-[11px] bg-secondary grid place-items-center text-[16px]">
              ▢
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[13.5px] font-bold">Хранилище медиа</span>
              <span className="text-[11.5px] text-muted-foreground">Локальное (uploads/)</span>
            </div>
            <span className="pill-status pill-published">
              <span className="pill-dot" />
              Подключено
            </span>
          </div>
        </div>

        {/* Budget */}
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="font-bold text-[15px]">Бюджет и расходы</span>
            <span className="ml-auto text-[12.5px] font-semibold text-muted-foreground">$0 / $300</span>
          </div>
          <div className="h-[10px] rounded-full bg-secondary overflow-hidden mb-3.5">
            <div className="h-full rounded-full bg-primary" style={{ width: '0%' }} />
          </div>
          {[
            { name: 'Postproxy', pct: '0%', amt: '$0' },
            { name: 'kie.ai · видео', pct: '0%', amt: '$0' },
            { name: 'kie.ai · фото/текст', pct: '0%', amt: '$0' },
            { name: 'EnsembleData', pct: '0%', amt: '$0' },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-3 py-2.5">
              <span className="w-[150px] shrink-0 text-[13px] font-semibold">{item.name}</span>
              <div className="flex-1 h-[10px] rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: item.pct }} />
              </div>
              <span className="w-[60px] text-right text-[13px] font-bold">{item.amt}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 mt-3.5 pt-3.5 border-t border-border">
            <Toggle on={budgetAlert} onToggle={() => setBudgetAlert(!budgetAlert)} />
            <span className="text-[13px] font-semibold">Алерт при 90% и мягкая остановка генерации</span>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="font-bold text-[15px]">Профиль</span>
          </div>
          <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">Имя</div>
          <div className="border border-border rounded-[11px] mb-3 focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
            <input
              defaultValue="Пользователь"
              className="w-full border-0 rounded-[11px] px-3 py-2 text-[13.5px] bg-transparent outline-none"
            />
          </div>
          <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">Язык</div>
          <div className="border border-border rounded-[11px] mb-3">
            <select className="w-full border-0 rounded-[11px] px-3 py-2 text-[13.5px] bg-transparent outline-none">
              <option>Русский</option>
              <option>English</option>
            </select>
          </div>
          <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">Тема</div>
          <div className="inline-flex bg-secondary rounded-xl p-[3px]">
            <button
              className={`border-0 bg-transparent font-bold text-[12.5px] px-3.5 py-2 rounded-[9px] transition-colors ${
                theme === 'light'
                  ? 'bg-card text-foreground shadow-card'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setTheme('light')}
            >
              Светлая
            </button>
            <button
              className={`border-0 bg-transparent font-bold text-[12.5px] px-3.5 py-2 rounded-[9px] transition-colors ${
                theme === 'dark'
                  ? 'bg-card text-foreground shadow-card'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setTheme('dark')}
            >
              Тёмная
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="font-bold text-[15px]">Уведомления</span>
          </div>
          {[
            { label: 'Ошибки публикаций', on: notifErrors, toggle: () => setNotifErrors(!notifErrors) },
            { label: 'Истечение токенов аккаунтов', on: notifTokens, toggle: () => setNotifTokens(!notifTokens) },
            { label: 'Готовые AI‑генерации', on: notifAI, toggle: () => setNotifAI(!notifAI) },
            { label: 'Сработавшие воронки', on: notifFunnels, toggle: () => setNotifFunnels(!notifFunnels) },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 py-2">
              <Toggle on={item.on} onToggle={item.toggle} />
              <span className="text-[13px]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
