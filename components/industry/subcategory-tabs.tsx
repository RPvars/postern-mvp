'use client';

import { Building2 } from 'lucide-react';
import { getIndustryIcon } from '@/lib/industry-icons';
import type { IndustryChild } from './types';

interface SubcategoryTabsProps {
  children: IndustryChild[];
  activeSub: string;
  onSelect: (code: string) => void;
  name: (item: { nameLv: string; nameEn: string }) => string;
  t: (key: string) => string;
  locale: string;
}

export function SubcategoryTabs({ children, activeSub, onSelect, name, t, locale }: SubcategoryTabsProps) {
  if (children.length <= 1) return null;

  const count = children.length;
  const cols = (count === 2 || count === 4) ? 2 : 3;
  const basisClass = cols === 2
    ? 'basis-[calc(50%-0.25rem)]'
    : 'basis-[calc(33.333%-0.375rem)]';

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-3">{t('subcategories')}</h2>
      <div className="flex flex-wrap gap-2">
        {children.map((child) => {
          const SubIcon = getIndustryIcon(child.code);
          const isActive = activeSub === child.code;
          return (
            <button
              key={child.code}
              aria-pressed={isActive}
              onClick={() => onSelect(isActive ? '' : child.code)}
              className={`group/sub relative flex items-start gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all grow ${basisClass} min-w-[160px] sm:min-w-[200px] ${
                isActive
                  ? 'bg-link-accent/10 ring-2 ring-link-accent text-foreground'
                  : 'bg-card border hover:bg-accent/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="absolute top-1.5 right-2 text-[9px] font-medium opacity-40 bg-muted/60 px-1.5 py-0.5 rounded-full">{child.code}</span>
              <SubIcon className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? 'text-link-accent' : ''}`} />
              <div className="flex-1 pr-8">
                <div className="text-xs font-medium leading-tight">{name(child)}</div>
                <div className="text-[10px] opacity-60 mt-0.5 flex items-center gap-1">
                  <Building2 className="h-2.5 w-2.5" />
                  {(child.companyCount ?? 0).toLocaleString(locale === 'en' ? 'en-US' : 'lv-LV')}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
