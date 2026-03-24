'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import { CompareCompany } from '@/components/compare/types';

interface FinancialSummaryProps {
  companies: CompareCompany[];
  selectedYear: number;
  formatCurrency: (amount: number | null) => string;
}

export function FinancialSummary({ companies, selectedYear, formatCurrency }: FinancialSummaryProps) {
  const t = useTranslations('compare');

  const getFinancialRatios = useCallback((company: CompareCompany) => {
    return company.financialRatios.find((r) => r.year === selectedYear) || null;
  }, [selectedYear]);

  const getBestWorst = useCallback((values: (number | null)[], higherIsBetter: boolean = true) => {
    const validValues = values.filter((v): v is number => v !== null);
    if (validValues.length === 0) return { best: null, worst: null };
    const best = higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
    const worst = higherIsBetter ? Math.min(...validValues) : Math.max(...validValues);
    return { best, worst };
  }, []);

  const getCellColor = useCallback((value: number | null, best: number | null, worst: number | null) => {
    if (value === null || best === null || worst === null) return '';
    if (value === best) return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
    if (value === worst) return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    return '';
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('financialSummary.title')} ({selectedYear})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">{t('financialSummary.metric')}</TableHead>
                {companies.map((company) => (
                  <TableHead key={company.id} className="min-w-36 text-right">{company.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Absolute figures */}
              {([
                { key: 'revenue', field: 'revenue' as const, format: formatCurrency, higher: true },
                { key: 'netIncome', field: 'netIncome' as const, format: formatCurrency, higher: true },
                { key: 'totalAssets', field: 'totalAssets' as const, format: formatCurrency, higher: true },
                { key: 'equity', field: 'equity' as const, format: formatCurrency, higher: true },
                { key: 'totalDebt', field: 'totalDebt' as const, format: formatCurrency, higher: false },
                { key: 'employees', field: 'employees' as const, format: (v: number | null) => v != null ? v.toLocaleString('lv-LV') : 'N/A', higher: true },
                { key: 'revenuePerEmployee', field: 'revenuePerEmployee' as const, format: formatCurrency, higher: true },
                { key: 'profitPerEmployee', field: 'profitPerEmployee' as const, format: formatCurrency, higher: true },
              ] as const).map(({ key, field, format, higher }) => {
                const values = companies.map((c) => getFinancialRatios(c)?.[field] ?? null);
                const { best, worst } = getBestWorst(values, higher);
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{t(`financialSummary.${key}`)}</TableCell>
                    {companies.map((c, i) => (
                      <TableCell key={c.id} className={`text-right text-sm tabular-nums ${getCellColor(values[i], best, worst)}`}>
                        {format(values[i])}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {/* YoY Growth rows */}
              {([
                { key: 'revenueGrowth', field: 'revenue' as const },
                { key: 'profitGrowth', field: 'netIncome' as const },
                { key: 'employeeGrowth', field: 'employees' as const },
              ] as const).map(({ key, field }) => {
                const values = companies.map((c) => {
                  const current = c.financialRatios.find(r => r.year === selectedYear)?.[field];
                  const previous = c.financialRatios.find(r => r.year === selectedYear - 1)?.[field];
                  if (current == null || previous == null || previous === 0) return null;
                  return (current - previous) / Math.abs(previous);
                });
                const { best, worst } = getBestWorst(values, true);
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{t(`financialSummary.${key}`)}</TableCell>
                    {companies.map((c, i) => {
                      const v = values[i];
                      return (
                        <TableCell key={c.id} className={`text-right text-sm tabular-nums ${getCellColor(v, best, worst)}`}>
                          {v != null ? `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%` : 'N/A'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
