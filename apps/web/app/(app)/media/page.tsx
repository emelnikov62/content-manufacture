'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Download,
  ImageIcon,
  Video,
  Music,
  X,
  Tag,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TYPE_ICONS: Record<string, typeof ImageIcon> = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  AUDIO: Music,
};

interface Asset {
  id: string;
  type: string;
  source: string;
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  createdAt: string;
  _count?: { posts: number };
}

export default function MediaPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const accessToken = useAppStore((s) => s.accessToken);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewHandled, setPreviewHandled] = useState(false);

  const { data: uploadedAssets = [], isLoading: loadingAssets } = useQuery<Asset[]>({
    queryKey: ['assets', currentBrandId, typeFilter, sourceFilter],
    queryFn: () => {
      let url = `/assets?brandId=${currentBrandId}`;
      if (typeFilter !== 'all') url += `&type=${typeFilter}`;
      if (sourceFilter !== 'all' && sourceFilter !== 'AI_GENERATED') url += `&source=${sourceFilter}`;
      return api.get(url);
    },
    enabled: !!currentBrandId && sourceFilter !== 'AI_GENERATED',
  });

  const { data: generatedMedia = [], isLoading: loadingGen } = useQuery<
    { id: string; type: string; modelName: string; prompt: string; result: string; createdAt: string }[]
  >({
    queryKey: ['gen-media', currentBrandId, typeFilter],
    queryFn: () => {
      let url = `/generations/media?brandId=${currentBrandId}`;
      if (typeFilter === 'IMAGE') url += '&type=image';
      if (typeFilter === 'VIDEO') url += '&type=video';
      return api.get(url);
    },
    enabled: !!currentBrandId && sourceFilter !== 'UPLOADED',
  });

  const assets: Asset[] = (() => {
    const uploaded = sourceFilter === 'AI_GENERATED' ? [] : uploadedAssets;
    const generated = sourceFilter === 'UPLOADED' ? [] : generatedMedia.flatMap((g) => {
      const urls = g.result.split('\n').filter(Boolean);
      const genType = g.type === 'video' ? 'VIDEO' : 'IMAGE';
      if (typeFilter !== 'all' && typeFilter !== genType) return [];
      return urls.map((url, i) => ({
        id: `gen-${g.id}-${i}`,
        type: genType,
        source: 'AI_GENERATED',
        url,
        thumbnailUrl: null,
        filename: `${g.modelName}-${g.id.slice(-6)}-${i}.${g.type === 'video' ? 'mp4' : 'png'}`,
        mimeType: g.type === 'video' ? 'video/mp4' : 'image/png',
        sizeBytes: 0,
        tags: ['ai-generated'],
        createdAt: g.createdAt,
        _generationPrompt: g.prompt,
        _generationModel: g.modelName,
      } as Asset));
    });
    return [...uploaded, ...generated].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  })();

  const isLoading = loadingAssets || loadingGen;

  useEffect(() => {
    const previewId = searchParams.get('preview');
    if (!previewId || previewHandled || isLoading) return;
    const match = assets.find((a) => a.id.includes(previewId));
    if (match) {
      setSelected(match);
      setPreviewHandled(true);
      router.replace('/media', { scroll: false });
    }
  }, [searchParams, assets, isLoading, previewHandled, router]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (id.startsWith('gen-')) {
        const realId = id.replace(/^gen-/, '').replace(/-\d+$/, '');
        return api.delete(`/generations/${realId}`);
      }
      return api.delete(`/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['gen-media'] });
      setSelected(null);
    },
  });

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!currentBrandId || !accessToken) return;

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('brandId', currentBrandId);

        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/assets/upload`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
          },
        );
      }
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    [currentBrandId, accessToken, queryClient],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  if (!currentBrandId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Выберите направление для просмотра медиа-библиотеки
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Медиа-библиотека
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            {assets.length} файлов
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue>
                {{ all: 'Все типы', IMAGE: 'Фото', VIDEO: 'Видео', AUDIO: 'Аудио' }[typeFilter]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="IMAGE">Фото</SelectItem>
              <SelectItem value="VIDEO">Видео</SelectItem>
              <SelectItem value="AUDIO">Аудио</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => v && setSourceFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue>
                {{ all: 'Все источники', UPLOADED: 'Загружено', AI_GENERATED: 'AI' }[sourceFilter]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все источники</SelectItem>
              <SelectItem value="UPLOADED">Загружено</SelectItem>
              <SelectItem value="AI_GENERATED">AI</SelectItem>
            </SelectContent>
          </Select>
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
            onClick={() => document.getElementById('media-upload')?.click()}
          >
            <Upload className="h-4 w-4" />
            Загрузить
          </button>
          <input
            id="media-upload"
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
            }}
          />
        </div>
      </div>

      <div
        className={`bg-card border border-border rounded-[22px] shadow-card p-[18px] transition-colors ${
          dragging ? 'border-primary bg-primary/5' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {assets.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-[13.5px]">
              Перетащите файлы сюда или нажмите «Загрузить»
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {assets.map((asset) => {
              const TypeIcon = TYPE_ICONS[asset.type] || ImageIcon;
              return (
                <div
                  key={asset.id}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-ring transition-all bg-secondary"
                  onClick={() => setSelected(asset)}
                >
                  {asset.type === 'IMAGE' ? (
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      className="h-full w-full object-cover"
                    />
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
                    <div className="flex h-full w-full items-center justify-center">
                      <TypeIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-white truncate font-semibold">
                      {asset.filename}
                    </p>
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
                    <span className={`inline-grid place-items-center w-[22px] h-[22px] rounded-md text-white/90 ${asset.source === 'AI_GENERATED' ? 'bg-violet-500/80' : 'bg-black/50'}`}>
                      {asset.source === 'AI_GENERATED' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                    </span>
                    <span className="inline-grid place-items-center w-[22px] h-[22px] rounded-md bg-black/50 text-white/90">
                      {asset.type === 'VIDEO' ? (
                        <Video className="w-3 h-3" />
                      ) : asset.type === 'AUDIO' ? (
                        <Music className="w-3 h-3" />
                      ) : (
                        <ImageIcon className="w-3 h-3" />
                      )}
                    </span>
                  </div>
                  {(asset._count?.posts ?? 0) > 0 && (
                    <span className="absolute top-1.5 left-1.5 pill-status pill-draft text-[10px] px-2 py-0.5">
                      {asset._count?.posts}×
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(asset); }}
                    className="absolute bottom-1.5 right-1.5 w-[26px] h-[26px] rounded-lg bg-black/60 text-white/80 grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-white transition-all"
                    title="Удалить"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div
            className="bg-card border border-border rounded-[22px] shadow-lg w-[520px] max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview */}
            {selected.type === 'IMAGE' ? (
              <img
                src={selected.url}
                alt={selected.filename}
                className="w-full max-h-[45vh] object-contain bg-secondary"
              />
            ) : selected.type === 'VIDEO' ? (
              <video src={selected.url} controls className="w-full max-h-[45vh] bg-secondary" />
            ) : (
              <div className="flex h-40 items-center justify-center bg-secondary">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Details */}
            <div className="p-5 flex flex-col gap-3 overflow-y-auto">
              <h3 className="text-[14px] font-bold truncate">{selected.filename}</h3>

              <div className="flex flex-col gap-1.5 text-[13px]">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Тип</span>
                  <span className="font-semibold">
                    {selected.type === 'IMAGE' ? 'Фото' : selected.type === 'VIDEO' ? 'Видео' : 'Аудио'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Источник</span>
                  <span className={`pill-status ${selected.source === 'AI_GENERATED' ? 'pill-scheduled' : 'pill-draft'} text-[10px]`}>
                    {selected.source === 'AI_GENERATED' ? 'AI' : 'Загружено'}
                  </span>
                </div>
                {selected.source !== 'AI_GENERATED' && (
                  <>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Размер</span>
                      <span className="font-semibold">{formatSize(selected.sizeBytes)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Использовано</span>
                      <span className="font-semibold">{selected._count?.posts ?? 0} раз</span>
                    </div>
                  </>
                )}
                {(selected as any)._generationModel && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Модель</span>
                    <span className="font-semibold">{(selected as any)._generationModel}</span>
                  </div>
                )}
                {(selected as any)._generationPrompt && (
                  <div className="py-1">
                    <span className="text-muted-foreground text-[12px]">Промпт</span>
                    <p className="text-[12px] mt-1 line-clamp-4">{(selected as any)._generationPrompt}</p>
                  </div>
                )}
              </div>

              {selected.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="pill-status pill-draft text-[11px]">
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2.5 mt-1">
                <button
                  className="flex-1 inline-flex items-center justify-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors"
                  onClick={() => handleDownload(selected.url, selected.filename)}
                >
                  <Download className="h-4 w-4" />
                  Скачать
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 bg-destructive text-white hover:brightness-90 transition-all"
                  onClick={() => deleteMutation.mutate(selected.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card border border-border rounded-[18px] shadow-lg w-[380px] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold mb-2">Удалить файл?</h3>
            <p className="text-[13px] text-muted-foreground mb-1 truncate">{deleteTarget.filename}</p>
            <p className="text-[12px] text-muted-foreground mb-5">Это действие нельзя отменить.</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="flex-1 font-bold text-[13px] rounded-xl px-4 py-2.5 bg-destructive text-white hover:brightness-90 transition-all"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
