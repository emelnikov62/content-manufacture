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

const TEXT_MODELS = [
  { id: 'gpt-5.5', icon: 'G', bg: '#10a37f', name: 'GPT-5.5', desc: 'копирайтинг, SMM, адаптация', price: '~$0.02', provider: 'OpenAI' },
  { id: 'claude-sonnet-4-6', icon: 'C', bg: '#d97706', name: 'Claude Sonnet 4.6', desc: 'длинные тексты, бренд-голос', price: '~$0.02', provider: 'Anthropic' },
  { id: 'gemini-3-5-flash', icon: 'G', bg: '#4285f4', name: 'Gemini 3.5 Flash', desc: 'быстрый, большой контекст', price: '~$0.01', provider: 'Google' },
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

interface TextGenerationSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (text: string) => void;
}

export function TextGenerationSidebar({ open, onOpenChange, onInsert }: TextGenerationSidebarProps) {
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const addNotification = useAppStore((s) => s.addNotification);
  const [tab, setTab] = useState<'generate' | 'results'>('generate');
  const [selectedModel, setSelectedModel] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const prevProcessingIds = useRef(new Set<string>());

  const currentModel = TEXT_MODELS[selectedModel];
  const allProcessing = generations.filter((g) => g.status === 'PROCESSING' || g.status === 'PENDING');
  const processingItems = allProcessing.filter((g) => g.type === 'text');
  const completedItems = generations.filter((g) => g.status === 'COMPLETED' && g.type === 'text');
  const resultsCount = processingItems.length + completedItems.length;

  const fetchGenerations = useCallback(async () => {
    if (!currentBrandId) return;
    try {
      const data = await api.get<Generation[]>(`/generations?brandId=${currentBrandId}&limit=50`);
      const prevIds = prevProcessingIds.current;
      for (const gen of data) {
        if (gen.type !== 'text') continue;
        if (prevIds.has(gen.id) && gen.status === 'COMPLETED') {
          addNotification({
            type: 'success',
            title: 'Текст готов',
            message: `${gen.modelName}: ${gen.prompt.length > 80 ? gen.prompt.slice(0, 80) + '…' : gen.prompt}`,
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

  const handleGenerate = async () => {
    if (!prompt.trim() || !currentBrandId || !currentModel) return;
    setGenerating(true);
    try {
      const gen = await api.post<Generation>('/generations', {
        brandId: currentBrandId,
        model: currentModel.id,
        modelName: currentModel.name,
        provider: currentModel.provider,
        type: 'text',
        prompt: prompt.trim(),
        params: {},
      });
      setGenerations((prev) => [gen, ...prev]);
      prevProcessingIds.current.add(gen.id);
      setPrompt('');
      setTab('results');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка генерации');
    } finally {
      setGenerating(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.delete(`/generations/${id}`);
      setGenerations((prev) => prev.filter((g) => g.id !== id));
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[440px] overflow-hidden p-0 flex flex-col">
        {/* Header + tabs */}
        <div className="shrink-0 px-5 pt-5 pb-0">
          <SheetHeader className="p-0 mb-3">
            <SheetTitle className="text-[18px] font-extrabold">✦ Генерация текста</SheetTitle>
            <SheetDescription className="text-[12.5px]">
              Бриф бренда подмешивается автоматически.
            </SheetDescription>
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
            {/* Prompt — takes remaining space */}
            <div className="flex-1 flex flex-col px-5 pt-4 pb-3 min-h-0">
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2">
                Промпт
              </div>
              <div className="flex-1 border border-border rounded-[11px] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
                <textarea
                  placeholder="Опишите, что сгенерировать…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                  className="w-full h-full border-0 rounded-[11px] p-3 text-[13.5px] bg-transparent resize-none outline-none"
                />
              </div>
            </div>

            {/* Bottom: model + button */}
            <div className="shrink-0 px-5 pb-4 flex flex-col gap-3 border-t border-border pt-3">
              <div>
                <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-2">
                  Модель
                </div>
                <div className="flex flex-col gap-1.5">
                  {TEXT_MODELS.map((model, i) => (
                    <button
                      key={model.id}
                      className={`flex items-center gap-2.5 p-[9px] rounded-[11px] border text-left transition-colors ${
                        selectedModel === i
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-secondary'
                      }`}
                      onClick={() => setSelectedModel(i)}
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
                      <span className="text-[11px] font-bold shrink-0">{model.price}</span>
                    </button>
                  ))}
                </div>
              </div>

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
                      <span className="text-[12.5px] flex-1 truncate">{item.prompt.length > 40 ? item.prompt.slice(0, 40) + '…' : item.prompt}</span>
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
                completedItems.map((item) => (
                  <div key={item.id} className="border border-border rounded-[14px] bg-card">
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-secondary">
                          {item.modelName}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {item.tokens && (
                          <span className="text-[10.5px] text-muted-foreground">
                            {item.tokens} ток.
                          </span>
                        )}
                      </div>

                      <div className="text-[11.5px] text-muted-foreground mb-3 italic leading-snug">
                        {item.prompt}
                      </div>

                      <div className="border-t border-border mb-3" />

                      <div className="text-[13px] leading-[1.65] whitespace-pre-wrap mb-3">
                        {item.result}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { if (item.result) { onInsert(item.result); onOpenChange(false); } }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-bold text-[12px] rounded-lg px-3 py-2 hover:brightness-95 transition-all"
                        >
                          Вставить в пост
                        </button>
                        <button
                          onClick={() => { if (item.result) { navigator.clipboard.writeText(item.result); toast.success('Скопировано'); } }}
                          title="Копировать"
                          className="w-[32px] h-[32px] grid place-items-center rounded-lg border border-border hover:bg-secondary transition-colors shrink-0"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
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
                ))
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
