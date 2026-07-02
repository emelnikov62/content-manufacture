'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Unlink,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Loader2,
  Hash,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { NetworkIcon } from '@/components/icons/network-icon';

const NETWORKS = [
  { value: 'TELEGRAM', label: 'Telegram', color: '#2AABEE', connect: 'token' as const },
  { value: 'INSTAGRAM', label: 'Instagram', color: '#E4405F', connect: 'oauth' as const },
  { value: 'TIKTOK', label: 'TikTok', color: '#111315', connect: 'oauth' as const },
  { value: 'THREADS', label: 'Threads', color: '#111315', soon: true },
  { value: 'FACEBOOK', label: 'Facebook', color: '#1877F2', soon: true },
  { value: 'TWITTER', label: 'X (Twitter)', color: '#111315', connect: 'oauth' as const },
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

interface Placement {
  id: string;
  name: string;
  username?: string;
  type?: string;
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const currentBrandId = useAppStore((s) => s.currentBrandId);

  // Connect modal state
  const [showConnect, setShowConnect] = useState(false);
  const [connectStep, setConnectStep] = useState<'network' | 'token' | 'oauth' | 'connecting' | 'done'>('network');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [botToken, setBotToken] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connectedAccount, setConnectedAccount] = useState<Account | null>(null);

  // Placements state
  const [placementsAccountId, setPlacementsAccountId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loadingPlacements, setLoadingPlacements] = useState(false);

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts', currentBrandId],
    queryFn: () => api.get(`/accounts?brandId=${currentBrandId}`),
    enabled: !!currentBrandId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Аккаунт отключён');
    },
  });

  const openConnect = () => {
    setShowConnect(true);
    setConnectStep('network');
    setSelectedNetwork('');
    setBotToken('');
    setConnectError('');
    setConnectedAccount(null);
  };

  const handleConnectTelegram = async () => {
    if (!botToken.trim() || !currentBrandId) return;
    setConnectStep('connecting');
    setConnectError('');
    try {
      const res = await api.post<{ account: Account }>('/accounts/connect/telegram', {
        brandId: currentBrandId,
        botToken: botToken.trim(),
      });
      setConnectedAccount(res.account);
      setConnectStep('done');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Telegram бот подключён!');
    } catch (err: any) {
      setConnectError(err?.message || 'Ошибка подключения');
      setConnectStep('token');
    }
  };

  const handleConnectOAuth = async (platform: string) => {
    setSelectedNetwork(platform);
    setConnectStep('oauth');
    setConnectError('');
    try {
      const redirectUrl = `${window.location.origin}/accounts`;
      const res = await api.post<{ url: string }>('/accounts/connect/oauth', {
        platform,
        redirectUrl,
      });
      window.open(res.url, '_blank', 'width=600,height=700');
    } catch (err: any) {
      setConnectError(err?.message || 'Ошибка получения ссылки авторизации');
      setConnectStep('network');
    }
  };

  const handleOAuthComplete = async () => {
    if (!currentBrandId || !selectedNetwork) return;
    setConnectStep('connecting');
    setConnectError('');
    try {
      const res = await api.post<{ account: Account }>('/accounts/connect/oauth/complete', {
        brandId: currentBrandId,
        platform: selectedNetwork,
      });
      setConnectedAccount(res.account);
      setConnectStep('done');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      const net = NETWORKS.find((n) => n.value === selectedNetwork);
      toast.success(`${net?.label ?? selectedNetwork} подключён!`);
    } catch (err: any) {
      setConnectError(err?.message || 'Профиль не найден. Попробуйте снова.');
      setConnectStep('oauth');
    }
  };

  const loadPlacements = async (accountId: string) => {
    setPlacementsAccountId(accountId);
    setLoadingPlacements(true);
    setPlacements([]);
    try {
      const res = await api.get<Placement[]>(`/accounts/${accountId}/placements`);
      setPlacements(Array.isArray(res) ? res : []);
    } catch {
      toast.error('Не удалось загрузить каналы');
    } finally {
      setLoadingPlacements(false);
    }
  };

  if (!currentBrandId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Выберите направление для управления аккаунтами
      </div>
    );
  }

  const connectedNetworks = ['TELEGRAM', 'INSTAGRAM', 'TIKTOK', 'TWITTER'] as const;
  const accountsByNetwork = connectedNetworks.map((net) => ({
    network: NETWORKS.find((n) => n.value === net)!,
    accounts: accounts.filter((a) => a.network === net),
  }));
  const otherAccounts = accounts.filter((a) => !connectedNetworks.includes(a.network as any));

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Header */}
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
            onClick={openConnect}
          >
            <Plus className="h-4 w-4" />
            Подключить
          </button>
        </div>
      </div>

      {/* Network sections */}
      {accountsByNetwork.map(({ network: net, accounts: netAccounts }) => (
        <div key={net.value} className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-[32px] h-[32px] rounded-lg grid place-items-center text-white text-[14px]" style={{ background: net.color }}>
              <NetworkIcon network={net.value} className="w-[18px] h-[18px]" />
            </div>
            <span className="font-bold text-[15px]">{net.label}</span>
            <span className="text-[11px] text-muted-foreground">
              {net.connect === 'token' ? 'BYO-бот через PostProxy' : 'OAuth через PostProxy'}
            </span>
          </div>

          {netAccounts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <NetworkIcon network={net.value} className="w-10 h-10 text-muted-foreground" />
              <p className="text-[13.5px] text-muted-foreground text-center">
                Нет подключённых аккаунтов {net.label}
              </p>
              <button
                className="inline-flex items-center gap-2 text-white font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-90 transition-all"
                style={{ background: net.color }}
                onClick={() => {
                  openConnect();
                  setSelectedNetwork(net.value);
                  if (net.connect === 'oauth') {
                    handleConnectOAuth(net.value);
                  } else {
                    setConnectStep('token');
                  }
                }}
              >
                <Plus className="h-4 w-4" />
                Подключить
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {netAccounts.map((acc) => {
                const cfg = STATUS_CONFIG[acc.status] || STATUS_CONFIG.DISCONNECTED;
                const isExpanded = placementsAccountId === acc.id;
                return (
                  <div key={acc.id} className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-[28px] h-[28px] rounded-lg grid place-items-center text-white text-[12px] shrink-0" style={{ background: net.color }}>
                        <NetworkIcon network={net.value} className="w-[18px] h-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[13.5px]">@{acc.handle}</span>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Profile: {acc.postproxyProfileId}
                        </p>
                      </div>
                      <span className={`pill-status ${cfg.pill}`}>
                        <span className="pill-dot" />
                        {cfg.label}
                      </span>
                      {net.value === 'TELEGRAM' && (
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => isExpanded ? setPlacementsAccountId(null) : loadPlacements(acc.id)}
                          title="Каналы"
                        >
                          <Hash className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => {
                          if (confirm('Отключить этот аккаунт?')) deleteMutation.mutate(acc.id);
                        }}
                        title="Отключить"
                      >
                        <Unlink className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Placements / channels (Telegram only) */}
                    {isExpanded && net.value === 'TELEGRAM' && (
                      <div className="border-t border-border px-4 py-3 bg-secondary/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[12px] font-bold text-muted-foreground">Каналы</span>
                          <button
                            onClick={() => loadPlacements(acc.id)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Обновить"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingPlacements ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                        {loadingPlacements ? (
                          <div className="flex items-center gap-2 py-3 text-[12px] text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Загрузка…
                          </div>
                        ) : placements.length === 0 ? (
                          <p className="text-[12px] text-muted-foreground py-2">
                            Нет каналов. Добавьте бота как администратора в канал и обновите список.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {placements.map((p) => (
                              <div key={p.id} className="flex items-center gap-2.5 bg-card rounded-lg px-3 py-2 border border-border">
                                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[12.5px] font-semibold">{p.name || p.username || p.id}</span>
                                <span className="text-[11px] text-muted-foreground ml-auto font-mono">{p.id}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Other networks */}
      {otherAccounts.length > 0 && (
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
          <span className="font-bold text-[15px] mb-3 block">Другие сети</span>
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {otherAccounts.map((acc) => {
                const net = NETWORKS.find((n) => n.value === acc.network);
                const cfg = STATUS_CONFIG[acc.status] || STATUS_CONFIG.DISCONNECTED;
                return (
                  <tr key={acc.id} className="hover:bg-secondary transition-colors">
                    <td className="py-[13px] px-3 border-t border-border">
                      <div className="flex items-center gap-[11px]">
                        <div className="w-[28px] h-[28px] rounded-lg grid place-items-center text-white text-[12px] font-bold shrink-0" style={{ background: net?.color || '#333' }}>
                          <NetworkIcon network={acc.network} className="w-[14px] h-[14px]" />
                        </div>
                        <span className="font-semibold">@{acc.handle}</span>
                      </div>
                    </td>
                    <td className="py-[13px] px-3 border-t border-border text-muted-foreground">{net?.label}</td>
                    <td className="py-[13px] px-3 border-t border-border">
                      <span className={`pill-status ${cfg.pill}`}>
                        <span className="pill-dot" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-[13px] px-3 border-t border-border text-right">
                      <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => deleteMutation.mutate(acc.id)}>
                        <Unlink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Coming soon */}
      <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
        <span className="font-bold text-[15px] mb-3 block">Скоро</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {NETWORKS.filter((n) => n.soon).map((n) => (
            <div key={n.value} className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-3 opacity-50">
              <div className="w-[28px] h-[28px] rounded-lg grid place-items-center text-white text-[12px]" style={{ background: n.color }}>
                <NetworkIcon network={n.value} className="w-[14px] h-[14px]" />
              </div>
              <span className="text-[12.5px] font-semibold">{n.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connect modal */}
      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConnect(false)}>
          <div className="bg-card border border-border rounded-[22px] shadow-lg w-[440px] max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <span className="font-bold text-[15px]">
                {connectStep === 'network' ? 'Выберите сеть' :
                 connectStep === 'oauth' ? `Подключить ${NETWORKS.find((n) => n.value === selectedNetwork)?.label ?? ''}` :
                 connectStep === 'token' ? 'Подключить Telegram' :
                 connectStep === 'done' ? 'Готово' : 'Подключение…'}
              </span>
              <button onClick={() => setShowConnect(false)} className="ml-auto text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>

            <div className="p-5">
              {/* Step: select network */}
              {connectStep === 'network' && (
                <div className="flex flex-col gap-2">
                  {NETWORKS.map((n) => {
                    const alreadyConnected = accounts.some((a) => a.network === n.value);
                    const isDisabled = !!n.soon || alreadyConnected;
                    return (
                      <button
                        key={n.value}
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          setSelectedNetwork(n.value);
                          if (n.connect === 'oauth') {
                            handleConnectOAuth(n.value);
                          } else {
                            setConnectStep('token');
                          }
                        }}
                        className={`flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors ${
                          isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-secondary'
                        }`}
                      >
                        <div className="w-[32px] h-[32px] rounded-lg grid place-items-center text-white text-[14px]" style={{ background: n.color }}>
                          <NetworkIcon network={n.value} className="w-[14px] h-[14px]" />
                        </div>
                        <span className="font-semibold text-[13.5px]">{n.label}</span>
                        {n.soon && <span className="ml-auto text-[11px] text-muted-foreground">Скоро</span>}
                        {alreadyConnected && <span className="ml-auto text-[11px] text-muted-foreground">Подключено</span>}
                        {!n.soon && !alreadyConnected && n.connect === 'token' && <span className="ml-auto text-[11px] text-muted-foreground">BYO-бот</span>}
                        {!n.soon && !alreadyConnected && n.connect === 'oauth' && <span className="ml-auto text-[11px] text-muted-foreground">OAuth</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step: enter bot token */}
              {connectStep === 'token' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-secondary/50 rounded-xl px-4 py-3">
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">1.</strong> Откройте <a href="https://t.me/BotFather" target="_blank" rel="noopener" className="text-[#2AABEE] font-semibold hover:underline">@BotFather</a> в Telegram<br />
                      <strong className="text-foreground">2.</strong> Создайте бота командой <code className="bg-card px-1.5 py-0.5 rounded text-[11px] font-mono">/newbot</code><br />
                      <strong className="text-foreground">3.</strong> Скопируйте токен и вставьте ниже<br />
                      <strong className="text-foreground">4.</strong> Добавьте бота как администратора в нужные каналы
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">Токен бота</span>
                    <input
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="text-[13px] border border-border rounded-lg px-3 py-2.5 outline-none focus:border-ring bg-transparent font-mono"
                      autoFocus
                    />
                  </div>
                  {connectError && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                      <p className="text-[12px] text-destructive">{connectError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleConnectTelegram}
                    disabled={!botToken.trim()}
                    className="w-full bg-[#2AABEE] text-white font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-90 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Подключить
                  </button>
                </div>
              )}

              {/* Step: OAuth waiting */}
              {connectStep === 'oauth' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-[56px] h-[56px] rounded-2xl grid place-items-center" style={{ background: `${NETWORKS.find((n) => n.value === selectedNetwork)?.color}15` }}>
                      <NetworkIcon network={selectedNetwork} className="w-8 h-8" />
                    </div>
                    <p className="text-[13.5px] text-center text-muted-foreground">
                      Откроется окно авторизации PostProxy.<br />
                      Войдите в аккаунт и подтвердите доступ.
                    </p>
                  </div>
                  {connectError && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                      <p className="text-[12px] text-destructive">{connectError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleOAuthComplete}
                    className="w-full bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all inline-flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Я авторизовался
                  </button>
                  <button
                    onClick={() => handleConnectOAuth(selectedNetwork)}
                    className="w-full text-[13px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Открыть окно снова
                  </button>
                </div>
              )}

              {/* Step: connecting */}
              {connectStep === 'connecting' && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#2AABEE]" />
                  <p className="text-[13px] text-muted-foreground">Подключаем бота через PostProxy…</p>
                </div>
              )}

              {/* Step: done */}
              {connectStep === 'done' && connectedAccount && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-[56px] h-[56px] rounded-2xl grid place-items-center" style={{ background: `${NETWORKS.find((n) => n.value === connectedAccount.network)?.color ?? '#333'}15` }}>
                    <CheckCircle2 className="h-8 w-8" style={{ color: NETWORKS.find((n) => n.value === connectedAccount.network)?.color }} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[15px]">Аккаунт подключён!</p>
                    <p className="text-[13px] text-muted-foreground mt-1">@{connectedAccount.handle}</p>
                  </div>
                  {connectedAccount.network === 'TELEGRAM' && (
                    <div className="bg-secondary/50 rounded-xl px-4 py-3 w-full">
                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        Теперь добавьте бота как <strong className="text-foreground">администратора</strong> в нужные Telegram-каналы.
                        После этого каналы появятся в списке плейсментов.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => setShowConnect(false)}
                    className="w-full bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
                  >
                    Готово
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
    </div>
  );
}
