'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const NETWORK_META: Record<
  string,
  { icon: string; label: string; maxText: number; color: string; fields: string[] }
> = {
  INSTAGRAM: { icon: '📷', label: 'Instagram', maxText: 2200, color: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)', fields: ['firstComment', 'coverUrl'] },
  TIKTOK: { icon: '🎵', label: 'TikTok', maxText: 4000, color: '#111315', fields: [] },
  TELEGRAM: { icon: '✈️', label: 'Telegram', maxText: 4096, color: '#2AABEE', fields: ['parseMode'] },
  THREADS: { icon: '🧵', label: 'Threads', maxText: 500, color: '#111315', fields: [] },
  FACEBOOK: { icon: '📘', label: 'Facebook', maxText: 63206, color: '#1877F2', fields: ['firstComment'] },
  TWITTER: { icon: '𝕏', label: 'X', maxText: 280, color: '#111315', fields: [] },
};

interface Account { id: string; network: string; handle: string; }
interface Asset { id: string; type: string; url: string; thumbnailUrl: string | null; filename: string; }

export default function ComposerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentBrandId = useAppStore((s) => s.currentBrandId);

  const [body, setBody] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [networkParams, setNetworkParams] = useState<Record<string, Record<string, string>>>({});

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts', currentBrandId],
    queryFn: () => api.get(`/accounts?brandId=${currentBrandId}`),
    enabled: !!currentBrandId,
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets', currentBrandId],
    queryFn: () => api.get(`/assets?brandId=${currentBrandId}`),
    enabled: !!currentBrandId && mediaPickerOpen,
  });

  const publishMutation = useMutation({
    mutationFn: (data: any) => api.post('/posts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.push('/posts');
    },
  });

  function toggleAccount(id: string) {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  function updateNetworkParam(accountId: string, key: string, value: string) {
    setNetworkParams((prev) => ({
      ...prev,
      [accountId]: { ...(prev[accountId] || {}), [key]: value },
    }));
  }

  function addAsset(asset: Asset) {
    if (!selectedAssets.find((a) => a.id === asset.id)) {
      setSelectedAssets((prev) => [...prev, asset]);
    }
  }

  function removeAsset(id: string) {
    setSelectedAssets((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSubmit(mode: 'draft' | 'schedule' | 'publish') {
    publishMutation.mutate({
      brandId: currentBrandId,
      body,
      scheduledAt: mode === 'schedule' ? scheduledAt || undefined : undefined,
      targets: selectedAccounts.map((accountId) => ({
        accountId,
        networkParams: networkParams[accountId] || {},
      })),
      assetIds: selectedAssets.map((a) => a.id),
    });
  }

  const selectedNetworks = [
    ...new Set(
      accounts.filter((a) => selectedAccounts.includes(a.id)).map((a) => a.network),
    ),
  ];

  const validationErrors: { network: string; message: string }[] = [];
  for (const net of selectedNetworks) {
    const meta = NETWORK_META[net];
    if (meta && body.length > meta.maxText) {
      validationErrors.push({
        network: net,
        message: `Текст превышает лимит ${meta.maxText} символов (${body.length})`,
      });
    }
  }
  if (selectedNetworks.includes('TIKTOK') && selectedAssets.length === 0) {
    validationErrors.push({ network: 'TIKTOK', message: 'TikTok требует видео' });
  }

  const previewNetwork = selectedNetworks[0];
  const previewMeta = previewNetwork ? NETWORK_META[previewNetwork] : null;
  const previewAccount = accounts.find((a) => selectedAccounts.includes(a.id));

  if (!currentBrandId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Выберите направление для создания поста
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Header */}
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Новый пост
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Соберите пост и адаптируйте под каждую сеть.
          </p>
        </div>
        <div className="ml-auto">
          <Link
            href="/posts"
            className="inline-flex items-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 bg-transparent text-foreground hover:bg-secondary transition-colors"
          >
            ← К постам
          </Link>
        </div>
      </div>

      {/* Editor grid: 1fr + 360px */}
      <div className="grid grid-cols-[1fr_360px] gap-[18px] items-start">
        {/* Left column */}
        <div className="flex flex-col gap-[18px]">
          {/* Main card: networks + text + AI + per-network */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            {/* Network picker */}
            <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
              Направление и сети
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              {accounts.length === 0 ? (
                <p className="text-[13.5px] text-muted-foreground">
                  Нет подключённых аккаунтов.{' '}
                  <a href="/accounts" className="text-primary font-semibold hover:underline">
                    Подключить
                  </a>
                </p>
              ) : (
                accounts.map((acc) => {
                  const meta = NETWORK_META[acc.network];
                  const isOn = selectedAccounts.includes(acc.id);
                  return (
                    <button
                      key={acc.id}
                      className={`flex items-center gap-[7px] px-[11px] py-[7px] rounded-full text-[12.5px] font-semibold border transition-colors ${
                        isOn
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:bg-secondary'
                      }`}
                      onClick={() => toggleAccount(acc.id)}
                    >
                      <span
                        className="w-[20px] h-[20px] rounded-[6px] grid place-items-center text-white text-[10px] shrink-0"
                        style={{ background: meta?.color || '#333' }}
                      >
                        {meta?.icon}
                      </span>
                      {meta?.label}
                    </button>
                  );
                })
              )}
            </div>

            {/* Text */}
            <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
              Текст поста
            </div>
            <div className="border border-border rounded-[11px] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
              <textarea
                placeholder="Единый текст для всех сетей…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full border-0 rounded-[11px] p-3 text-[13.5px] bg-transparent resize-vertical outline-none"
              />
            </div>

            {/* AI action buttons */}
            <div className="flex gap-2 mt-2.5">
              <button className="inline-flex items-center gap-1.5 font-bold text-[12px] rounded-[10px] px-3 py-[7px] border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card">
                ✦ Сгенерировать текст
              </button>
              <button className="inline-flex items-center gap-1.5 font-bold text-[12px] rounded-[10px] px-3 py-[7px] border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card">
                Подобрать хэштеги
              </button>
              <button className="inline-flex items-center gap-1.5 font-bold text-[12px] rounded-[10px] px-3 py-[7px] border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card">
                Переписать под сеть
              </button>
            </div>

            {/* Per-network accordion sections */}
            {selectedAccounts.map((accId) => {
              const acc = accounts.find((a) => a.id === accId);
              if (!acc) return null;
              const meta = NETWORK_META[acc.network];
              if (!meta) return null;

              return (
                <div key={accId} className="border border-border rounded-xl p-3 mt-2.5">
                  <div className="flex items-center gap-[9px] font-semibold text-[13px]">
                    <span
                      className="w-[24px] h-[24px] rounded-[7px] grid place-items-center text-white text-[11px] shrink-0"
                      style={{ background: meta.color }}
                    >
                      {meta.icon}
                    </span>
                    {meta.label}
                    {meta.fields.length > 0 && (
                      <span className="text-muted-foreground font-normal text-[12px]">
                        · {meta.fields.includes('coverUrl') ? 'обложка Reel, ' : ''}
                        {meta.fields.includes('firstComment') ? 'первый комментарий' : ''}
                        {meta.fields.includes('parseMode') ? 'parse_mode' : ''}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {body.length} / {meta.maxText}
                    </span>
                  </div>
                  {meta.fields.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2.5">
                      {meta.fields.includes('firstComment') && (
                        <div className="border border-border rounded-[11px] focus-within:border-ring">
                          <input
                            placeholder="Первый комментарий"
                            value={networkParams[accId]?.firstComment || ''}
                            onChange={(e) => updateNetworkParam(accId, 'firstComment', e.target.value)}
                            className="w-full border-0 rounded-[11px] px-3 py-2 text-[13.5px] bg-transparent outline-none"
                          />
                        </div>
                      )}
                      {meta.fields.includes('coverUrl') && (
                        <div className="border border-border rounded-[11px] focus-within:border-ring">
                          <input
                            placeholder="URL обложки (Reels)"
                            value={networkParams[accId]?.coverUrl || ''}
                            onChange={(e) => updateNetworkParam(accId, 'coverUrl', e.target.value)}
                            className="w-full border-0 rounded-[11px] px-3 py-2 text-[13.5px] bg-transparent outline-none"
                          />
                        </div>
                      )}
                      {meta.fields.includes('parseMode') && (
                        <div className="border border-border rounded-[11px] focus-within:border-ring">
                          <input
                            placeholder="parse_mode (HTML / MarkdownV2)"
                            value={networkParams[accId]?.parseMode || ''}
                            onChange={(e) => updateNetworkParam(accId, 'parseMode', e.target.value)}
                            className="w-full border-0 rounded-[11px] px-3 py-2 text-[13.5px] bg-transparent outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Media card */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
              Медиа
            </div>
            <div className="flex gap-3">
              {selectedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="relative w-[90px] h-[90px] rounded-[14px] overflow-hidden border border-border bg-secondary shrink-0"
                >
                  {asset.type === 'IMAGE' ? (
                    <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-[10px] p-1 text-center">
                      {asset.filename}
                    </div>
                  )}
                  <button
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    onClick={() => removeAsset(asset.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                className="h-[90px] inline-flex items-center gap-2 font-bold text-[13px] rounded-xl px-4 border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card"
                onClick={() => setMediaPickerOpen(true)}
              >
                + Добавить из библиотеки
              </button>
            </div>
            {selectedNetworks.includes('TIKTOK') && (
              <p className="text-[11.5px] text-warning mt-2.5">
                ⚠ TikTok: вотермарки и логотипы поверх видео запрещены.
              </p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-[18px]">
          {/* Preview */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
              Превью{previewMeta ? ` · ${previewMeta.label}` : ''}
            </div>
            {previewAccount ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 p-2.5">
                  <div className="w-[28px] h-[28px] rounded-full bg-gradient-to-br from-amber-400 to-amber-800" />
                  <span className="text-[12.5px] font-bold">@{previewAccount.handle}</span>
                </div>
                {selectedAssets.length > 0 && selectedAssets[0].type === 'IMAGE' ? (
                  <img src={selectedAssets[0].url} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="h-[150px]" style={{ background: 'linear-gradient(135deg,#cda472,#6e4a28)' }} />
                )}
                <div className="p-2.5 text-[12.5px]">
                  <span className="font-bold">{previewAccount.handle}</span>{' '}
                  {body.slice(0, 120) || 'Текст поста…'}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Выберите аккаунты для превью
              </p>
            )}
          </div>

          {/* AI assistant */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
              AI‑помощник
            </div>
            <button className="w-full inline-flex items-center justify-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card mb-2">
              ✦ Сгенерировать изображение
            </button>
            <button className="w-full inline-flex items-center justify-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card">
              🎬 Сгенерировать видео для Reels
            </button>
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="bg-card border border-destructive rounded-[22px] shadow-card p-[18px]">
              <div className="flex flex-col gap-2">
                {validationErrors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-[13px] text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{NETWORK_META[err.network]?.icon} {err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom editbar */}
      <div className="sticky bottom-0 bg-card border border-border rounded-[22px] shadow-card px-4 py-3 flex items-center gap-2.5 mt-1">
        <span className="pill-status pill-draft">
          <span className="pill-dot" />
          Черновик
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {selectedAccounts.length} {selectedAccounts.length === 1 ? 'сеть выбрана' : 'сетей выбрано'}
          {validationErrors.length > 0 && ` · ${validationErrors.length} предупреждени${validationErrors.length === 1 ? 'е' : 'я'}`}
        </span>
        <div className="ml-auto flex gap-2.5">
          <button
            className="inline-flex items-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card disabled:opacity-50"
            onClick={() => handleSubmit('draft')}
            disabled={!body || publishMutation.isPending}
          >
            Сохранить
          </button>
          <button
            className="inline-flex items-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card disabled:opacity-50"
            onClick={() => setScheduleOpen(true)}
            disabled={!body || selectedAccounts.length === 0 || publishMutation.isPending}
          >
            📅 Запланировать
          </button>
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all disabled:opacity-50"
            onClick={() => handleSubmit('publish')}
            disabled={
              !body ||
              selectedAccounts.length === 0 ||
              validationErrors.length > 0 ||
              publishMutation.isPending
            }
          >
            Опубликовать
          </button>
        </div>
      </div>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Запланировать публикацию</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full border border-border rounded-[11px] p-2.5 text-[13.5px] bg-card outline-none focus:border-ring"
            />
            <button
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all disabled:opacity-50"
              onClick={() => { setScheduleOpen(false); handleSubmit('schedule'); }}
              disabled={!scheduledAt || publishMutation.isPending}
            >
              Запланировать
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media picker dialog */}
      <Dialog open={mediaPickerOpen} onOpenChange={setMediaPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Выбрать из библиотеки</DialogTitle>
          </DialogHeader>
          {assets.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground py-4 text-center">
              Библиотека пуста.{' '}
              <a href="/media" className="text-primary hover:underline font-semibold">
                Загрузить медиа
              </a>
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-auto">
              {assets.map((asset) => {
                const isSelected = selectedAssets.some((a) => a.id === asset.id);
                return (
                  <div
                    key={asset.id}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-ring'
                    }`}
                    onClick={() => (isSelected ? removeAsset(asset.id) : addAsset(asset))}
                  >
                    {asset.type === 'IMAGE' ? (
                      <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-secondary text-[11px] text-muted-foreground">
                        {asset.filename}
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
