'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BRAND_COLORS = [
  '#C6F24E', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFA07A',
];

interface Brand {
  id: string;
  name: string;
  description: string | null;
  color: string;
  brandVoice?: string | null;
  targetAudience?: string | null;
  accounts?: { id: string; network: string; status: string }[];
  _count?: { posts: number };
}

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const setCurrentBrandId = useAppStore((s) => s.setCurrentBrandId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [color, setColor] = useState(BRAND_COLORS[0]);

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; brandVoice?: string; targetAudience?: string; color: string }) =>
      api.post('/brands', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      resetForm();
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string | undefined> }) =>
      api.patch(`/brands/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      resetForm();
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/brands/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      if (currentBrandId === deletedId) setCurrentBrandId(null);
      setDeleteOpen(false);
      setEditingBrand(null);
    },
  });

  function resetForm() {
    setName('');
    setDescription('');
    setBrandVoice('');
    setTargetAudience('');
    setColor(BRAND_COLORS[0]);
    setEditingBrand(null);
  }

  function openEdit(brand: Brand) {
    setEditingBrand(brand);
    setName(brand.name);
    setDescription(brand.description || '');
    setBrandVoice(brand.brandVoice || '');
    setTargetAudience(brand.targetAudience || '');
    setColor(brand.color);
    setEditOpen(true);
  }

  function openDelete(brand: Brand) {
    setEditingBrand(brand);
    setDeleteOpen(true);
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Направления
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Управление рабочими пространствами
          </p>
        </div>
        <div className="ml-auto">
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
            onClick={() => { resetForm(); setCreateOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Новое направление
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-[22px] shadow-card p-[18px] h-32 animate-pulse" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px] text-center py-12">
          <p className="text-muted-foreground text-[13.5px] mb-4">
            Создайте первое направление, чтобы начать
          </p>
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
            onClick={() => { resetForm(); setCreateOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Создать направление
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className={`bg-card border rounded-[22px] shadow-card p-[18px] transition-all ${
                currentBrandId === brand.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-ring'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-xl shrink-0 cursor-pointer"
                  style={{ backgroundColor: brand.color }}
                  onClick={() => setCurrentBrandId(brand.id)}
                />
                <div className="min-w-0 flex-1">
                  <h3
                    className="font-bold text-[15px] truncate cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setCurrentBrandId(brand.id)}
                  >
                    {brand.name}
                  </h3>
                  {brand.description && (
                    <p className="text-[12px] text-muted-foreground truncate">
                      {brand.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    onClick={() => openEdit(brand)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => openDelete(brand)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="pill-status pill-draft">
                  {brand.accounts?.length || 0} аккаунтов
                </span>
                <span className="pill-status pill-draft">
                  {brand._count?.posts || 0} постов
                </span>
                {currentBrandId === brand.id && (
                  <span className="pill-status pill-published">
                    <span className="pill-dot" />
                    Активное
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новое направление</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name,
                description: description || undefined,
                brandVoice: brandVoice || undefined,
                targetAudience: targetAudience || undefined,
                color,
              });
            }}
            className="flex flex-col gap-3.5"
          >
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Название *</div>
              <Input placeholder="Coffee House" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Описание</div>
              <Input placeholder="Кофейня в центре" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Голос бренда</div>
              <Input placeholder="Дружелюбный, неформальный" value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Целевая аудитория</div>
              <Input placeholder="25-35 лет, любители кофе" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Цвет</div>
              <div className="flex gap-2">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-8 w-8 rounded-full border-2 transition-transform"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? 'var(--foreground)' : 'transparent',
                      transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all disabled:opacity-50"
              disabled={!name || createMutation.isPending}
            >
              {createMutation.isPending ? 'Создаём…' : 'Создать'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать направление</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingBrand) return;
              updateMutation.mutate({
                id: editingBrand.id,
                data: {
                  name,
                  description: description || undefined,
                  brandVoice: brandVoice || undefined,
                  targetAudience: targetAudience || undefined,
                  color,
                },
              });
            }}
            className="flex flex-col gap-3.5"
          >
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Название *</div>
              <Input placeholder="Coffee House" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Описание</div>
              <Input placeholder="Кофейня в центре" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Голос бренда</div>
              <Input placeholder="Дружелюбный, неформальный" value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Целевая аудитория</div>
              <Input placeholder="25-35 лет, любители кофе" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-1.5">Цвет</div>
              <div className="flex gap-2">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-8 w-8 rounded-full border-2 transition-transform"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? 'var(--foreground)' : 'transparent',
                      transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all disabled:opacity-50"
              disabled={!name || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setEditingBrand(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить направление</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-[13.5px]">
              Вы уверены, что хотите удалить <strong>{editingBrand?.name}</strong>?
              Все аккаунты, посты и медиа этого направления будут удалены безвозвратно.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                className="inline-flex items-center gap-2 font-bold text-[13px] rounded-xl px-4 py-2.5 border border-border bg-card hover:bg-secondary transition-colors"
                onClick={() => { setDeleteOpen(false); setEditingBrand(null); }}
              >
                Отмена
              </button>
              <button
                className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all disabled:opacity-50"
                onClick={() => editingBrand && deleteMutation.mutate(editingBrand.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Удаляем…' : 'Удалить'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
