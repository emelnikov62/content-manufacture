'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';

const TABS = [
  { key: 'text', label: '✎ Текст' },
  { key: 'image', label: '🖼 Изображение' },
  { key: 'video', label: '🎬 Видео' },
  { key: 'audio', label: '🎵 Аудио' },
];

const MODELS: Record<string, { icon: string; bg: string; name: string; desc: string; price: string }[]> = {
  text: [
    { icon: 'G', bg: 'var(--accent)', name: 'GPT-4o', desc: 'быстрый и точный', price: '≈$0.01' },
    { icon: 'C', bg: 'var(--feature)', name: 'Claude 4', desc: 'длинные тексты, бренд-голос', price: '≈$0.03' },
  ],
  image: [
    { icon: 'G', bg: 'var(--accent)', name: 'GPT Image 1', desc: 'точные промпты', price: '≈$0.04' },
    { icon: 'F', bg: 'var(--feature)', name: 'Flux Pro', desc: 'фотореализм', price: '≈$0.06' },
  ],
  video: [
    { icon: 'F', bg: 'var(--accent)', name: 'Veo 3 Fast · 720p', desc: 'быстро, для соцсетей', price: '≈$0.40' },
    { icon: 'K', bg: 'var(--feature)', name: 'Kling 3.0', desc: 'плавное движение', price: '≈$0.55' },
    { icon: 'V', bg: 'var(--feature)', name: 'Veo 3 Quality · 1080p', desc: 'премиум, для героев', price: '≈$2.00' },
  ],
  audio: [
    { icon: 'E', bg: 'var(--accent)', name: 'ElevenLabs', desc: 'реалистичная озвучка', price: '≈$0.05' },
    { icon: 'S', bg: 'var(--feature)', name: 'Suno v4', desc: 'музыка и джинглы', price: '≈$0.10' },
  ],
};

const QUEUE_ITEMS = [
  { name: 'Reel «Утренний вайб»', model: 'Veo 3 Fast · видео', progress: 76, status: 'live' as const },
  { name: 'Пост «Новый бленд»', model: 'GPT Image · фото', progress: 45, status: 'scheduled' as const },
];

const RESULTS = [
  { name: 'Iced latte v1', gradient: 'linear-gradient(135deg,#cda472,#6e4a28)' },
  { name: 'Iced latte v2', gradient: 'linear-gradient(135deg,#b9925f,#5e3f22)' },
  { name: 'Morning coffee v1', gradient: 'linear-gradient(135deg,#e8b27a,#b9763a)' },
  { name: 'Cold brew hero', gradient: 'linear-gradient(135deg,#c9a16f,#7c5230)' },
];

export default function StudioPage() {
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const [tab, setTab] = useState('video');
  const [selectedModel, setSelectedModel] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [preset720, setPreset720] = useState(true);
  const [watermark, setWatermark] = useState(false);

  const models = MODELS[tab] || [];
  const currentModel = models[selectedModel] || models[0];

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
            onClick={() => { setTab(t.key); setSelectedModel(0); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-[380px_1fr] gap-[18px] items-start">
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
                  onClick={() => setSelectedModel(i)}
                >
                  <div
                    className="w-[24px] h-[24px] rounded-[7px] grid place-items-center text-[12px] font-extrabold shrink-0"
                    style={{
                      background: model.bg,
                      color: model.bg === 'var(--accent)' ? 'var(--primary-foreground)' : 'var(--accent)',
                    }}
                  >
                    {model.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold">{model.name}</span>
                    <span className="text-[11px] text-muted-foreground">{model.desc}</span>
                  </div>
                  <span className="text-[12px] font-bold">{model.price}</span>
                </button>
              ))}
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-2.5 mt-3.5">
              <button
                className={`w-[42px] h-[24px] rounded-full border relative shrink-0 transition-colors ${
                  preset720
                    ? 'bg-primary border-primary'
                    : 'bg-secondary border-border'
                }`}
                onClick={() => setPreset720(!preset720)}
              >
                <span
                  className={`absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all ${
                    preset720
                      ? 'left-[20px] bg-primary-foreground'
                      : 'left-[2px] bg-muted-foreground'
                  }`}
                />
              </button>
              <span className="text-[13px] font-semibold">Пресет «720p для соцсетей»</span>
            </div>

            <div className="flex items-center gap-2.5 mt-2.5">
              <button
                className={`w-[42px] h-[24px] rounded-full border relative shrink-0 transition-colors ${
                  watermark
                    ? 'bg-primary border-primary'
                    : 'bg-secondary border-border'
                }`}
                onClick={() => setWatermark(!watermark)}
              >
                <span
                  className={`absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all ${
                    watermark
                      ? 'left-[20px] bg-primary-foreground'
                      : 'left-[2px] bg-muted-foreground'
                  }`}
                />
              </button>
              <span className="text-[13px] font-semibold">
                Вотермарка <span className="text-muted-foreground font-normal">— выключить для TikTok</span>
              </span>
            </div>

            {/* Generate button */}
            <button
              className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
            >
              ✦ Сгенерировать · {currentModel?.price || ''}
            </button>
          </div>
        </div>

        {/* Right: Queue + Results */}
        <div className="flex flex-col gap-[18px]">
          {/* Queue */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="font-bold text-[15px]">Очередь генерации</span>
            </div>
            {QUEUE_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 py-[9px] ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div
                  className="w-[42px] h-[42px] rounded-xl shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#e8b27a,#b9763a)' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">{item.name}</span>
                  <span className="text-[11.5px] text-muted-foreground">{item.model}</span>
                </div>
                <span className={`pill-status ${item.status === 'live' ? 'pill-live' : 'pill-scheduled'}`}>
                  <span className="pill-dot" />
                  {item.progress}%
                </span>
              </div>
            ))}
            {QUEUE_ITEMS.length === 0 && (
              <p className="text-[13.5px] text-muted-foreground">
                Нет активных генераций
              </p>
            )}
          </div>

          {/* Results */}
          <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="font-bold text-[15px]">Результаты</span>
              <a href="/media" className="ml-auto text-[12.5px] font-semibold text-muted-foreground hover:text-foreground">
                В библиотеку
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {RESULTS.map((r, i) => (
                <div
                  key={i}
                  className="border border-border rounded-[14px] overflow-hidden bg-card"
                >
                  <div
                    className="h-[150px] relative"
                    style={{ background: r.gradient }}
                  />
                  <div className="p-2.5 flex items-center gap-2">
                    <span className="flex-1 text-[12.5px] font-bold truncate">{r.name}</span>
                    <button className="inline-flex items-center gap-1.5 font-bold text-[12px] rounded-[10px] px-3 py-[7px] border border-border bg-card hover:bg-secondary transition-colors">
                      В пост
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
