'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
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
  accounts?: { id: string; network: string; status: string }[];
  _count?: { posts: number };
}

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const setCurrentBrandId = useAppStore((s) => s.setCurrentBrandId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(BRAND_COLORS[0]);

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color: string }) =>
      api.post('/brands', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setOpen(false);
      setName('');
      setDescription('');
    },
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
            Направления
          </h1>
          <p className="text-muted-foreground text-[13.5px] mt-1">
            Управление бизнес-направлениями
          </p>
        </div>
        <div className="ml-auto">
          <button
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all"
            onClick={() => setOpen(true)}
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
            onClick={() => setOpen(true)}
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
              className="bg-card border border-border rounded-[22px] shadow-card p-[18px] cursor-pointer hover:border-ring transition-all"
              onClick={() => setCurrentBrandId(brand.id)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-xl shrink-0"
                  style={{ backgroundColor: brand.color }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[15px] truncate">{brand.name}</h3>
                  {brand.description && (
                    <p className="text-[12px] text-muted-foreground truncate">
                      {brand.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="pill-status pill-draft">
                  {brand.accounts?.length || 0} аккаунтов
                </span>
                <span className="pill-status pill-draft">
                  {brand._count?.posts || 0} постов
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать направление</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ name, description, color });
            }}
            className="flex flex-col gap-4"
          >
            <Input
              placeholder="Название"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              placeholder="Описание (опционально)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div>
              <p className="text-[13px] font-bold mb-2">Цвет</p>
              <div className="flex gap-2">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-8 w-8 rounded-full border-2 transition-transform"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? 'white' : 'transparent',
                      transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              Создать
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
