'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useTranslations } from 'next-intl';
import { CompareCompany, getCompanyColor, TOOLTIP_STYLE } from '@/components/compare/types';

interface TrendChartsProps {
  companies: CompareCompany[];
  trendChartData: Record<string, number | string | null>[];
  formatCurrency: (amount: number | null) => string;
}

export function TrendCharts({ companies, trendChartData, formatCurrency }: TrendChartsProps) {
  const t = useTranslations('compare');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('trends.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue trend */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('summary.revenue')}</h4>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fill: 'var(--chart-text, #6b7280)', fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `\u20AC${(v / 1000000).toFixed(0)}M`} tick={{ fill: 'var(--chart-text, #6b7280)', fontSize: 12 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCurrency(v as number)} />
                  {companies.map((c, i) => (
                    <Line key={c.id} type="monotone" dataKey={`rev_${c.id}`} name={c.name}
                      stroke={getCompanyColor(i)} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Profit trend */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('summary.profit')}</h4>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fill: 'var(--chart-text, #6b7280)', fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `\u20AC${(v / 1000000).toFixed(0)}M`} tick={{ fill: 'var(--chart-text, #6b7280)', fontSize: 12 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCurrency(v as number)} />
                  {companies.map((c, i) => (
                    <Line key={c.id} type="monotone" dataKey={`profit_${c.id}`} name={c.name}
                      stroke={getCompanyColor(i)} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
