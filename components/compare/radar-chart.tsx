'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip } from 'recharts';
import { useTranslations } from 'next-intl';
import { CompareCompany, getCompanyColor, TOOLTIP_STYLE } from '@/components/compare/types';

interface RadarChartProps {
  companies: CompareCompany[];
  selectedYear: number;
  radarChartData: Record<string, string | number>[];
}

export function CompareRadarChart({ companies, selectedYear, radarChartData }: RadarChartProps) {
  const t = useTranslations('compare');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('radar.title')} ({selectedYear})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadarChart data={radarChartData}>
              <PolarGrid stroke="var(--chart-grid, #e5e7eb)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--chart-text, #6b7280)', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              {companies.map((company, idx) => (
                <Radar
                  key={company.id}
                  name={company.name}
                  dataKey={company.id}
                  stroke={getCompanyColor(idx)}
                  fill={getCompanyColor(idx)}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Legend formatter={(value) => {
                const c = companies.find(co => co.id === value);
                return <span className="text-foreground text-xs">{c?.name ?? value}</span>;
              }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => Math.round(v)} />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
