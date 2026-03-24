'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { CompareCompany, getCompanyColor } from '@/components/compare/types';

interface OwnershipComparisonProps {
  companies: CompareCompany[];
}

export function OwnershipComparison({ companies }: OwnershipComparisonProps) {
  const t = useTranslations('compare');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('owners.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className={`grid gap-4 ${
            companies.length === 2 ? 'grid-cols-2' :
            companies.length === 3 ? 'grid-cols-3' :
            companies.length === 4 ? 'grid-cols-2 lg:grid-cols-4' :
            'grid-cols-2 lg:grid-cols-5'
          }`}>
            {companies.map((company, idx) => (
              <div key={company.id} className="space-y-2">
                <div className="text-sm font-semibold truncate" style={{ color: getCompanyColor(idx) }}>{company.name}</div>
                {company.owners && company.owners.filter(o => o.sharePercentage > 0).length > 0 ? (
                  company.owners
                    .filter(o => o.sharePercentage > 0)
                    .slice(0, 5)
                    .map((o) => (
                      <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate text-muted-foreground">{o.owner.name}</span>
                        <span className="shrink-0 font-medium tabular-nums">{o.sharePercentage.toFixed(1)}%</span>
                      </div>
                    ))
                ) : (
                  <div className="text-sm text-muted-foreground">{t('owners.noOwners')}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
