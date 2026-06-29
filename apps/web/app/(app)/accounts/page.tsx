'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Unlink,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const NETWORKS = [
  { value: 'INSTAGRAM', label: 'Instagram', icon: '📷', color: '#E4405F' },
  { value: 'TIKTOK', label: 'TikTok', icon: '🎵', color: '#111315' },
  { value: 'TELEGRAM', label: 'Telegram', icon: '✈️', color: '#2AABEE' },
  { value: 'THREADS', label: 'Threads', icon: '🧵', color: '#111315' },
  { value: 'FACEBOOK', label: 'Facebook', icon: '📘', color: '#1877F2' },
  { value: 'TWITTER', label: 'X (Twitter)', icon: '𝕏', color: '#111315' },
];

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; pill: string }> = {
  CONNECTED: { icon: CheckCircle2, label: 'Подключено', pill: 'pill-published' },
  TOKEN_EXPIRING: { icon: Clock, label: 'Истекает токен', pill: 'pill-live' },
  ERROR: { icon: XCircle, label: 'Ошибка', pill: 'pill-error' },
  DISCONNECTED: { icon: Unlink, label: 'Отключено', pill: 'pill-draft' },
};

interface Account {
  id: string;
  brandId: string;
  network: string;
  handle: string;
  status: string;
  statusMessage: string | null;
  postproxyProfileId: string;
  tokenExpiresAt: string | null;
  dailyPostLimit: number;
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const [addOpen, setAddOpen] = useState(false);
  const [newNetwork, setNewNetwork] = useState('INSTAGRAM');
  const [newHandle, setNewHandle] = useState('');
  const [newProfileId, setNewProfileId] = useState('');

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts', currentBrandId],
    queryFn: () => api.get(`/accounts?brandId=${currentBrandId}`),
    enabled: !!currentBrandId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setAddOpen(false);
      setNewHandle('');
      setNewProfileId('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  if (!currentBrandId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Выберите направление для управления аккаунтами
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Аккаунты
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Подключённые аккаунты соцсетей
          </p>
        </div>
        <div className="ml-auto">
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Подключить
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Аккаунт
              </th>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Сеть
              </th>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Статус
              </th>
              <th className="text-right text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => {
              const net = NETWORKS.find((n) => n.value === acc.network);
              const cfg = STATUS_CONFIG[acc.status] || STATUS_CONFIG.DISCONNECTED;
              return (
                <tr key={acc.id} className="hover:bg-secondary transition-colors">
                  <td className="py-[13px] px-3 border-t border-border">
                    <div className="flex items-center gap-[11px]">
                      <div
                        className="w-[28px] h-[28px] rounded-lg grid place-items-center text-white text-[12px] font-bold shrink-0"
                        style={{ background: net?.color || '#333' }}
                      >
                        {net?.icon}
                      </div>
                      <span className="font-semibold">@{acc.handle}</span>
                    </div>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border text-muted-foreground">
                    {net?.label}
                  </td>
                  <td className="py-[13px] px-3 border-t border-border">
                    <span className={`pill-status ${cfg.pill}`}>
                      <span className="pill-dot" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border text-right">
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => deleteMutation.mutate(acc.id)}
                    >
                      <Unlink className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {accounts.length === 0 && (
          <p className="text-[13.5px] text-muted-foreground py-6 text-center">
            Нет подключённых аккаунтов.
          </p>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подключить аккаунт</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                brandId: currentBrandId,
                network: newNetwork,
                handle: newHandle,
                postproxyProfileId: newProfileId,
              });
            }}
            className="flex flex-col gap-4"
          >
            <Select value={newNetwork} onValueChange={(v) => v && setNewNetwork(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.map((n) => (
                  <SelectItem key={n.value} value={n.value}>
                    {n.icon} {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Хэндл (@username)"
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              required
            />
            <Input
              placeholder="Postproxy Profile ID"
              value={newProfileId}
              onChange={(e) => setNewProfileId(e.target.value)}
              required
            />
            <Button type="submit" disabled={createMutation.isPending}>
              Подключить
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
