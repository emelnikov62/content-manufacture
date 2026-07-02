'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const TABS = [
  { key: 'text', label: '✎ Текст' },
  { key: 'image', label: '🖼 Изображение' },
  { key: 'video', label: '🎬 Видео' },
  { key: 'audio', label: '🎵 Аудио' },
];

const MUSIC_STYLES = [
  'Pop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'Hip-Hop', 'R&B',
  'Country', 'Folk', 'Blues', 'Reggae', 'Metal', 'Punk', 'Lo-fi',
  'Ambient', 'Funk', 'Soul', 'Latin', 'Indie', 'K-pop', 'Disco',
  'House', 'Techno', 'Trap', 'Dubstep', 'Drum & Bass', 'Chillout',
  'Acoustic', 'Cinematic', 'Orchestral', 'Gospel', 'Ska', 'Grunge',
  'Synthwave', 'Bossa Nova', 'Afrobeat',
].map((s) => ({ value: s, label: s }));

interface ParamDef {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'toggle' | 'text';
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

const MODELS: Record<string, ModelDef[]> = {
  text: [
    { id: 'gpt-5-5', icon: 'G', bg: '#10a37f', name: 'GPT-5.5', desc: 'агентное мышление, сложные задачи', price: '~$0.03', provider: 'OpenAI' },
    { id: 'claude-sonnet-4-6', icon: 'C', bg: '#d97706', name: 'Claude Sonnet 4.6', desc: 'длинные тексты, бренд-голос', price: '~$0.02', provider: 'Anthropic' },
    { id: 'gemini-3-5-flash', icon: 'G', bg: '#4285f4', name: 'Gemini 3.5 Flash', desc: 'быстрый, большой контекст', price: '~$0.01', provider: 'Google' },
  ],
  image: [
    { id: 'nano-banana-pro', icon: '🍌', bg: '#f59e0b', name: 'Nano Banana Pro', desc: 'генерация изображений, img2img', price: '~$0.05', provider: 'Google', params: [
      { key: 'aspect_ratio', label: 'Соотношение сторон', type: 'select', options: [...ASPECT_RATIOS, { value: '21:9', label: '21:9' }], default: '1:1' },
      { key: 'resolution', label: 'Разрешение', type: 'select', options: [{ value: '1K', label: '1K' }, { value: '2K', label: '2K' }, { value: '4K', label: '4K' }], default: '1K' },
    ]},
  ],
  video: [
    { id: 'kling-3.0/video', icon: 'K', bg: '#7c3aed', name: 'Kling 3.0', desc: 'плавное движение, звук, 5–10 сек', price: '~$0.55', provider: 'Kuaishou', params: [
      { key: 'duration', label: 'Длительность', type: 'select', options: [{ value: '5', label: '5 сек' }, { value: '10', label: '10 сек' }], default: '5' },
      { key: 'aspect_ratio', label: 'Соотношение', type: 'select', options: [{ value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' }, { value: '1:1', label: '1:1' }], default: '16:9' },
      { key: 'mode', label: 'Режим', type: 'select', options: [{ value: 'std', label: 'Standard (720p)' }, { value: 'pro', label: 'Pro (1080p)' }, { value: '4k', label: '4K (2160p)' }], default: 'std' },
      { key: 'sound', label: 'Звук', type: 'toggle', default: true },
    ]},
    { id: 'bytedance/seedance-2', icon: 'S', bg: '#0ea5e9', name: 'Seedance 2', desc: 'высокое качество, 4–15 сек', price: '~$0.70', provider: 'ByteDance', params: [
      { key: 'duration', label: 'Длительность', type: 'select', options: [{ value: '4', label: '4 сек' }, { value: '5', label: '5 сек' }, { value: '10', label: '10 сек' }, { value: '15', label: '15 сек' }], default: '5' },
      { key: 'aspect_ratio', label: 'Соотношение', type: 'select', options: [{ value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' }, { value: '1:1', label: '1:1' }, { value: '4:3', label: '4:3' }, { value: '3:4', label: '3:4' }, { value: '21:9', label: '21:9' }], default: '16:9' },
      { key: 'resolution', label: 'Разрешение', type: 'select', options: [{ value: '480p', label: '480p' }, { value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }, { value: '4k', label: '4K' }], default: '720p' },
      { key: 'generate_audio', label: 'Генерация звука', type: 'toggle', default: false },
      { key: 'web_search', label: 'Веб-поиск', type: 'toggle', default: false },
    ]},
  ],
  audio: [
    { id: 'V5_5', icon: 'S', bg: 'var(--feature)', name: 'Suno 5.5', desc: 'музыка, джинглы, вокал', price: '~$0.10', provider: 'Suno', params: [
      { key: 'title', label: 'Название трека', type: 'text', placeholder: 'Peaceful Piano Meditation', default: '' },
      { key: 'style', label: 'Стиль', type: 'select', options: MUSIC_STYLES, default: '' },
      { key: 'negativeTags', label: 'Исключить стили', type: 'multiselect', options: MUSIC_STYLES, default: '' },
      { key: 'instrumental', label: 'Инструментал (без вокала)', type: 'toggle', default: false },
      { key: 'vocalGender', label: 'Голос', type: 'select', options: [{ value: '', label: 'Авто' }, { value: 'm', label: 'Мужской' }, { value: 'f', label: 'Женский' }], default: '' },
      { key: 'styleWeight', label: 'Вес стиля', type: 'select', options: [{ value: '0.25', label: '0.25' }, { value: '0.5', label: '0.5' }, { value: '0.65', label: '0.65' }, { value: '0.75', label: '0.75' }, { value: '1', label: '1.0' }], default: '0.65' },
      { key: 'audioWeight', label: 'Вес аудио', type: 'select', options: [{ value: '0.25', label: '0.25' }, { value: '0.5', label: '0.5' }, { value: '0.65', label: '0.65' }, { value: '0.75', label: '0.75' }, { value: '1', label: '1.0' }], default: '0.65' },
      { key: 'weirdnessConstraint', label: 'Экспериментальность', type: 'select', options: [{ value: '0.25', label: '0.25' }, { value: '0.5', label: '0.5' }, { value: '0.65', label: '0.65' }, { value: '0.75', label: '0.75' }, { value: '1', label: '1.0' }], default: '0.65' },
    ]},
  ],
};

interface KlingElement {
  name: string;
  type: 'image' | 'video' | 'audio';
  urls: string[];
}

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

export default function StudioPage() {
  const searchParams = useSearchParams();
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some((t) => t.key === initialTab) ? initialTab! : 'text');
  const [selectedModel, setSelectedModel] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [modelParams, setModelParams] = useState<Record<string, string | boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [imageInputs, setImageInputs] = useState<{ url: string; name: string }[]>([]);
  const [klingElements, setKlingElements] = useState<KlingElement[]>([]);
  const [personas, setPersonas] = useState<{ id: string; sunoId: string; name: string; style?: string }[]>([]);
  const [showPersonaModal, setShowPersonaModal] = useState<{ generationId: string; audioIndex: number } | null>(null);
  const [personaForm, setPersonaForm] = useState({ name: '', description: '', style: '', vocalStart: 0, vocalEnd: 30 });
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<{ type: 'imageInput' } | { type: 'element'; idx: number }>({ type: 'imageInput' });
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementFileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const addNotification = useAppStore((s) => s.addNotification);
  const prevProcessingIds = useRef(new Set<string>());

  const models = MODELS[tab] || [];
  const currentModel = models[selectedModel] || models[0];

  const getParamValue = (key: string, def: string | boolean) =>
    modelParams[key] !== undefined ? modelParams[key] : def;

  const setParamValue = (key: string, value: string | boolean) =>
    setModelParams((prev) => ({ ...prev, [key]: value }));

  const allProcessing = generations.filter((g) => g.status === 'PROCESSING' || g.status === 'PENDING');
  const processingItems = allProcessing.filter((g) => g.type === tab);
  const completedItems = generations.filter((g) => g.status === 'COMPLETED' && g.type === tab);
  const errorItems = generations.filter((g) => g.status === 'ERROR' && g.type === tab);

  const fetchGenerations = useCallback(async () => {
    if (!currentBrandId) return;
    try {
      const data = await api.get<Generation[]>(`/generations?brandId=${currentBrandId}&limit=50`);

      const prevIds = prevProcessingIds.current;
      for (const gen of data) {
        if (prevIds.has(gen.id) && gen.status === 'COMPLETED') {
          const typeLabel = gen.type === 'image' ? 'Изображение' : gen.type === 'video' ? 'Видео' : gen.type === 'audio' ? 'Аудио' : 'Текст';
          addNotification({
            type: 'success',
            title: `${typeLabel} готов`,
            message: `${gen.modelName}: ${gen.prompt.length > 80 ? gen.prompt.slice(0, 80) + '…' : gen.prompt}`,
            generationId: (gen.type === 'image' || gen.type === 'video' || gen.type === 'audio') ? gen.id : undefined,
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
  }, [currentBrandId, addNotification]);

  const fetchPersonas = useCallback(async () => {
    if (!currentBrandId) return;
    try {
      const data = await api.get<any[]>(`/generations/personas/list?brandId=${currentBrandId}`);
      setPersonas(data);
    } catch { /* silent */ }
  }, [currentBrandId]);

  useEffect(() => {
    if (currentBrandId) {
      setLoadingGenerations(true);
      fetchGenerations().finally(() => setLoadingGenerations(false));
      fetchPersonas();
    }
  }, [currentBrandId, fetchGenerations, fetchPersonas]);

  useEffect(() => {
    if (allProcessing.length === 0) return;
    const interval = setInterval(fetchGenerations, 2000);
    return () => clearInterval(interval);
  }, [allProcessing.length, fetchGenerations]);

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

  const handlePickMedia = (asset: any) => {
    if (mediaPickerTarget.type === 'element') {
      const idx = mediaPickerTarget.idx;
      const el = klingElements[idx];
      if (!el) return;
      const maxFiles = el.type === 'image' ? 4 : 1;
      if (el.urls.includes(asset.url)) {
        setKlingElements((prev) => prev.map((e, i) => i === idx ? { ...e, urls: e.urls.filter((u) => u !== asset.url) } : e));
        return;
      }
      const newUrls = el.urls.length >= maxFiles ? [asset.url] : [...el.urls, asset.url];
      setKlingElements((prev) => prev.map((e, i) => i === idx ? { ...e, urls: newUrls } : e));
    } else {
      if (imageInputs.find((i) => i.url === asset.url)) return;
      setImageInputs((prev) => [...prev, { url: asset.url, name: asset.filename }]);
    }
  };

  const handleRemoveImage = (url: string) => {
    setImageInputs((prev) => prev.filter((i) => i.url !== url));
  };

  const isKlingVideo = tab === 'video' && currentModel?.id?.startsWith('kling');
  const isSeedanceVideo = tab === 'video' && currentModel?.id?.startsWith('bytedance');
  const isVideoWithRefs = isKlingVideo || isSeedanceVideo;

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

  const handleRetry = (item: Generation) => {
    const targetTab = item.type || 'text';
    setTab(targetTab);
    const tabModels = MODELS[targetTab] || [];
    const modelIndex = tabModels.findIndex((m) => m.id === item.model);
    setSelectedModel(modelIndex >= 0 ? modelIndex : 0);
    setPrompt(item.prompt);
    if (item.params) {
      const { image_input, kling_elements, ...rest } = item.params;
      setModelParams(rest);
      if ((targetTab === 'image' || targetTab === 'video') && Array.isArray(image_input) && image_input.length > 0) {
        setImageInputs(image_input.map((url: string, i: number) => ({ url, name: `image-${i + 1}` })));
      } else {
        setImageInputs([]);
      }
      if (targetTab === 'video' && Array.isArray(kling_elements) && kling_elements.length > 0) {
        setKlingElements(kling_elements);
      } else {
        setKlingElements([]);
      }
    } else {
      setModelParams({});
      setImageInputs([]);
      setKlingElements([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteError = async (id: string) => {
    try {
      await api.delete(`/generations/${id}`);
      setGenerations((prev) => prev.filter((g) => g.id !== id));
    } catch {
      toast.error('Не удалось удалить');
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

  const handleCreatePersona = async () => {
    if (!showPersonaModal || !personaForm.name) return;
    try {
      await api.post(`/generations/${showPersonaModal.generationId}/persona`, {
        audioIndex: showPersonaModal.audioIndex,
        ...personaForm,
      });
      toast.success('Персона создана');
      setShowPersonaModal(null);
      setPersonaForm({ name: '', description: '', style: '', vocalStart: 0, vocalEnd: 30 });
      fetchPersonas();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка создания персоны');
    }
  };

  const handleDeleteAllErrors = async () => {
    if (!currentBrandId) return;
    try {
      await api.delete(`/generations/errors?brandId=${currentBrandId}`);
      setGenerations((prev) => prev.filter((g) => g.status !== 'ERROR'));
    } catch {
      toast.error('Не удалось удалить ошибки');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !currentBrandId || !currentModel) return;
    setGenerating(true);
    try {
      const resolvedParams: Record<string, string | boolean> = {};
      for (const p of currentModel.params || []) {
        resolvedParams[p.key] = getParamValue(p.key, p.default);
      }
      if ((tab === 'image' || tab === 'video') && imageInputs.length > 0) {
        resolvedParams.image_input = imageInputs.map((i) => i.url) as any;
      }
      if (tab === 'video' && klingElements.length > 0) {
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
        type: tab,
        prompt: prompt.trim(),
        params: resolvedParams,
      });
      setGenerations((prev) => [gen, ...prev]);
      prevProcessingIds.current.add(gen.id);
      setPrompt('');
      if (tab === 'image' || tab === 'video') setImageInputs([]);
      if (tab === 'video') setKlingElements([]);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка генерации');
    } finally {
      setGenerating(false);
    }
  };

  if (!currentBrandId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Выберите направление для работы с AI‑Студией
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Header */}
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            AI‑Студия
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Генерация контента через kie.ai — текст, изображения, видео, аудио.
          </p>
        </div>
        <div className="ml-auto">
          <span className="pill-status pill-draft" style={{ alignSelf: 'center' }}>
            Бюджет: $0 / $300
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-secondary rounded-xl p-[3px] self-start">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`border-0 bg-transparent font-bold text-[12.5px] px-3.5 py-2 rounded-[9px] transition-colors ${
              tab === t.key
                ? 'bg-card text-foreground shadow-card'
                : 'text-muted-foreground'
            }`}
            onClick={() => { setTab(t.key); setSelectedModel(0); setModelParams({}); setImageInputs([]); setKlingElements([]); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-[18px] items-start">
        {/* Left: Prompt + Model config */}
        <div className="flex flex-col gap-[18px]">
          {/* Prompt */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
              Промпт
            </div>
            <div className="border border-border rounded-[11px] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
              <textarea
                rows={4}
                placeholder="Опишите, что сгенерировать…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full border-0 rounded-[11px] p-3 text-[13.5px] bg-transparent resize-none outline-none"
              />
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-2">
              Бриф бренда подмешивается автоматически.
            </p>

            {/* Image inputs — for image and video tabs */}
            {(tab === 'image' || tab === 'video') && (
              <div className="mt-3">
                <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2">
                  {tab === 'video' ? 'Кадры' : 'Исходные изображения'} <span className="font-normal">(необязательно{tab === 'video' ? ', 1-й = первый кадр, 2-й = последний' : ''})</span>
                </div>

                {imageInputs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2.5">
                    {imageInputs.map((img) => (
                      <div key={img.url} className="relative group">
                        <img src={img.url} alt={img.name} className="w-[60px] h-[60px] rounded-lg object-cover border border-border" />
                        <button
                          onClick={() => handleRemoveImage(img.url)}
                          className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => { handleFileUpload(e.target.files); e.target.value = ''; }}
                  />
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
            )}

            {/* Video References (Kling elements / Seedance references) */}
            {isVideoWithRefs && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    Референсы
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {isKlingVideo ? '@имя в промпте · макс. 3' : 'изображения, видео, аудио'}
                  </span>
                </div>

                {klingElements.map((el, idx) => (
                  <div key={idx} className="border border-border rounded-xl p-3 mb-2 bg-secondary/30">
                    <div className="flex items-center gap-2 mb-2">
                      {isKlingVideo && (
                        <>
                          <span className="text-[12px] text-muted-foreground">@</span>
                          <input
                            value={el.name}
                            onChange={(e) => handleElementNameChange(idx, e.target.value)}
                            placeholder="имя_элемента"
                            className="flex-1 text-[12.5px] font-semibold bg-transparent border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-ring"
                          />
                        </>
                      )}
                      <div className="flex gap-1">
                        {(['image', 'video', 'audio'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => handleElementTypeChange(idx, t)}
                            className={`text-[10.5px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
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
                        className="text-[12px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {el.urls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {el.urls.map((u, ui) => (
                          <div key={ui} className="relative group">
                            {el.type === 'image' ? (
                              <img src={u} alt="" className="w-[48px] h-[48px] rounded-lg object-cover border border-border" />
                            ) : (
                              <div className="w-[48px] h-[48px] rounded-lg border border-border bg-secondary grid place-items-center text-[16px]">
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
                        className="text-[11px] font-semibold py-1.5 px-3 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
                      >
                        + Файл
                      </button>
                      <button
                        onClick={() => handleOpenMediaPicker({ type: 'element', idx })}
                        disabled={el.urls.length >= (el.type === 'image' ? 4 : 1)}
                        className="text-[11px] font-semibold py-1.5 px-3 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
                      >
                        Из медиатеки
                      </button>
                      <span className="text-[10px] text-muted-foreground">
                        {el.type === 'image' ? `${el.urls.length}/4 (мин. 2)` : `${el.urls.length}/1`}
                      </span>
                    </div>
                  </div>
                ))}

                {klingElements.length < 3 && (
                  <button
                    onClick={handleAddElement}
                    className="w-full text-[11.5px] font-semibold py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    + Добавить референс
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Model selector */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2.5">
              Модель
            </div>
            <div className="flex flex-col gap-2">
              {models.map((model, i) => (
                <button
                  key={model.name}
                  className={`flex items-center gap-2.5 p-[11px] rounded-[13px] border text-left transition-colors ${
                    selectedModel === i
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-secondary'
                  }`}
                  onClick={() => { setSelectedModel(i); setModelParams({}); }}
                >
                  <div
                    className="w-[24px] h-[24px] rounded-[7px] grid place-items-center text-[12px] font-extrabold shrink-0 text-white"
                    style={{ background: model.bg }}
                  >
                    {model.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold">{model.name}</span>
                    <span className="text-[11px] text-muted-foreground">{model.desc}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-[12px] font-bold">{model.price}</span>
                    <span className="text-[10px] text-muted-foreground">{model.provider}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Model params */}
            {currentModel?.params && currentModel.params.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-3.5">
                {currentModel.params.map((p) =>
                  p.type === 'toggle' ? (
                    <div key={p.key} className="flex items-center gap-2.5">
                      <button
                        className={`w-[42px] h-[24px] rounded-full border relative shrink-0 transition-colors ${
                          getParamValue(p.key, p.default) === true
                            ? 'bg-primary border-primary'
                            : 'bg-secondary border-border'
                        }`}
                        onClick={() => setParamValue(p.key, !(getParamValue(p.key, p.default) === true))}
                      >
                        <span
                          className={`absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all ${
                            getParamValue(p.key, p.default) === true
                              ? 'left-[20px] bg-primary-foreground'
                              : 'left-[2px] bg-muted-foreground'
                          }`}
                        />
                      </button>
                      <span className="text-[13px] font-semibold">{p.label}</span>
                    </div>
                  ) : p.type === 'text' ? (
                    <div key={p.key} className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">{p.label}</span>
                      <input
                        value={String(getParamValue(p.key, p.default) || '')}
                        onChange={(e) => setParamValue(p.key, e.target.value)}
                        placeholder={p.placeholder || ''}
                        className="text-[12.5px] bg-transparent border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-ring"
                      />
                    </div>
                  ) : p.type === 'multiselect' ? (
                    <div key={p.key} className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">{p.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {p.options?.map((o) => {
                          const selected = String(getParamValue(p.key, p.default) || '').split(',').filter(Boolean);
                          const isOn = selected.includes(o.value);
                          return (
                            <button
                              key={o.value}
                              className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                                isOn
                                  ? 'border-destructive bg-destructive/10 text-destructive'
                                  : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                              }`}
                              onClick={() => {
                                const next = isOn ? selected.filter((v) => v !== o.value) : [...selected, o.value];
                                setParamValue(p.key, next.join(','));
                              }}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div key={p.key} className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">{p.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {p.options?.map((o) => (
                          <button
                            key={o.value}
                            className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
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

            {/* Persona selector for Suno */}
            {tab === 'audio' && personas.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Персона</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      !modelParams.personaId
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                    }`}
                    onClick={() => { const { personaId, personaModel, ...rest } = modelParams as any; setModelParams(rest); }}
                  >
                    Без персоны
                  </button>
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        modelParams.personaId === p.sunoId
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                      }`}
                      onClick={() => setModelParams((prev) => ({ ...prev, personaId: p.sunoId, personaModel: 'style_persona' }))}
                    >
                      {p.name}{p.style ? ` · ${p.style}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              disabled={generating || !prompt.trim()}
              onClick={handleGenerate}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all disabled:opacity-50"
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

        {/* Right: Queue + Results */}
        <div className="flex flex-col gap-[18px]">
          {/* Queue */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="font-bold text-[15px]">Очередь генерации</span>
              {processingItems.length > 0 && (
                <span className="ml-auto text-[12px] text-muted-foreground">
                  {processingItems.length} в обработке
                </span>
              )}
            </div>
            {processingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-[9px] border-t border-border first:border-t-0"
              >
                <div className="w-[42px] h-[42px] rounded-xl shrink-0 overflow-hidden grid place-items-center bg-secondary">
                  <span className="w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight truncate">
                    {item.prompt.length > 50 ? item.prompt.slice(0, 50) + '…' : item.prompt}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">{item.modelName}</span>
                </div>
                <span className="pill-status pill-live">
                  <span className="pill-dot" />
                  {item.cost ? `${Math.round(item.cost)}%` : 'Обработка'}
                </span>
                <button
                  onClick={() => handleCancel(item.id)}
                  title="Отменить"
                  className="w-[28px] h-[28px] grid place-items-center rounded-lg border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            ))}
            {processingItems.length === 0 && (
              <p className="text-[13.5px] text-muted-foreground">
                Нет активных генераций
              </p>
            )}
          </div>

          {/* Results */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="font-bold text-[15px]">Результаты</span>
              {completedItems.length > 0 && (
                <span className="ml-auto text-[12.5px] text-muted-foreground">
                  {completedItems.length} готово
                </span>
              )}
            </div>
            {loadingGenerations ? (
              <div className="flex items-center justify-center py-8">
                <span className="w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : completedItems.length === 0 ? (
              <p className="text-[13.5px] text-muted-foreground">
                Пока нет результатов. Создайте первую генерацию.
              </p>
            ) : tab === 'video' ? (
              <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border rounded-[14px] overflow-hidden bg-card shrink-0"
                  >
                    {item.result && item.result.split('\n').filter(Boolean).map((url, i) => (
                      <video
                        key={i}
                        src={url}
                        controls
                        className="w-full max-h-[360px] object-contain bg-black rounded-t-[14px]"
                      />
                    ))}
                    <div className="p-2.5 flex items-center gap-2">
                      <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-secondary">
                        {item.modelName}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-1">
                        {new Date(item.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => { const urls = item.result?.split('\n').filter(Boolean) || []; urls.forEach((u, i) => handleDownload(u, `${item.modelName}-${i}.mp4`)); }}
                        title="Скачать"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button
                        onClick={() => handleRetry(item)}
                        title="Редактировать промпт"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteError(item.id)}
                        title="Удалить"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : tab === 'audio' ? (
              <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border rounded-[14px] overflow-hidden bg-card shrink-0"
                  >
                    {item.result && item.result.split('\n').filter(Boolean).map((url, i) => (
                      <div key={i} className="px-3.5 pt-3">
                        <audio src={url} controls className="w-full" />
                      </div>
                    ))}
                    <div className="p-2.5 flex items-center gap-2">
                      <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-secondary">
                        {item.modelName}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-1 truncate" title={item.prompt}>
                        {item.prompt.length > 50 ? item.prompt.slice(0, 50) + '…' : item.prompt}
                      </span>
                      <button
                        onClick={() => setShowPersonaModal({ generationId: item.id, audioIndex: 0 })}
                        title="Создать персону"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-primary/10 hover:border-primary/30 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                      </button>
                      <button
                        onClick={() => { const urls = item.result?.split('\n').filter(Boolean) || []; urls.forEach((u, i) => handleDownload(u, `${item.modelName}-${i}.mp3`)); }}
                        title="Скачать"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button
                        onClick={() => handleRetry(item)}
                        title="Редактировать промпт"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteError(item.id)}
                        title="Удалить"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : tab === 'image' ? (
              <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border rounded-[14px] overflow-hidden bg-card shrink-0"
                  >
                    {item.result && item.result.split('\n').filter(Boolean).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`Результат ${i + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                      </a>
                    ))}
                    <div className="p-2.5 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground flex-1">
                        {new Date(item.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => { const urls = item.result?.split('\n').filter(Boolean) || []; urls.forEach((u, i) => handleDownload(u, `${item.modelName}-${i}.png`)); }}
                        title="Скачать"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button
                        onClick={() => handleRetry(item)}
                        title="Редактировать промпт"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteError(item.id)}
                        title="Удалить"
                        className="w-[26px] h-[26px] grid place-items-center rounded-lg border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border rounded-[14px] overflow-hidden bg-card shrink-0"
                  >
                    <div className="p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-secondary">
                          {item.modelName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {item.tokens && (
                          <span className="text-[11px] text-muted-foreground">
                            {item.tokens} токенов
                          </span>
                        )}
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <button
                            onClick={() => handleRetry(item)}
                            title="Редактировать промпт"
                            className="w-[28px] h-[28px] grid place-items-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            onClick={() => handleDeleteError(item.id)}
                            title="Удалить"
                            className="w-[28px] h-[28px] grid place-items-center rounded-lg border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                      <div className="text-[12px] text-muted-foreground mb-2 italic">
                        {item.prompt.length > 100 ? item.prompt.slice(0, 100) + '…' : item.prompt}
                      </div>
                      <div className="text-[13px] leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {item.result}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Errors */}
          {errorItems.length > 0 && (
            <div className="bg-card border border-destructive/30 rounded-[22px] shadow-card p-[18px]">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="font-bold text-[15px] text-destructive">Ошибки</span>
                <button
                  onClick={handleDeleteAllErrors}
                  className="ml-auto text-[12px] font-semibold text-muted-foreground hover:text-destructive transition-colors"
                >
                  Очистить все
                </button>
              </div>
              {errorItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-[9px] border-t border-border first:border-t-0"
                >
                  <div className="w-[42px] h-[42px] rounded-xl shrink-0 overflow-hidden grid place-items-center bg-destructive/10 text-destructive text-[18px]">
                    ✕
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold leading-tight truncate">
                      {item.prompt.length > 50 ? item.prompt.slice(0, 50) + '…' : item.prompt}
                    </span>
                    <span className="text-[11.5px] text-destructive">{item.error || 'Неизвестная ошибка'}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {item.modelName}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRetry(item)}
                      title="Повторить"
                      className="w-[28px] h-[28px] grid place-items-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                    </button>
                    <button
                      onClick={() => handleDeleteError(item.id)}
                      title="Удалить"
                      className="w-[28px] h-[28px] grid place-items-center rounded-lg border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Media picker modal */}
      {showMediaPicker && (() => {
        const isElementPicker = mediaPickerTarget.type === 'element';
        const elIdx = isElementPicker ? (mediaPickerTarget as { type: 'element'; idx: number }).idx : -1;
        const el = isElementPicker ? klingElements[elIdx] : null;
        const isPickedFn = (url: string) => {
          if (isElementPicker && el) return el.urls.includes(url);
          return imageInputs.some((i) => i.url === url);
        };
        const isVideo = el?.type === 'video';
        const isAudio = el?.type === 'audio';
        const emptyLabel = isVideo ? 'Нет видео' : isAudio ? 'Нет аудио' : 'Нет файлов в медиатеке';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMediaPicker(false)}>
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
                  <p className="text-[13px] text-muted-foreground text-center py-8">{emptyLabel}</p>
                ) : (
                  <div className={isAudio ? 'flex flex-col gap-2' : 'grid grid-cols-4 gap-2'}>
                    {mediaAssets.map((asset) => {
                      const picked = isPickedFn(asset.url);
                      return isAudio ? (
                        <div
                          key={asset.id}
                          onClick={() => handlePickMedia(asset)}
                          className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                            picked ? 'border-primary bg-primary/5' : 'border-border hover:border-ring'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-semibold truncate">{asset.filename}</p>
                            <audio
                              src={asset.url}
                              controls
                              preload="metadata"
                              className="w-full h-8 mt-1.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {picked && <span className="text-primary text-[16px] font-bold shrink-0">✓</span>}
                        </div>
                      ) : (
                        <button
                          key={asset.id}
                          onClick={() => handlePickMedia(asset)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                            picked ? 'border-primary' : 'border-transparent hover:border-border'
                          }`}
                        >
                          {isVideo ? (
                            <video
                              src={asset.url}
                              muted
                              preload="metadata"
                              className="w-full h-full object-cover"
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

      {/* Persona creation modal */}
      {showPersonaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPersonaModal(null)}>
          <div className="bg-card border border-border rounded-[18px] shadow-lg w-[400px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-bold text-[15px]">Создать персону</span>
              <button onClick={() => setShowPersonaModal(null)} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Название *</span>
                <input
                  value={personaForm.name}
                  onChange={(e) => setPersonaForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Electronic Pop Singer"
                  className="text-[13px] border border-border rounded-lg px-3 py-2 outline-none focus:border-ring bg-transparent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Описание</span>
                <input
                  value={personaForm.description}
                  onChange={(e) => setPersonaForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Современный электронный поп-вокал"
                  className="text-[13px] border border-border rounded-lg px-3 py-2 outline-none focus:border-ring bg-transparent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Стиль</span>
                <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                  {MUSIC_STYLES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        personaForm.style === s.value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                      }`}
                      onClick={() => setPersonaForm((f) => ({ ...f, style: f.style === s.value ? '' : s.value }))}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">Начало вокала (сек)</span>
                  <input
                    type="number"
                    value={personaForm.vocalStart}
                    onChange={(e) => setPersonaForm((f) => ({ ...f, vocalStart: Number(e.target.value) }))}
                    className="text-[13px] border border-border rounded-lg px-3 py-2 outline-none focus:border-ring bg-transparent"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">Конец вокала (сек)</span>
                  <input
                    type="number"
                    value={personaForm.vocalEnd}
                    onChange={(e) => setPersonaForm((f) => ({ ...f, vocalEnd: Number(e.target.value) }))}
                    className="text-[13px] border border-border rounded-lg px-3 py-2 outline-none focus:border-ring bg-transparent"
                  />
                </div>
              </div>
              <button
                onClick={handleCreatePersona}
                disabled={!personaForm.name}
                className="w-full bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all disabled:opacity-50 mt-1"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
