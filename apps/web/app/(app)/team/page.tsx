'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Crown, Eye, Pencil, Shield } from 'lucide-react';
import { toast } from 'sonner';
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

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield }> = {
  OWNER: { label: 'Владелец', icon: Crown },
  MANAGER: { label: 'Менеджер', icon: Shield },
  EDITOR: { label: 'Контентщик', icon: Pencil },
  VIEWER: { label: 'Аналитик', icon: Eye },
};

interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [editRole, setEditRole] = useState('EDITOR');

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['team', currentBrandId],
    queryFn: () => api.get(`/brands/${currentBrandId}/members`),
    enabled: !!currentBrandId,
  });

  const addMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post(`/brands/${currentBrandId}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setInviteOpen(false);
      setEmail('');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.patch(`/brands/${currentBrandId}/members/${memberId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setEditMember(null);
      toast.success('Роль обновлена');
    },
    onError: () => toast.error('Не удалось обновить роль'),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/brands/${currentBrandId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setDeleteId(null);
      toast.success('Участник удалён');
    },
    onError: () => toast.error('Не удалось удалить участника'),
  });

  if (!currentBrandId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Выберите направление для управления командой
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Команда
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            {members.length} участников
          </p>
        </div>
        <div className="ml-auto">
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Добавить
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px] overflow-x-auto">
        <table className="w-full border-collapse text-[13px] min-w-[500px]">
          <thead>
            <tr>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Участник
              </th>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Email
              </th>
              <th className="text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Роль
              </th>
              <th className="text-right text-[11px] font-bold tracking-wide text-muted-foreground uppercase pb-3 px-3">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.VIEWER;
              return (
                <tr key={member.id} className="hover:bg-secondary transition-colors">
                  <td className="py-[13px] px-3 border-t border-border">
                    <div className="flex items-center gap-[11px]">
                      <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-amber-400 to-amber-800 grid place-items-center text-white text-[12px] font-bold shrink-0">
                        {member.name?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold">{member.name || member.email}</span>
                    </div>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border text-muted-foreground">
                    {member.email}
                  </td>
                  <td className="py-[13px] px-3 border-t border-border">
                    <span className="pill-status pill-scheduled">
                      <cfg.icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-[13px] px-3 border-t border-border text-right">
                    {member.role !== 'OWNER' && (
                      <div className="flex gap-1.5 justify-end">
                        <button
                          className="h-8 w-8 rounded-lg hover:bg-foreground/10 flex items-center justify-center transition-colors"
                          title="Редактировать"
                          onClick={() => { setEditMember(member); setEditRole(member.role); }}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                          title="Удалить"
                          onClick={() => setDeleteId(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="text-[13.5px] text-muted-foreground py-6 text-center">
            Пока нет участников. Добавьте первого.
          </p>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить участника</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate({ email, role });
            }}
            className="flex flex-col gap-4"
          >
            <Input
              type="email"
              placeholder="Email пользователя"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">Менеджер</SelectItem>
                <SelectItem value="EDITOR">Контентщик</SelectItem>
                <SelectItem value="VIEWER">Аналитик</SelectItem>
              </SelectContent>
            </Select>
            {addMutation.isError && (
              <p className="text-[13px] text-destructive">
                Пользователь не найден. Он должен сначала зарегистрироваться.
              </p>
            )}
            <Button type="submit" disabled={addMutation.isPending}>
              Добавить
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить роль</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-amber-400 to-amber-800 grid place-items-center text-white text-[12px] font-bold shrink-0">
                {editMember?.name?.charAt(0)?.toUpperCase() || editMember?.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-semibold text-[13px]">{editMember?.name || editMember?.email}</span>
                <span className="block text-[12px] text-muted-foreground">{editMember?.email}</span>
              </div>
            </div>
            <Select value={editRole} onValueChange={(v) => v && setEditRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">Менеджер</SelectItem>
                <SelectItem value="EDITOR">Контентщик</SelectItem>
                <SelectItem value="VIEWER">Аналитик</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => editMember && updateRoleMutation.mutate({ memberId: editMember.id, role: editRole })}
              disabled={updateRoleMutation.isPending || editRole === editMember?.role}
            >
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить участника?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            Участник потеряет доступ к этому направлению. Это действие можно отменить, добавив его снова.
          </p>
          <div className="flex gap-2.5 mt-2">
            <button
              className="flex-1 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors"
              onClick={() => setDeleteId(null)}
            >
              Отмена
            </button>
            <button
              className="flex-1 font-bold text-[13px] rounded-xl px-4 py-2.5 bg-destructive text-destructive-foreground hover:brightness-90 transition-all"
              onClick={() => { if (deleteId) removeMutation.mutate(deleteId); }}
            >
              Удалить
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
