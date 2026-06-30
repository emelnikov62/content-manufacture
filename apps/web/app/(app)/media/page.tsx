'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const accessToken = useAppStore((s) => s.accessToken);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [dragging, setDragging] = useState(false);

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets', currentBrandId, typeFilter, sourceFilter],
    queryFn: () => {
      let url = `/assets?brandId=${currentBrandId}`;
      if (typeFilter !== 'all') url += `&type=${typeFilter}`;
      if (sourceFilter !== 'all') url += `&source=${sourceFilter}`;
      return api.get(url);
    },
    enabled: !!currentBrandId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
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
              <SelectValue />
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
              <SelectValue />
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
                  {asset.source === 'AI_GENERATED' && (
                    <span className="absolute top-1.5 right-1.5 pill-status pill-scheduled text-[10px] px-2 py-0.5">
                      AI
                    </span>
                  )}
                  {(asset._count?.posts ?? 0) > 0 && (
                    <span className="absolute top-1.5 left-1.5 pill-status pill-draft text-[10px] px-2 py-0.5">
                      {asset._count?.posts}×
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="truncate">{selected?.filename}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 flex flex-col gap-4">
              {selected.type === 'IMAGE' ? (
                <img
                  src={selected.url}
                  alt={selected.filename}
                  className="w-full rounded-xl"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl bg-secondary">
                  {selected.type === 'VIDEO' ? (
                    <Video className="h-12 w-12 text-muted-foreground" />
                  ) : (
                    <Music className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Тип</span>
                  <span className="font-semibold">{selected.type}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Размер</span>
                  <span className="font-semibold">{formatSize(selected.sizeBytes)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Источник</span>
                  <span className={`pill-status ${selected.source === 'AI_GENERATED' ? 'pill-scheduled' : 'pill-draft'} text-[10px]`}>
                    {selected.source === 'AI_GENERATED' ? 'AI' : 'Загружено'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Использовано</span>
                  <span className="font-semibold">{selected._count?.posts ?? 0} раз</span>
                </div>
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
              <div className="flex gap-2.5 mt-2">
                <button
                  className="flex-1 inline-flex items-center justify-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors"
                  onClick={() => setSelected(null)}
                >
                  Закрыть
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 bg-destructive text-white hover:brightness-90 transition-all"
                  onClick={() => deleteMutation.mutate(selected.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
