'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { NetworkIcon } from '@/components/icons/network-icon';

const CONVERSATIONS = [
  {
    id: '1',
    name: '@maria_k',
    network: 'INSTAGRAM',
    networkIcon: '📷',
    preview: 'Подскажите, есть ли оатмилк?',
    time: '2м',
    messages: [
      { type: 'in', text: 'Привет! Подскажите, есть ли овсяное молоко? 🥛' },
      { type: 'out', text: 'Привет! Да, овсяное и миндальное есть ☕️ Добавка бесплатно по будням до 11:00' },
      { type: 'in', text: 'Супер, спасибо! Забегу утром 🙌' },
    ],
    context: { followers: '3.2K', status: 'Клиент' },
    windowOpen: true,
    windowTime: '23 ч',
  },
  {
    id: '2',
    name: 'Дмитрий',
    network: 'TELEGRAM',
    networkIcon: '✈️',
    preview: 'Когда открываетесь в воскр?',
    time: '15м',
    messages: [
      { type: 'in', text: 'Привет, когда открываетесь в воскресенье?' },
      { type: 'out', text: 'В 10:00 как обычно! Ждём 😊' },
    ],
    context: { followers: '—', status: 'Подписчик' },
    windowOpen: false,
    windowTime: '',
  },
  {
    id: '3',
    name: 'Anna L.',
    network: 'FACEBOOK',
    networkIcon: '📘',
    preview: 'Гайд по латте‑арту 🙏',
    time: '1ч',
    messages: [
      { type: 'in', text: 'Привет! Можно гайд по латте‑арту? 🙏' },
    ],
    context: { followers: '580', status: 'Новый' },
    windowOpen: true,
    windowTime: '6 ч',
  },
  {
    id: '4',
    name: '@coffee_fan',
    network: 'INSTAGRAM',
    networkIcon: '📷',
    preview: 'Это новый бленд?',
    time: '2ч',
    messages: [
      { type: 'in', text: 'Это новый бленд? Выглядит интересно!' },
    ],
    context: { followers: '12.1K', status: 'Клиент' },
    windowOpen: true,
    windowTime: '22 ч',
  },
];

const NETWORK_COLORS: Record<string, string> = {
  INSTAGRAM: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)',
  TELEGRAM: '#2AABEE', FACEBOOK: '#1877F2',
  TIKTOK: '#111315', THREADS: '#111315', TWITTER: '#111315',
};

export default function MessagesPage() {
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const [selectedId, setSelectedId] = useState(CONVERSATIONS[0].id);
  const [replyText, setReplyText] = useState('');

  const selected = CONVERSATIONS.find((c) => c.id === selectedId) || CONVERSATIONS[0];

  if (!currentBrandId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Выберите направление для просмотра сообщений
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Сообщения
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Комментарии и личные сообщения со всех сетей.
          </p>
        </div>
      </div>

      {/* Three-panel inbox */}
      <div
        className="grid border border-border rounded-[22px] overflow-hidden bg-card max-md:grid-cols-1 md:grid-cols-[300px_1fr_260px]"
        style={{ minHeight: 560 }}
      >
        {/* Left: conversations list */}
        <div className="flex flex-col min-w-0">
          <div className="p-3 border-b border-border">
            <div className="border border-border rounded-[11px] flex items-center gap-2.5 px-3 py-2 focus-within:border-ring">
              <span className="text-muted-foreground text-[13px]">⌕</span>
              <input
                placeholder="Поиск…"
                className="border-0 outline-none bg-transparent flex-1 text-[13.5px]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {CONVERSATIONS.map((conv) => (
              <div
                key={conv.id}
                className={`flex gap-2.5 py-[13px] px-3.5 border-b border-border cursor-pointer transition-colors ${
                  selectedId === conv.id ? 'bg-secondary' : 'hover:bg-secondary/50'
                }`}
                onClick={() => setSelectedId(conv.id)}
              >
                <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-amber-400 to-amber-800 shrink-0 relative">
                  <span
                    className="absolute -right-1 -bottom-1 w-[16px] h-[16px] rounded-[5px] grid place-items-center text-white text-[9px] font-extrabold"
                    style={{ background: NETWORK_COLORS[conv.network] || '#333' }}
                  >
                    <NetworkIcon network={conv.network} className="w-[10px] h-[10px]" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold">{conv.name}</span>
                  <span className="block text-[11.5px] text-muted-foreground truncate">
                    {conv.preview}
                  </span>
                </div>
                <span className="text-[10.5px] text-muted-foreground shrink-0">{conv.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: thread */}
        <div className="flex flex-col min-w-0 border-l border-border">
          {selected.windowOpen && (
            <div className="text-[11.5px] text-success py-1.5 px-3.5 border-b border-border" style={{ background: 'color-mix(in srgb, var(--success) 12%, var(--card))' }}>
              ● Окно ответа открыто ({selected.network === 'INSTAGRAM' ? 'Instagram' : selected.network}, осталось {selected.windowTime})
            </div>
          )}
          <div className="flex-1 p-[18px] flex flex-col gap-2.5 overflow-auto">
            {selected.messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[70%] px-[13px] py-[9px] rounded-[14px] text-[13px] ${
                  msg.type === 'in'
                    ? 'bg-secondary self-start rounded-bl-[4px]'
                    : 'bg-primary text-primary-foreground self-end rounded-br-[4px]'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3 flex gap-2 items-center">
            <div className="flex-1 border border-border rounded-[11px] flex items-center px-3 py-2 focus-within:border-ring">
              <input
                placeholder="Ответить…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="border-0 outline-none bg-transparent flex-1 text-[13.5px]"
              />
            </div>
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all">
              Отправить
            </button>
          </div>
        </div>

        {/* Right: context panel */}
        <div className="hidden md:block border-l border-border p-[18px]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-800 mb-2.5" />
          <div className="font-bold text-[14px]">{selected.name}</div>
          <div className="text-[12px] text-muted-foreground mb-3.5">
            {selected.network === 'INSTAGRAM' ? 'Instagram' : selected.network} · подписан(а)
          </div>
          <div className="flex items-center py-2.5 border-t border-border">
            <span className="flex-1 text-[11.5px] text-muted-foreground">Подписчиков</span>
            <span className="font-bold text-[13px]">{selected.context.followers}</span>
          </div>
          <div className="flex items-center py-2.5 border-t border-border">
            <span className="flex-1 text-[11.5px] text-muted-foreground">Статус</span>
            <span className="pill-status pill-published text-[11px]">
              <span className="pill-dot" />
              {selected.context.status}
            </span>
          </div>
          <button className="w-full mt-3.5 inline-flex items-center justify-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors">
            Передать человеку
          </button>
        </div>
      </div>
    </div>
  );
}
