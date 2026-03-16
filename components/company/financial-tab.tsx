'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableProperties, TrendingUp } from 'lucide-react';
import { FinancialRatiosDisplay } from '@/components/financial-ratios-display';
import { formatCurrency } from '@/lib/format';
import type { Company } from '@/lib/types/company';

const DEFAULT_YEARS = 3;

interface FinancialTabProps {
  company: Company;
}

function useScrollShadow() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showShadow, setShowShadow] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowShadow(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  return { scrollRef, showShadow, onScroll: checkScroll };
}

export function FinancialTab({ company }: FinancialTabProps) {
  const t = useTranslations('company');
  const [financialYearsLimit, setFinancialYearsLimit] = useState(DEFAULT_YEARS);
  const [taxYearsLimit, setTaxYearsLimit] = useState(DEFAULT_YEARS);

  const financialScroll = useScrollShadow();
  const taxScroll = useScrollShadow();

  const formatValue = (value: number | null, format: string) => {
    if (value == null) return '-';
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'ratio': return value.toFixed(2);
      case 'percent': return `${(value * 100).toFixed(2)}`;
      case 'integer': return value.toLocaleString('lv-LV');
      default: return String(value);
    }
  };

  const getTrend = (current: number | null, previous: number | null) => {
    if (current == null || previous == null || previous === 0) return null;
    return current > previous ? 'up' : current < previous ? 'down' : null;
  };

  const financialSummaryRows: { label: string; key: string; format: 'currency' | 'ratio' | 'percent' | 'integer' }[] = [
    { label: t('financialSummary.netIncome'), key: 'netIncome', format: 'currency' },
    { label: t('financialSummary.revenue'), key: 'revenue', format: 'currency' },
    { label: t('financialSummary.totalAssets'), key: 'totalAssets', format: 'currency' },
    { label: t('financialSummary.equity'), key: 'equity', format: 'currency' },
    { label: t('financialSummary.totalDebt'), key: 'totalDebt', format: 'currency' },
    { label: t('financialSummary.liquidityRatio'), key: 'currentRatio', format: 'ratio' },
    { label: t('financialSummary.returnOnAssets'), key: 'returnOnAssets', format: 'percent' },
    { label: t('financialSummary.employees'), key: 'employees', format: 'integer' },
  ];

  const taxRows: { label: string; key: 'amount' | 'iinAmount' | 'vsaoiAmount' | 'employeeCount'; format: 'currency' | 'integer' }[] = [
    { label: t('taxPayments.amount'), key: 'amount', format: 'currency' },
    { label: t('taxPayments.iinAmount'), key: 'iinAmount', format: 'currency' },
    { label: t('taxPayments.vsaoiAmount'), key: 'vsaoiAmount', format: 'currency' },
    { label: t('taxPayments.employeeCount'), key: 'employeeCount', format: 'integer' },
  ];

  const visibleFinancialYears = company.financialRatios?.slice(0, financialYearsLimit) ?? [];
  const visibleTaxYears = company.taxPayments?.slice(0, taxYearsLimit) ?? [];

  // Re-check scroll shadow when year limits change
  useEffect(() => {
    financialScroll.onScroll();
  }, [financialYearsLimit, financialScroll]);

  useEffect(() => {
    taxScroll.onScroll();
  }, [taxYearsLimit, taxScroll]);

  return (
    <TabsContent value="financial">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Financial Summary Table */}
        {company.financialRatios && company.financialRatios.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableProperties className="h-5 w-5" />
                {t('financialSummary.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="overflow-x-auto" ref={financialScroll.scrollRef} onScroll={financialScroll.onScroll}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white z-10 whitespace-nowrap"></TableHead>
                        {visibleFinancialYears.map((ry) => (
                          <TableHead key={ry.year} className="text-right whitespace-nowrap min-w-[260px] px-4">{ry.year}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialSummaryRows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium sticky left-0 bg-white z-10 whitespace-nowrap">{row.label}</TableCell>
                          {visibleFinancialYears.map((ry, idx) => {
                            const value = (ry as unknown as Record<string, number | null>)[row.key] ?? null;
                            const prevYear = visibleFinancialYears[idx + 1];
                            const prevValue = prevYear ? (prevYear as unknown as Record<string, number | null>)[row.key] ?? null : null;
                            const trend = getTrend(value, prevValue);
                            return (
                              <TableCell key={ry.year} className="text-right whitespace-nowrap min-w-[260px] px-4">
                                <span className="inline-flex items-center gap-1">
                                  {formatValue(value, row.format)}
                                  {row.format === 'currency' && value != null && ' EUR'}
                                  {trend === 'up' && <span className="text-green-600 text-xs">↑</span>}
                                  {trend === 'down' && <span className="text-red-600 text-xs">↓</span>}
                                </span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {financialScroll.showShadow && (
                  <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-white to-transparent" />
                )}
              </div>
              {company.financialRatios.length > DEFAULT_YEARS && (
                <div className="border-t pt-4 mt-2 space-y-2">
                  <div className="text-center text-xs text-muted-foreground">
                    {t('ownership.showing', { count: Math.min(financialYearsLimit, company.financialRatios.length), total: company.financialRatios.length })}
                  </div>
                  {financialYearsLimit < company.financialRatios.length ? (
                    <button
                      onClick={() => setFinancialYearsLimit(company.financialRatios.length)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 text-gray-600 py-2.5 text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      {t('ownership.showMore')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setFinancialYearsLimit(DEFAULT_YEARS)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 text-gray-600 py-2.5 text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      {t('ownership.showLess')}
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tax Payments */}
        {company.taxPayments && company.taxPayments.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('taxPayments.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="overflow-x-auto" ref={taxScroll.scrollRef} onScroll={taxScroll.onScroll}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white z-10 whitespace-nowrap"></TableHead>
                        {visibleTaxYears.map((tp) => (
                          <TableHead key={tp.year} className="text-right whitespace-nowrap min-w-[260px] px-4">{tp.year}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxRows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium sticky left-0 bg-white z-10 whitespace-nowrap">{row.label}</TableCell>
                          {visibleTaxYears.map((tp, idx) => {
                            const value = tp[row.key];
                            const prevTp = visibleTaxYears[idx + 1];
                            const prevValue = prevTp ? prevTp[row.key] : null;
                            const trend = getTrend(value, prevValue);
                            return (
                              <TableCell key={tp.year} className="text-right whitespace-nowrap min-w-[260px] px-4">
                                <span className="inline-flex items-center gap-1">
                                  {value != null
                                    ? row.format === 'currency'
                                      ? `${formatCurrency(value)}`
                                      : value.toLocaleString('lv-LV')
                                    : '-'}
                                  {trend === 'up' && <span className="text-green-600 text-xs">↑</span>}
                                  {trend === 'down' && <span className="text-red-600 text-xs">↓</span>}
                                </span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {taxScroll.showShadow && (
                  <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-white to-transparent" />
                )}
              </div>
              {company.taxPayments.length > DEFAULT_YEARS && (
                <div className="border-t pt-4 mt-2 space-y-2">
                  <div className="text-center text-xs text-muted-foreground">
                    {t('ownership.showing', { count: Math.min(taxYearsLimit, company.taxPayments.length), total: company.taxPayments.length })}
                  </div>
                  {taxYearsLimit < company.taxPayments.length ? (
                    <button
                      onClick={() => setTaxYearsLimit(company.taxPayments.length)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 text-gray-600 py-2.5 text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      {t('ownership.showMore')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setTaxYearsLimit(DEFAULT_YEARS)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 text-gray-600 py-2.5 text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      {t('ownership.showLess')}
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financial Ratios */}
        {company.financialRatios && company.financialRatios.length > 0 && (
          <div className="lg:col-span-2">
            <FinancialRatiosDisplay ratios={company.financialRatios} />
          </div>
        )}
      </div>
    </TabsContent>
  );
}
