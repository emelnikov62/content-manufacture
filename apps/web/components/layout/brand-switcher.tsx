'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
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
    <Select
      value={currentBrandId ?? 'all'}
      onValueChange={(v) => v && setCurrentBrandId(v === 'all' ? null : v)}
    >
      <SelectTrigger className="w-full bg-primary/[0.14] border-primary/30 rounded-[14px] px-3 py-2.5 h-auto gap-2.5">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-card flex items-center justify-center text-[15px] shrink-0">
            {currentBrand ? currentBrand.name.charAt(0) : '◉'}
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-[13.5px] font-bold leading-tight truncate">
              {currentBrand?.name || 'Все направления'}
            </span>
            <span className="text-[11px] text-muted-foreground">Рабочее пространство</span>
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
  );
}
