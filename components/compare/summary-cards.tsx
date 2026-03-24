'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { CompareCompany, getCompanyColor } from '@/components/compare/types';

interface SummaryCardsProps {
  companies: CompareCompany[];
  selectedYear: number;
  formatCurrency: (amount: number | null) => string;
}

export function SummaryCards({ companies, selectedYear, formatCurrency }: SummaryCardsProps) {
  const t = useTranslations('compare');

  const getFinancialRatios = (company: CompareCompany) => {
    return company.financialRatios.find((r) => r.year === selectedYear) || null;
  };

  const getTaxPayment = (company: CompareCompany) => {
    return company.taxPayments.find((tp) => tp.year === selectedYear) || null;
  };

  return (
    <div className={`grid gap-4 ${
      companies.length === 2 ? 'grid-cols-2' :
      companies.length === 3 ? 'grid-cols-3' :
      companies.length === 4 ? 'grid-cols-2 lg:grid-cols-4' :
      'grid-cols-2 lg:grid-cols-5'
    }`}>
      {companies.map((company, idx) => {
        const r = getFinancialRatios(company);
        const tp = getTaxPayment(company);
        return (
          <Card key={company.id} className="border-l-4" style={{ borderLeftColor: getCompanyColor(idx) }}>
            <CardContent className="pt-4 pb-3">
              <div className="font-semibold text-sm truncate mb-2">{company.name}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <div className="text-muted-foreground">{t('summary.revenue')}</div>
                  <div className="font-medium tabular-nums">
                    {r?.revenue != null ? formatCurrency(r.revenue) : '\u2014'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('summary.profit')}</div>
                  <div className="font-medium tabular-nums">
                    {r?.netIncome != null ? formatCurrency(r.netIncome) : '\u2014'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('summary.employees')}</div>
                  <div className="font-medium tabular-nums">{tp?.employeeCount ?? '\u2014'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('summary.taxes')}</div>
                  <div className="font-medium tabular-nums">
                    {tp ? formatCurrency(tp.amount) : '\u2014'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
