'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface ParamDef {
  key: string;
  label: string;
  type: 'select' | 'toggle' | 'text';
  options?: { value: string; label: string }[];
  placeholder?: string;
  default: string | boolean;
}

interface ModelDef {
  id: string;
  icon: string;
  bg: string;
  name: string;
  desc: string;
  price: string;
  provider: string;
  params?: ParamDef[];
}

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '4:5', label: '4:5' },
  { value: '5:4', label: '5:4' },
];

const IMAGE_MODELS: ModelDef[] = [
  {
    id: 'nano-banana-pro', icon: '🍌', bg: '#f59e0b', name: 'Nano Banana Pro',
    desc: 'генерация изображений, img2img', price: '~$0.05', provider: 'Google',
    params: [
      { key: 'aspect_ratio', label: 'Соотношение сторон', type: 'select', options: [...ASPECT_RATIOS, { value: '21:9', label: '21:9' }], default: '1:1' },
      { key: 'resolution', label: 'Разрешение', type: 'select', options: [{ value: '1K', label: '1K' }, { value: '2K', label: '2K' }, { value: '4K', label: '4K' }], default: '1K' },
    ],
  },
];

const VIDEO_MODELS: ModelDef[] = [
  {
    id: 'kling-3.0/video', icon: 'K', bg: '#7c3aed', name: 'Kling 3.0',
    desc: 'плавное движение, звук, 5–10 сек', price: '~$0.55', provider: 'Kuaishou',
    params: [
      { key: 'duration', label: 'Длительность', type: 'select', options: [{ value: '5', label: '5 сек' }, { value: '10', label: '10 сек' }], default: '5' },
      { key: 'aspect_ratio', label: 'Соотношение', type: 'select', options: [{ value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' }, { value: '1:1', label: '1:1' }], default: '16:9' },
      { key: 'mode', label: 'Режим', type: 'select', options: [{ value: 'std', label: 'Standard (720p)' }, { value: 'pro', label: 'Pro (1080p)' }, { value: '4k', label: '4K (2160p)' }], default: 'std' },
      { key: 'sound', label: 'Звук', type: 'toggle', default: true },
    ],
  },
  {
    id: 'bytedance/seedance-2', icon: 'S', bg: '#0ea5e9', name: 'Seedance 2',
    desc: 'высокое качество, 4–15 сек', price: '~$0.70', provider: 'ByteDance',
    params: [
      { key: 'duration', label: 'Длительность', type: 'select', options: [{ value: '4', label: '4 сек' }, { value: '5', label: '5 сек' }, { value: '10', label: '10 сек' }, { value: '15', label: '15 сек' }], default: '5' },
      { key: 'aspect_ratio', label: 'Соотношение', type: 'select', options: [{ value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' }, { value: '1:1', label: '1:1' }, { value: '4:3', label: '4:3' }, { value: '3:4', label: '3:4' }, { value: '21:9', label: '21:9' }], default: '16:9' },
      { key: 'resolution', label: 'Разрешение', type: 'select', options: [{ value: '480p', label: '480p' }, { value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }, { value: '4k', label: '4K' }], default: '720p' },
      { key: 'generate_audio', label: 'Генерация звука', type: 'toggle', default: false },
    ],
  },
];

interface Generation {
  id: string;
  model: string;
  modelName: string;
  provider: string;
  type: string;
  prompt: string;
  params: Record<string, any> | null;
  result: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  error: string | null;
  tokens: number | null;
  cost: number | null;
  createdAt: string;
}

interface KlingElement {
  name: string;
  type: 'image' | 'video' | 'audio';
  urls: string[];
}

interface MediaGenerationSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'image' | 'video';
  onInsert: (asset: { id: string; type: string; url: string; thumbnailUrl: string | null; filename: string }) => void;
}

export function MediaGenerationSidebar({ open, onOpenChange, mode, onInsert }: MediaGenerationSidebarProps) {
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const addNotification = useAppStore((s) => s.addNotification);

  const models = mode === 'image' ? IMAGE_MODELS : VIDEO_MODELS;
  const [tab, setTab] = useState<'generate' | 'results'>('generate');
  const [selectedModel, setSelectedModel] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [modelParams, setModelParams] = useState<Record<string, string | boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [imageInputs, setImageInputs] = useState<{ url: string; name: string }[]>([]);
  const [klingElements, setKlingElements] = useState<KlingElement[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<{ type: 'imageInput' } | { type: 'element'; idx: number }>({ type: 'imageInput' });
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementFileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const prevProcessingIds = useRef(new Set<string>());

  const currentModel = models[selectedModel] || models[0];
  const isKlingVideo = mode === 'video' && currentModel?.id?.startsWith('kling');
  const isSeedanceVideo = mode === 'video' && currentModel?.id?.startsWith('bytedance');
  const isVideoWithRefs = isKlingVideo || isSeedanceVideo;

  const getParamValue = (key: string, def: string | boolean) =>
    modelParams[key] !== undefined ? modelParams[key] : def;

  const setParamValue = (key: string, value: string | boolean) =>
    setModelParams((prev) => ({ ...prev, [key]: value }));

  const allProcessing = generations.filter((g) => g.status === 'PROCESSING' || g.status === 'PENDING');
  const processingItems = allProcessing.filter((g) => g.type === mode);
  const completedItems = generations.filter((g) => g.status === 'COMPLETED' && g.type === mode);
  const resultsCount = processingItems.length + completedItems.length;

  const fetchGenerations = useCallback(async () => {
    if (!currentBrandId) return;
    try {
      const data = await api.get<Generation[]>(`/generations?brandId=${currentBrandId}&limit=50`);
      const prevIds = prevProcessingIds.current;
      const typeLabel = mode === 'image' ? 'Изображение' : 'Видео';
      for (const gen of data) {
        if (gen.type !== mode) continue;
        if (prevIds.has(gen.id) && gen.status === 'COMPLETED') {
          addNotification({
            type: 'success',
            title: `${typeLabel} готов`,
            message: `${gen.modelName}: ${gen.prompt.length > 80 ? gen.prompt.slice(0, 80) + '…' : gen.prompt}`,
            generationId: gen.id,
          });
        }
        if (prevIds.has(gen.id) && gen.status === 'ERROR') {
          addNotification({
            type: 'error',
            title: 'Ошибка генерации',
            message: `${gen.modelName}: ${gen.error || 'Неизвестная ошибка'}`,
          });
        }
      }
      const newProcessingIds = new Set(
        data.filter((g) => g.status === 'PROCESSING' || g.status === 'PENDING').map((g) => g.id),
      );
      prevProcessingIds.current = newProcessingIds;
      setGenerations(data);
    } catch {
      // silent
    }
  }, [currentBrandId, addNotification, mode]);

  useEffect(() => {
    if (open && currentBrandId) {
      setLoadingGenerations(true);
      fetchGenerations().finally(() => setLoadingGenerations(false));
    }
  }, [open, currentBrandId, fetchGenerations]);

  useEffect(() => {
    if (!open || allProcessing.length === 0) return;
    const interval = setInterval(fetchGenerations, 2000);
    return () => clearInterval(interval);
  }, [open, allProcessing.length, fetchGenerations]);

  useEffect(() => {
    setSelectedModel(0);
    setModelParams({});
    setImageInputs([]);
    setKlingElements([]);
  }, [mode]);

  const handleOpenMediaPicker = async (target?: { type: 'element'; idx: number }) => {
    if (!currentBrandId) return;
    setMediaPickerTarget(target || { type: 'imageInput' });
    setShowMediaPicker(true);
    setLoadingMedia(true);

    const elType = target?.type === 'element' ? klingElements[target.idx]?.type : null;
    const assetType = elType === 'video' ? 'VIDEO' : elType === 'audio' ? 'AUDIO' : 'IMAGE';
    const genType = elType === 'video' ? 'video' : elType === 'audio' ? 'audio' : 'image';

    try {
      const [uploaded, generated] = await Promise.all([
        api.get<any[]>(`/assets?brandId=${currentBrandId}&type=${assetType}`),
        api.get<any[]>(`/generations/media?brandId=${currentBrandId}&type=${genType}`),
      ]);
      const genAssets = generated.flatMap((g: any) => {
        const urls = (g.result || '').split('\n').filter(Boolean);
        return urls.map((u: string, i: number) => ({
          id: `gen-${g.id}-${i}`,
          url: u,
          thumbnailUrl: u,
          filename: g.prompt?.slice(0, 30) || 'generated',
          type: assetType,
        }));
      });
      setMediaAssets([...uploaded, ...genAssets]);
    } catch {
      toast.error('Не удалось загрузить медиа');
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !currentBrandId) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('brandId', currentBrandId);
      formData.append('tags', 'ai-input');
      try {
        const asset = await api.post<any>('/assets/upload', formData);
        setImageInputs((prev) => [...prev, { url: asset.url, name: file.name }]);
      } catch {
        toast.error(`Не удалось загрузить ${file.name}`);
      }
    }
  };

  const handleAddElement = () => {
    if (klingElements.length >= 3) return;
    setKlingElements((prev) => [...prev, { name: '', type: 'image', urls: [] }]);
  };

  const handleRemoveElement = (idx: number) => {
    setKlingElements((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleElementNameChange = (idx: number, name: string) => {
    setKlingElements((prev) => prev.map((el, i) => i === idx ? { ...el, name: name.replace(/[^a-zA-Z0-9_а-яА-ЯёЁ]/g, '_') } : el));
  };

  const handleElementTypeChange = (idx: number, type: KlingElement['type']) => {
    setKlingElements((prev) => prev.map((el, i) => i === idx ? { ...el, type, urls: [] } : el));
  };

  const handleElementFileUpload = async (idx: number, files: FileList | null) => {
    if (!files || !currentBrandId) return;
    const el = klingElements[idx];
    const maxFiles = el.type === 'image' ? 4 : 1;
    const remaining = maxFiles - el.urls.length;
    if (remaining <= 0) return;
    for (const file of Array.from(files).slice(0, remaining)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('brandId', currentBrandId);
      formData.append('tags', 'kling-element');
      try {
        const asset = await api.post<any>('/assets/upload', formData);
        setKlingElements((prev) => prev.map((e, i) => i === idx ? { ...e, urls: [...e.urls, asset.url] } : e));
      } catch {
        toast.error(`Не удалось загрузить ${file.name}`);
      }
    }
  };

  const handleRemoveElementUrl = (idx: number, urlIdx: number) => {
    setKlingElements((prev) => prev.map((el, i) => i === idx ? { ...el, urls: el.urls.filter((_, j) => j !== urlIdx) } : el));
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !currentBrandId || !currentModel) return;
    setGenerating(true);
    try {
      const resolvedParams: Record<string, string | boolean> = {};
      for (const p of currentModel.params || []) {
        resolvedParams[p.key] = getParamValue(p.key, p.default);
      }
      if (imageInputs.length > 0) {
        resolvedParams.image_input = imageInputs.map((i) => i.url) as any;
      }
      if (mode === 'video' && klingElements.length > 0) {
        const validElements = klingElements.filter((el) => el.name && el.urls.length > 0);
        if (validElements.length > 0) {
          resolvedParams.kling_elements = validElements as any;
        }
      }
      const gen = await api.post<Generation>('/generations', {
        brandId: currentBrandId,
        model: currentModel.id,
        modelName: currentModel.name,
        provider: currentModel.provider,
        type: mode,
        prompt: prompt.trim(),
        params: resolvedParams,
      });
      setGenerations((prev) => [gen, ...prev]);
      prevProcessingIds.current.add(gen.id);
      setPrompt('');
      setImageInputs([]);
      setKlingElements([]);
      setTab('results');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка генерации');
    } finally {
      setGenerating(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const updated = await api.patch<Generation>(`/generations/${id}/cancel`);
      setGenerations((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch {
      toast.error('Не удалось отменить');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/generations/${id}`);
      setGenerations((prev) => prev.filter((g) => g.id !== id));
    } catch {
      toast.error('Не удалось удалить');
    }
  };

  const handleDownload = async (url: string, filename?: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename || url.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleInsertMedia = (item: Generation) => {
    if (!item.result) return;
    const urls = item.result.split('\n').filter(Boolean);
    urls.forEach((url, i) => {
      onInsert({
        id: `gen-${item.id}-${i}`,
        type: mode === 'video' ? 'VIDEO' : 'IMAGE',
        url,
        thumbnailUrl: null,
        filename: `${item.modelName}-${item.id.slice(-6)}.${mode === 'video' ? 'mp4' : 'png'}`,
      });
    });
    onOpenChange(false);
  };

  const isImage = mode === 'image';
  const title = isImage ? '🖼 Генерация изображения' : '🎬 Генерация видео';
  const desc = isImage
    ? 'Создайте изображение для поста.'
    : 'Создайте видео для Reels, Shorts, TikTok.';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[480px] overflow-hidden p-0 flex flex-col">
        {/* Header + tabs */}
        <div className="shrink-0 px-5 pt-5 pb-0">
          <SheetHeader className="p-0 mb-3">
            <SheetTitle className="text-[18px] font-extrabold">{title}</SheetTitle>
            <SheetDescription className="text-[12.5px]">{desc}</SheetDescription>
          </SheetHeader>

          <div className="inline-flex bg-secondary rounded-xl p-[3px] w-full mb-1">
            <button
              className={`flex-1 font-bold text-[12.5px] px-3.5 py-2 rounded-[9px] transition-colors ${
                tab === 'generate' ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground'
              }`}
              onClick={() => setTab('generate')}
            >
              Генерация
            </button>
            <button
              className={`flex-1 font-bold text-[12.5px] px-3.5 py-2 rounded-[9px] transition-colors inline-flex items-center justify-center gap-1.5 ${
                tab === 'results' ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground'
              }`}
              onClick={() => setTab('results')}
            >
              Результаты
              {resultsCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  processingItems.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}>
                  {resultsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab content */}
        {tab === 'generate' ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Prompt + image inputs — takes remaining space */}
            <div className="flex-1 flex flex-col px-5 pt-4 pb-3 min-h-0 overflow-y-auto">
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2">
                Промпт
              </div>
              <div className="flex-1 min-h-[120px] border border-border rounded-[11px] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)] mb-3">
                <textarea
                  placeholder="Опишите, что сгенерировать…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                  className="w-full h-full border-0 rounded-[11px] p-3 text-[13.5px] bg-transparent resize-none outline-none"
                />
              </div>

              {/* Image inputs */}
              <div className="shrink-0">
                <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2">
                  {isImage ? 'Исходные изображения' : 'Кадры'}{' '}
                  <span className="font-normal">
                    (необязательно{mode === 'video' ? ', 1-й = первый кадр, 2-й = последний' : ''})
                  </span>
                </div>
                {imageInputs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {imageInputs.map((img) => (
                      <div key={img.url} className="relative group">
                        <img src={img.url} alt={img.name} className="w-[52px] h-[52px] rounded-lg object-cover border border-border" />
                        <button
                          onClick={() => setImageInputs((prev) => prev.filter((i) => i.url !== img.url))}
                          className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleFileUpload(e.target.files); e.target.value = ''; }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 text-[12px] font-semibold py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    + Загрузить файл
                  </button>
                  <button
                    onClick={() => handleOpenMediaPicker()}
                    className="flex-1 text-[12px] font-semibold py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Из медиатеки
                  </button>
                </div>
              </div>

              {/* Video References */}
              {isVideoWithRefs && (
                <div className="shrink-0 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      Референсы
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {isKlingVideo ? '@имя в промпте · макс. 3' : 'изображения, видео, аудио'}
                    </span>
                  </div>

                  {klingElements.map((el, idx) => (
                    <div key={idx} className="border border-border rounded-xl p-2.5 mb-2 bg-secondary/30">
                      <div className="flex items-center gap-2 mb-2">
                        {isKlingVideo && (
                          <>
                            <span className="text-[11px] text-muted-foreground">@</span>
                            <input
                              value={el.name}
                              onChange={(e) => handleElementNameChange(idx, e.target.value)}
                              placeholder="имя_элемента"
                              className="flex-1 text-[12px] font-semibold bg-transparent border border-border rounded-lg px-2 py-1 outline-none focus:border-ring"
                            />
                          </>
                        )}
                        <div className="flex gap-1">
                          {(['image', 'video', 'audio'] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => handleElementTypeChange(idx, t)}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-lg border transition-colors ${
                                el.type === t
                                  ? 'border-primary bg-primary/10 text-foreground'
                                  : 'border-border text-muted-foreground hover:bg-secondary'
                              }`}
                            >
                              {t === 'image' ? '🖼' : t === 'video' ? '🎬' : '🎵'}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleRemoveElement(idx)}
                          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      {el.urls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {el.urls.map((u, ui) => (
                            <div key={ui} className="relative group">
                              {el.type === 'image' ? (
                                <img src={u} alt="" className="w-[42px] h-[42px] rounded-lg object-cover border border-border" />
                              ) : (
                                <div className="w-[42px] h-[42px] rounded-lg border border-border bg-secondary grid place-items-center text-[14px]">
                                  {el.type === 'video' ? '🎬' : '🎵'}
                                </div>
                              )}
                              <button
                                onClick={() => handleRemoveElementUrl(idx, ui)}
                                className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full bg-destructive text-white text-[9px] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          ref={(r) => { elementFileRefs.current[idx] = r; }}
                          type="file"
                          accept={el.type === 'image' ? 'image/jpeg,image/png' : el.type === 'video' ? 'video/mp4,video/quicktime' : 'audio/*'}
                          multiple={el.type === 'image'}
                          className="hidden"
                          onChange={(e) => { handleElementFileUpload(idx, e.target.files); e.target.value = ''; }}
                        />
                        <button
                          onClick={() => elementFileRefs.current[idx]?.click()}
                          disabled={el.urls.length >= (el.type === 'image' ? 4 : 1)}
                          className="text-[11px] font-semibold py-1.5 px-2.5 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
                        >
                          + Файл
                        </button>
                        <button
                          onClick={() => handleOpenMediaPicker({ type: 'element', idx })}
                          disabled={el.urls.length >= (el.type === 'image' ? 4 : 1)}
                          className="text-[11px] font-semibold py-1.5 px-2.5 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
                        >
                          Из медиатеки
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          {el.type === 'image' ? `${el.urls.length}/4` : `${el.urls.length}/1`}
                        </span>
                      </div>
                    </div>
                  ))}

                  {klingElements.length < 3 && (
                    <button
                      onClick={handleAddElement}
                      className="w-full text-[11px] font-semibold py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      + Добавить референс
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom: model + params + button */}
            <div className="shrink-0 px-5 pb-4 flex flex-col gap-3 border-t border-border pt-3">
              <div>
                <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2">
                  Модель
                </div>
                <div className="flex flex-col gap-1.5">
                  {models.map((model, i) => (
                    <button
                      key={model.id}
                      className={`flex items-center gap-2.5 p-[9px] rounded-[11px] border text-left transition-colors ${
                        selectedModel === i
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-secondary'
                      }`}
                      onClick={() => { setSelectedModel(i); setModelParams({}); }}
                    >
                      <div
                        className="w-[22px] h-[22px] rounded-[6px] grid place-items-center text-[11px] font-extrabold shrink-0 text-white"
                        style={{ background: model.bg }}
                      >
                        {model.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[12.5px] font-bold">{model.name}</span>
                        <span className="text-[10.5px] text-muted-foreground">{model.desc}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block text-[11px] font-bold">{model.price}</span>
                        <span className="text-[10px] text-muted-foreground">{model.provider}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model params */}
              {currentModel?.params && currentModel.params.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {currentModel.params.map((p) =>
                    p.type === 'toggle' ? (
                      <div key={p.key} className="flex items-center gap-2.5">
                        <button
                          className={`w-[38px] h-[22px] rounded-full border relative shrink-0 transition-colors ${
                            getParamValue(p.key, p.default) === true
                              ? 'bg-primary border-primary'
                              : 'bg-secondary border-border'
                          }`}
                          onClick={() => setParamValue(p.key, !(getParamValue(p.key, p.default) === true))}
                        >
                          <span
                            className={`absolute top-[2px] w-[16px] h-[16px] rounded-full transition-all ${
                              getParamValue(p.key, p.default) === true
                                ? 'left-[18px] bg-primary-foreground'
                                : 'left-[2px] bg-muted-foreground'
                            }`}
                          />
                        </button>
                        <span className="text-[12px] font-semibold">{p.label}</span>
                      </div>
                    ) : (
                      <div key={p.key} className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">{p.label}</span>
                        <div className="flex flex-wrap gap-1">
                          {p.options?.map((o) => (
                            <button
                              key={o.value}
                              className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                                String(getParamValue(p.key, p.default)) === o.value
                                  ? 'border-primary bg-primary/10 text-foreground'
                                  : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                              }`}
                              onClick={() => setParamValue(p.key, o.value)}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              <button
                disabled={generating || !prompt.trim()}
                onClick={handleGenerate}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Генерация…
                  </>
                ) : (
                  <>✦ Сгенерировать · {currentModel?.price || ''}</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-3">
              {/* Processing queue */}
              {processingItems.length > 0 && (
                <div className="mb-1">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="font-bold text-[13px]">В обработке</span>
                    <span className="text-[11px] text-muted-foreground">{processingItems.length}</span>
                  </div>
                  {processingItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5 py-2.5 border-t border-border first:border-t-0">
                      <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="block text-[12.5px] truncate">{item.prompt.length > 40 ? item.prompt.slice(0, 40) + '…' : item.prompt}</span>
                        <span className="text-[10.5px] text-muted-foreground">{item.modelName}</span>
                      </div>
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="w-[24px] h-[24px] grid place-items-center rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed results */}
              {loadingGenerations ? (
                <div className="flex items-center justify-center py-8">
                  <span className="w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : completedItems.length === 0 && processingItems.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground py-8 text-center">
                  Пока нет результатов. Перейдите на вкладку «Генерация».
                </p>
              ) : (
                completedItems.map((item) => {
                  const urls = item.result?.split('\n').filter(Boolean) || [];
                  return (
                    <div key={item.id} className="border border-border rounded-[14px] bg-card overflow-hidden">
                      {/* Media preview */}
                      {isImage ? (
                        <div className={urls.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}>
                          {urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Результат ${i + 1}`} className="w-full aspect-square object-cover" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        urls.map((url, i) => (
                          <video
                            key={i}
                            src={url}
                            controls
                            className="w-full max-h-[280px] object-contain bg-black"
                          />
                        ))
                      )}

                      <div className="p-3.5">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-secondary">
                            {item.modelName}
                          </span>
                          <span className="text-[10.5px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Prompt */}
                        <div className="text-[11.5px] text-muted-foreground mb-3 italic leading-snug">
                          {item.prompt}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleInsertMedia(item)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-bold text-[12px] rounded-lg px-3 py-2 hover:brightness-95 transition-all"
                          >
                            Прикрепить к посту
                          </button>
                          <button
                            onClick={() => { urls.forEach((u, i) => handleDownload(u, `${item.modelName}-${i}.${isImage ? 'png' : 'mp4'}`)); }}
                            title="Скачать"
                            className="w-[32px] h-[32px] grid place-items-center rounded-lg border border-border hover:bg-secondary transition-colors shrink-0"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </button>
                          <button
                            onClick={() => { setPrompt(item.prompt); setTab('generate'); }}
                            title="Повторить промпт"
                            className="w-[32px] h-[32px] grid place-items-center rounded-lg border border-border hover:bg-secondary transition-colors shrink-0"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            title="Удалить"
                            className="w-[32px] h-[32px] grid place-items-center rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors shrink-0"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </SheetContent>

      {/* Media picker modal */}
      {showMediaPicker && (() => {
        const isElementPicker = mediaPickerTarget.type === 'element';
        const elIdx = isElementPicker ? (mediaPickerTarget as { type: 'element'; idx: number }).idx : -1;
        const el = isElementPicker ? klingElements[elIdx] : null;
        const isPickedFn = (url: string) => {
          if (isElementPicker && el) return el.urls.includes(url);
          return imageInputs.some((i) => i.url === url);
        };
        const handlePick = (asset: any) => {
          if (isElementPicker && el) {
            const maxFiles = el.type === 'image' ? 4 : 1;
            if (el.urls.includes(asset.url)) {
              setKlingElements((prev) => prev.map((e, i) => i === elIdx ? { ...e, urls: e.urls.filter((u) => u !== asset.url) } : e));
            } else {
              const newUrls = el.urls.length >= maxFiles ? [asset.url] : [...el.urls, asset.url];
              setKlingElements((prev) => prev.map((e, i) => i === elIdx ? { ...e, urls: newUrls } : e));
            }
          } else {
            if (imageInputs.find((i) => i.url === asset.url)) {
              setImageInputs((prev) => prev.filter((i) => i.url !== asset.url));
            } else {
              setImageInputs((prev) => [...prev, { url: asset.url, name: asset.filename }]);
            }
          }
        };
        const isVideoAsset = el?.type === 'video';
        const isAudioAsset = el?.type === 'audio';

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowMediaPicker(false)}>
            <div className="bg-card border border-border rounded-[18px] shadow-lg w-[480px] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <span className="font-bold text-[14px]">
                  {isElementPicker && el ? `Медиатека · @${el.name || 'элемент'}` : 'Выбрать из медиатеки'}
                </span>
                <button onClick={() => setShowMediaPicker(false)} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingMedia ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : mediaAssets.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground text-center py-8">
                    {isVideoAsset ? 'Нет видео' : isAudioAsset ? 'Нет аудио' : 'Нет файлов в медиатеке'}
                  </p>
                ) : isAudioAsset ? (
                  <div className="flex flex-col gap-2">
                    {mediaAssets.map((asset) => {
                      const picked = isPickedFn(asset.url);
                      return (
                        <div
                          key={asset.id}
                          onClick={() => handlePick(asset)}
                          className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                            picked ? 'border-primary bg-primary/5' : 'border-border hover:border-ring'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-semibold truncate">{asset.filename}</p>
                            <audio src={asset.url} controls preload="metadata" className="w-full h-8 mt-1.5" onClick={(e) => e.stopPropagation()} />
                          </div>
                          {picked && <span className="text-primary text-[16px] font-bold shrink-0">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {mediaAssets.map((asset) => {
                      const picked = isPickedFn(asset.url);
                      return (
                        <button
                          key={asset.id}
                          onClick={() => handlePick(asset)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                            picked ? 'border-primary' : 'border-transparent hover:border-border'
                          }`}
                        >
                          {isVideoAsset ? (
                            <video src={asset.url} muted preload="metadata" className="w-full h-full object-cover"
                              onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                              onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                            />
                          ) : (
                            <img src={asset.thumbnailUrl || asset.url} alt={asset.filename} className="w-full h-full object-cover" />
                          )}
                          {picked && (
                            <div className="absolute inset-0 bg-primary/20 grid place-items-center">
                              <span className="text-primary text-[18px] font-bold">✓</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={() => setShowMediaPicker(false)}
                  className="w-full bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </Sheet>
  );
}
