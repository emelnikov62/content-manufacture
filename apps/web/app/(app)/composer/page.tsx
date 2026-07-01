'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Video,
  Music,
  Upload,
  Hash,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
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
  TELEGRAM: { icon: '✈️', label: 'Telegram', maxText: 4096, color: '#2AABEE', fields: ['chat_id', 'parse_mode'] },
  THREADS: { icon: '🧵', label: 'Threads', maxText: 500, color: '#111315', fields: [] },
  FACEBOOK: { icon: '📘', label: 'Facebook', maxText: 63206, color: '#1877F2', fields: ['firstComment'] },
  TWITTER: { icon: '𝕏', label: 'X', maxText: 280, color: '#111315', fields: [] },
};

interface Account { id: string; network: string; handle: string; }
interface Asset { id: string; type: string; url: string; thumbnailUrl: string | null; filename: string; }

export default function ComposerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const queryClient = useQueryClient();
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const accessToken = useAppStore((s) => s.accessToken);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [networkParams, setNetworkParams] = useState<Record<string, Record<string, string>>>({});
  const [placements, setPlacements] = useState<Record<string, { id: string; name: string }[]>>({});
  const [submitMode, setSubmitMode] = useState<'draft' | 'schedule' | 'publish'>('draft');
  const [loaded, setLoaded] = useState(false);

  const { data: existingPost } = useQuery<any>({
    queryKey: ['post', editId],
    queryFn: () => api.get(`/posts/${editId}`),
    enabled: !!editId,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts', currentBrandId],
    queryFn: () => api.get(`/accounts?brandId=${currentBrandId}`),
    enabled: !!currentBrandId,
  });

  const { data: uploadedAssets = [] } = useQuery<Asset[]>({
    queryKey: ['assets', currentBrandId],
    queryFn: () => api.get(`/assets?brandId=${currentBrandId}`),
    enabled: !!currentBrandId && mediaPickerOpen,
  });

  const { data: generatedMedia = [] } = useQuery<any[]>({
    queryKey: ['gen-media-composer', currentBrandId],
    queryFn: () => api.get(`/generations/media?brandId=${currentBrandId}`),
    enabled: !!currentBrandId && mediaPickerOpen,
  });

  const assets: Asset[] = (() => {
    const genAssets = generatedMedia.flatMap((g: any) => {
      const urls = (g.result || '').split('\n').filter(Boolean);
      const type = g.type === 'video' ? 'VIDEO' : g.type === 'audio' ? 'AUDIO' : 'IMAGE';
      return urls.map((url: string, i: number) => ({
        id: `gen-${g.id}-${i}`,
        type,
        url,
        thumbnailUrl: null,
        filename: `${g.modelName}-${g.id.slice(-6)}.${g.type === 'video' ? 'mp4' : g.type === 'audio' ? 'mp3' : 'png'}`,
      }));
    });
    const existingUrls = new Set(uploadedAssets.map((a) => a.url));
    const dedupedGen = genAssets.filter((a) => !existingUrls.has(a.url));
    return [...uploadedAssets, ...dedupedGen];
  })();

  const publishMutation = useMutation({
    mutationFn: async ({ payload, mode }: { payload: any; mode: string }) => {
      const post = editId
        ? await api.patch<any>(`/posts/${editId}`, payload)
        : await api.post<any>('/posts', payload);
      if (mode === 'publish') {
        const postId = post?.id || editId;
        await api.post(`/publications/${postId}/publish`);
      }
      return post;
    },
    onSuccess: (post, { mode }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (mode === 'draft' && post?.id && !editId) {
        router.replace(`/composer?edit=${post.id}`);
      }
      const msg = mode === 'draft' ? 'Черновик сохранён' : mode === 'schedule' ? 'Публикация запланирована' : 'Пост опубликован';
      toast.success(msg);
      if (mode !== 'draft') router.push('/posts');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Не удалось сохранить');
    },
  });

  const loadPlacements = useCallback(async (accountId: string) => {
    if (placements[accountId]) return;
    try {
      const res = await api.get<any[]>(`/accounts/${accountId}/placements`);
      const list = (Array.isArray(res) ? res : []).map((p: any) => ({
        id: p.id,
        name: p.name || p.username || p.id,
      }));
      setPlacements((prev) => ({ ...prev, [accountId]: list }));
      if (list.length === 1) {
        setNetworkParams((prev) => ({
          ...prev,
          [accountId]: { ...(prev[accountId] || {}), chat_id: list[0].id },
        }));
      }
    } catch {}
  }, [placements]);

  useEffect(() => {
    if (!existingPost || loaded) return;
    setTitle(existingPost.title || '');
    setBody(existingPost.body || '');
    setScheduledAt(existingPost.scheduledAt ? new Date(existingPost.scheduledAt).toISOString().slice(0, 16) : '');
    if (existingPost.targets?.length) {
      const accIds = existingPost.targets.map((t: any) => t.accountId || t.account?.id);
      setSelectedAccounts(accIds.filter(Boolean));
      const params: Record<string, Record<string, string>> = {};
      for (const t of existingPost.targets) {
        const accId = t.accountId || t.account?.id;
        if (accId && t.networkParamsJson && typeof t.networkParamsJson === 'object') {
          params[accId] = t.networkParamsJson as Record<string, string>;
        }
        if (t.account?.network === 'TELEGRAM' && accId) {
          loadPlacements(accId);
        }
      }
      setNetworkParams(params);
    }
    if (existingPost.assets?.length) {
      setSelectedAssets(
        existingPost.assets.map((pa: any) => ({
          id: pa.asset.id,
          type: pa.asset.type,
          url: pa.asset.url,
          thumbnailUrl: pa.asset.thumbnailUrl,
          filename: pa.asset.filename,
        })),
      );
    }
    setLoaded(true);
  }, [existingPost, loaded, loadPlacements]);

  function toggleAccount(id: string) {
    const acc = accounts.find((a) => a.id === id);
    if (acc?.network === 'TELEGRAM' && !selectedAccounts.includes(id)) {
      loadPlacements(id);
    }
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
    setSubmitMode(mode);
    const realAssetIds = selectedAssets
      .filter((a) => !a.id.startsWith('gen-'))
      .map((a) => a.id);
    const data: any = {
      title,
      body,
      assetIds: realAssetIds,
      mediaUrls: selectedAssets
        .filter((a) => a.id.startsWith('gen-'))
        .map((a) => a.url),
      targets: selectedAccounts.map((accountId) => ({
        accountId,
        networkParams: networkParams[accountId] || {},
      })),
    };
    if (!editId) data.brandId = currentBrandId;
    if (mode === 'schedule') data.scheduledAt = scheduledAt || undefined;
    publishMutation.mutate({ payload: data, mode });
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
  for (const accId of selectedAccounts) {
    const acc = accounts.find((a) => a.id === accId);
    if (acc?.network === 'TELEGRAM' && !networkParams[accId]?.chat_id) {
      validationErrors.push({ network: 'TELEGRAM', message: 'Выберите канал для Telegram' });
      break;
    }
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
            {editId ? 'Редактировать пост' : 'Новый пост'}
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            {editId ? 'Измените пост и сохраните.' : 'Соберите пост и адаптируйте под каждую сеть.'}
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[18px] items-start">
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

            {/* Title */}
            <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
              Название
            </div>
            <div className="border border-border rounded-[11px] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)] mb-4">
              <input
                placeholder="Название поста…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-0 rounded-[11px] px-3 py-2.5 text-[13.5px] bg-transparent outline-none"
              />
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
              const isTelegram = acc.network === 'TELEGRAM';
              const accPlacements = placements[accId] || [];
              const selectedChatId = networkParams[accId]?.chat_id || '';

              return (
                <div key={accId} className="border border-border rounded-xl p-3 mt-2.5">
                  <div className="flex items-center gap-[9px] font-semibold text-[13px]">
                    <span
                      className="w-[24px] h-[24px] rounded-[7px] grid place-items-center text-white text-[11px] shrink-0"
                      style={{ background: meta.color }}
                    >
                      {meta.icon}
                    </span>
                    {meta.label} · @{acc.handle}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {body.length} / {meta.maxText}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 mt-2.5">
                    {isTelegram && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">Канал / группа *</span>
                        {accPlacements.length === 0 ? (
                          <p className="text-[12px] text-muted-foreground">
                            Нет каналов. Добавьте бота как администратора в канал.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {accPlacements.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                                  selectedChatId === p.id
                                    ? 'border-[#2AABEE] bg-[#2AABEE]/10 text-foreground'
                                    : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                                }`}
                                onClick={() => updateNetworkParam(accId, 'chat_id', p.id)}
                              >
                                <Hash className="h-3 w-3" />
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
                    {isTelegram && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">Форматирование</span>
                        <div className="flex gap-1.5">
                          {[
                            { value: '', label: 'Без форматирования' },
                            { value: 'HTML', label: 'HTML' },
                            { value: 'MarkdownV2', label: 'Markdown' },
                          ].map((o) => (
                            <button
                              key={o.value}
                              type="button"
                              className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                                (networkParams[accId]?.parse_mode || '') === o.value
                                  ? 'border-primary bg-primary/10 text-foreground'
                                  : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                              }`}
                              onClick={() => updateNetworkParam(accId, 'parse_mode', o.value)}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Media card */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
              Медиа
            </div>
            <div className="flex flex-col gap-3">
              {selectedAssets.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {selectedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="relative w-[120px] h-[120px] rounded-[14px] overflow-hidden border border-border bg-secondary shrink-0"
                    >
                      {asset.type === 'IMAGE' ? (
                        <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                      ) : asset.type === 'VIDEO' ? (
                        <video
                          src={asset.url}
                          muted
                          preload="metadata"
                          className="h-full w-full object-cover"
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                          onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                        />
                      ) : (
                        <div className="flex flex-col h-full items-center justify-center gap-1 p-1.5">
                          <Music className="h-5 w-5 text-muted-foreground shrink-0" />
                          <span className="text-[8px] text-muted-foreground text-center leading-tight line-clamp-2 w-full">{asset.filename}</span>
                          <audio
                            src={asset.url}
                            controls
                            preload="metadata"
                            className="w-full shrink-0"
                            style={{ height: '24px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                      <div className="absolute top-1 left-1">
                        {asset.type === 'VIDEO' && <Video className="h-3.5 w-3.5 text-white drop-shadow" />}
                        {asset.type === 'AUDIO' && <Music className="h-3.5 w-3.5 text-white drop-shadow" />}
                      </div>
                      <button
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                        onClick={() => removeAsset(asset.id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  className="h-10 inline-flex items-center gap-2 font-bold text-[13px] rounded-xl px-4 border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  + Из библиотеки
                </button>
                <button
                  className="h-10 inline-flex items-center gap-2 font-bold text-[13px] rounded-xl px-4 border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card"
                  onClick={() => document.getElementById('composer-upload')?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Загрузить
                </button>
              </div>
              <input
                id="composer-upload"
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={async (e) => {
                  if (!e.target.files || !currentBrandId || !accessToken) return;
                  for (const file of Array.from(e.target.files)) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('brandId', currentBrandId);
                    try {
                      const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/assets/upload`,
                        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData },
                      );
                      const asset = await res.json();
                      if (asset?.id) addAsset(asset);
                    } catch {}
                  }
                  e.target.value = '';
                  queryClient.invalidateQueries({ queryKey: ['assets'] });
                }}
              />
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
                {selectedAssets.length > 0 ? (
                  <div className={`grid gap-0.5 overflow-hidden ${
                    selectedAssets.length === 1 ? 'grid-cols-1' :
                    selectedAssets.length === 2 ? 'grid-cols-2' :
                    selectedAssets.length === 3 ? 'grid-cols-3' :
                    'grid-cols-2'
                  }`}>
                    {selectedAssets.map((asset, i) => (
                      <div
                        key={asset.id}
                        className={`relative overflow-hidden ${
                          selectedAssets.length === 1 ? 'aspect-video' :
                          selectedAssets.length === 3 && i === 0 ? 'row-span-2 aspect-auto h-full' :
                          'aspect-square'
                        }`}
                      >
                        {asset.type === 'IMAGE' ? (
                          <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                        ) : asset.type === 'VIDEO' ? (
                          <video src={asset.url} muted preload="metadata" className="h-full w-full object-cover"
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                          />
                        ) : (
                          <div className="flex flex-col h-full items-center justify-center gap-1.5 bg-secondary p-2">
                            <Music className="h-6 w-6 text-muted-foreground shrink-0" />
                            <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2 w-full">{asset.filename}</span>
                            <audio src={asset.url} controls preload="metadata" className="w-full shrink-0" style={{ height: '24px' }} onClick={(e) => e.stopPropagation()} />
                          </div>
                        )}
                        {asset.type === 'VIDEO' && <Video className="absolute top-1.5 left-1.5 h-4 w-4 text-white drop-shadow" />}
                      </div>
                    ))}
                  </div>
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
        <DialogContent className="sm:max-w-4xl">
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
            <div className="grid grid-cols-3 gap-3 max-h-[500px] overflow-auto" style={{ gridAutoRows: '180px' }}>
              {assets.map((asset) => {
                const isSelected = selectedAssets.some((a) => a.id === asset.id);
                return (
                  <div
                    key={asset.id}
                    className={`relative rounded-xl border-2 cursor-pointer transition-all h-full ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-ring'
                    }`}
                    onClick={() => (isSelected ? removeAsset(asset.id) : addAsset(asset))}
                  >
                    {asset.type === 'IMAGE' ? (
                      <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover rounded-[10px]" />
                    ) : asset.type === 'VIDEO' ? (
                      <video
                        src={asset.url}
                        muted
                        preload="metadata"
                        className="h-full w-full object-cover rounded-[10px]"
                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                    ) : (
                      <div className="flex flex-col h-full items-center justify-center gap-2 bg-secondary rounded-[10px] px-4 py-3 overflow-hidden">
                        <Music className="h-9 w-9 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground text-center leading-tight line-clamp-2 w-full shrink-0">{asset.filename}</span>
                        <audio
                          src={asset.url}
                          controls
                          preload="metadata"
                          className="w-full shrink-0"
                          style={{ height: '32px' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5">
                      {asset.type === 'VIDEO' && <Video className="h-4 w-4 text-white drop-shadow" />}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5">
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
