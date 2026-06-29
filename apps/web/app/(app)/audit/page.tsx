'use client';

import { useQuery } from '@tanstack/react-query';
import { ClipboardList, User, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';

const ACTION_LABELS: Record<string, string> = {
  'brand.create': 'Создание направления',
  'brand.update': 'Обновление направления',
  'brand.delete': 'Удаление направления',
  'account.create': 'Подключение аккаунта',
  'account.delete': 'Отключение аккаунта',
  'post.create': 'Создание поста',
  'post.update': 'Обновление поста',
  'post.delete': 'Удаление поста',
  'post.publish': 'Публикация поста',
  'asset.upload': 'Загрузка файла',
  'asset.delete': 'Удаление файла',
  'member.add': 'Добавление участника',
  'member.remove': 'Удаление участника',
};

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export default function AuditPage() {
  const currentBrandId = useAppStore((s) => s.currentBrandId);

  const { data: entries = [] } = useQuery<AuditEntry[]>({
    queryKey: ['audit', currentBrandId],
    queryFn: () => {
      const params = currentBrandId ? `?brandId=${currentBrandId}&limit=100` : '?limit=100';
      return api.get(`/audit${params}`);
    },
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Журнал действий
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            {currentBrandId ? 'Действия в направлении' : 'Все действия'}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-[13.5px]">
              Действия появятся здесь по мере работы с приложением
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 py-[11px] ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="w-[34px] h-[34px] rounded-full bg-secondary grid place-items-center shrink-0">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px]">
                    <span className="font-bold">{entry.user.name || entry.user.email}</span>
                    {' — '}
                    {ACTION_LABELS[entry.action] || entry.action}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString('ru')}
                    </span>
                    <span className="pill-status pill-draft text-[10px]">
                      {entry.entity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
