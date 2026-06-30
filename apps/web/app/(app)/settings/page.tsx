'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ChevronDown, Eye, EyeOff, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useTheme } from 'next-themes';

interface IntegrationValue {
  configured: boolean;
  value: string;
}

type IntegrationsData = Record<string, IntegrationValue>;

interface VerifyStatus {
  status: 'connected' | 'error' | 'not_configured';
  error?: string;
}

type VerifyData = Record<string, VerifyStatus>;

const INTEGRATIONS = [
  {
    key: 'postproxy',
    name: 'Postproxy',
    description: 'Публикация и личка во все сети',
    icon: '◍',
    fields: [
      { key: 'POSTPROXY_API_KEY', label: 'API Key' },
      { key: 'POSTPROXY_WEBHOOK_SECRET', label: 'Webhook Secret' },
    ],
  },
  {
    key: 'kie',
    name: 'kie.ai',
    description: 'AI‑генерация: текст, фото, видео',
    icon: '✦',
    fields: [{ key: 'KIE_API_KEY', label: 'API Key' }],
  },
  {
    key: 'ensembleData',
    name: 'EnsembleData',
    description: 'Данные о трендах',
    icon: '▥',
    fields: [{ key: 'ENSEMBLE_DATA_API_KEY', label: 'API Key' }],
  },
  {
    key: 'storage',
    name: 'Хранилище медиа',
    description: 'S3-совместимое хранилище файлов',
    icon: '▢',
    fields: [
      { key: 'S3_ENDPOINT', label: 'Endpoint', secret: false },
      { key: 'S3_BUCKET', label: 'Bucket', secret: false },
      { key: 'S3_ACCESS_KEY', label: 'Access Key' },
      { key: 'S3_SECRET_KEY', label: 'Secret Key' },
    ],
  },
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

function IntegrationCard({
  integration,
  data,
  isLoading,
  verifyStatus,
  isVerifying,
}: {
  integration: (typeof INTEGRATIONS)[number];
  data?: IntegrationsData;
  isLoading: boolean;
  verifyStatus?: VerifyStatus;
  isVerifying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const hasAnyConfigured = integration.fields.some((f) => data?.[f.key]?.configured);

  const [saving, setSaving] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      api.put('/settings/integrations', payload),
    onSuccess: async () => {
      setSaving(true);
      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      await queryClient.refetchQueries({ queryKey: ['integrations-verify'] });
      setValues({});
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    if (mutation.isPending || saving) return;
    const payload: Record<string, string> = {};
    for (const field of integration.fields) {
      if (values[field.key] !== undefined && values[field.key] !== '') {
        payload[field.key] = values[field.key];
      }
    }
    if (Object.keys(payload).length > 0) {
      mutation.mutate(payload);
    }
  };

  const isBusy = mutation.isPending || saving;

  const hasChanges = integration.fields.some(
    (f) => values[f.key] !== undefined && values[f.key] !== '',
  );

  return (
    <div>
      <div
        className="flex items-center gap-3 py-[13px] cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-[38px] h-[38px] rounded-[11px] bg-secondary grid place-items-center text-[16px]">
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-bold">{integration.name}</span>
          <span className="text-[11.5px] text-muted-foreground">
            {integration.description}
          </span>
        </div>
        {isLoading || isVerifying ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : verifyStatus?.status === 'connected' ? (
          <span className="pill-status pill-published">
            <span className="pill-dot" />
            Подключено
          </span>
        ) : verifyStatus?.status === 'error' ? (
          <span className="pill-status pill-error" title={verifyStatus.error}>
            <span className="pill-dot" />
            Ошибка
          </span>
        ) : hasAnyConfigured ? (
          <span className="pill-status pill-scheduled">
            <span className="pill-dot" />
            Не проверено
          </span>
        ) : (
          <span className="pill-status pill-draft">
            <span className="pill-dot" />
            Не настроено
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {expanded && (
        <div className="pb-3 pl-[50px] flex flex-col gap-2.5">
          {integration.fields.map((field) => {
            const existing = data?.[field.key];
            const isSecret = !('secret' in field) || field.secret !== false;
            const isVisible = !isSecret || (visibleFields[field.key] ?? false);
            return (
              <div key={field.key}>
                <label className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5 block">
                  {field.label}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 border border-border rounded-[11px] flex items-center focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
                    <input
                      type="text"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      placeholder={existing?.configured ? existing.value : 'Не задан'}
                      value={values[field.key] ?? ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                      className="w-full border-0 rounded-[11px] px-3 py-2 text-[13px] bg-transparent outline-none"
                      style={isVisible ? undefined : { WebkitTextSecurity: 'disc', textSecurity: 'disc' } as React.CSSProperties}
                    />
                    {isSecret && (
                      <button
                        type="button"
                        className="px-2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisibleFields((v) => ({ ...v, [field.key]: !visibleFields[field.key] }));
                        }}
                      >
                        {visibleFields[field.key] ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {verifyStatus?.status === 'error' && verifyStatus.error && (
            <div className="text-[12px] text-red-500 bg-red-500/10 rounded-[9px] px-3 py-1.5">
              {verifyStatus.error}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isBusy}
              className="px-4 py-1.5 rounded-[11px] bg-primary text-primary-foreground text-[13px] font-bold disabled:opacity-40 transition-opacity flex items-center gap-1.5"
            >
              {isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
              {isBusy ? 'Проверка...' : saved ? 'Сохранено' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<IntegrationsData>({
    queryKey: ['integrations'],
    queryFn: () => api.get('/settings/integrations'),
    retry: false,
  });

  const { data: verifyData, isLoading: isVerifying } = useQuery<VerifyData>({
    queryKey: ['integrations-verify'],
    queryFn: () => api.post('/settings/integrations/verify'),
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
          {INTEGRATIONS.map((int, i) => (
            <div
              key={int.key}
              className={i > 0 ? 'border-t border-border' : ''}
            >
              <IntegrationCard
                integration={int}
                data={data}
                isLoading={isLoading}
                verifyStatus={verifyData?.[int.key]}
                isVerifying={isVerifying}
              />
            </div>
          ))}
        </div>

        {/* Budget */}
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="font-bold text-[15px]">Бюджет и расходы</span>
            <span className="ml-auto text-[12.5px] font-semibold text-muted-foreground">
              $0 / $300
            </span>
          </div>
          <div className="h-[10px] rounded-full bg-secondary overflow-hidden mb-3.5">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: '0%' }}
            />
          </div>
          {[
            { name: 'Postproxy', pct: '0%', amt: '$0' },
            { name: 'kie.ai · видео', pct: '0%', amt: '$0' },
            { name: 'kie.ai · фото/текст', pct: '0%', amt: '$0' },
            { name: 'EnsembleData', pct: '0%', amt: '$0' },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-3 py-2.5">
              <span className="w-[150px] shrink-0 text-[13px] font-semibold">
                {item.name}
              </span>
              <div className="flex-1 h-[10px] rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: item.pct }}
                />
              </div>
              <span className="w-[60px] text-right text-[13px] font-bold">
                {item.amt}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 mt-3.5 pt-3.5 border-t border-border">
            <Toggle on={budgetAlert} onToggle={() => setBudgetAlert(!budgetAlert)} />
            <span className="text-[13px] font-semibold">
              Алерт при 90% и мягкая остановка генерации
            </span>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="font-bold text-[15px]">Профиль</span>
          </div>
          <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
            Имя
          </div>
          <div className="border border-border rounded-[11px] mb-3 focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
            <input
              defaultValue="Пользователь"
              className="w-full border-0 rounded-[11px] px-3 py-2 text-[13.5px] bg-transparent outline-none"
            />
          </div>
          <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
            Язык
          </div>
          <div className="border border-border rounded-[11px] mb-3">
            <select className="w-full border-0 rounded-[11px] px-3 py-2 text-[13.5px] bg-transparent outline-none">
              <option>Русский</option>
              <option>English</option>
            </select>
          </div>
          <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
            Тема
          </div>
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
            {
              label: 'Ошибки публикаций',
              on: notifErrors,
              toggle: () => setNotifErrors(!notifErrors),
            },
            {
              label: 'Истечение токенов аккаунтов',
              on: notifTokens,
              toggle: () => setNotifTokens(!notifTokens),
            },
            {
              label: 'Готовые AI‑генерации',
              on: notifAI,
              toggle: () => setNotifAI(!notifAI),
            },
            {
              label: 'Сработавшие воронки',
              on: notifFunnels,
              toggle: () => setNotifFunnels(!notifFunnels),
            },
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
