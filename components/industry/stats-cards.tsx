'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, TrendingUp, Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { IndustryData } from './types';

interface StatsCardsProps {
  stats: IndustryData['stats'] | null;
  t: (key: string) => string;
  locale: string;
}

export function StatsCards({ stats, t, locale }: StatsCardsProps) {
  if (!stats) return null;
  const numLocale = locale === 'en' ? 'en-US' : 'lv-LV';
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard label={t('stats.totalCompanies')} value={stats.totalCompanies.toLocaleString(numLocale)} icon={<Building2 className="h-4 w-4" />} />
      <StatCard label={t('stats.totalRevenue')} value={stats.totalRevenue > 0 ? formatCurrency(stats.totalRevenue) : '—'} icon={<TrendingUp className="h-4 w-4" />} />
      <StatCard label={t('stats.totalEmployees')} value={stats.totalEmployees > 0 ? stats.totalEmployees.toLocaleString(numLocale) : '—'} icon={<Users className="h-4 w-4" />} />
      <StatCard label={t('stats.totalTaxes')} value={stats.totalTaxes > 0 ? formatCurrency(stats.totalTaxes) : '—'} icon={<Banknote className="h-4 w-4" />} />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          {icon}
          {label}
        </div>
        <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
