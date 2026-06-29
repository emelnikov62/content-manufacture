'use client';

import { useQuery } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Brand {
  id: string;
  name: string;
  color: string;
}

export function BrandSwitcher() {
  const currentBrandId = useAppStore((s) => s.currentBrandId);
  const setCurrentBrandId = useAppStore((s) => s.setCurrentBrandId);

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands'),
  });

  const currentBrand = brands.find((b) => b.id === currentBrandId);

  return (
    <div className="flex items-center gap-1">
      <Select
        value={currentBrandId ?? 'all'}
        onValueChange={(v) => v && setCurrentBrandId(v === 'all' ? null : v)}
      >
        <SelectTrigger className="flex-1 min-w-0 bg-primary/[0.14] border-primary/30 rounded-[14px] px-3 py-2.5 h-auto gap-1 [&>svg]:shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <div className="w-[28px] h-[28px] rounded-[8px] bg-card flex items-center justify-center text-[14px] shrink-0">
              {currentBrand ? currentBrand.name.charAt(0) : '◉'}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[13px] font-bold leading-tight truncate max-w-full">
                {currentBrand?.name || 'Все направления'}
              </span>
              <span className="text-[10.5px] text-muted-foreground">Пространство</span>
            </div>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все направления</SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: brand.color }}
                />
                {brand.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Link
        href="/brands"
        className="h-9 w-9 rounded-[10px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
        title="Управлять направлениями"
      >
        <Settings2 className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
