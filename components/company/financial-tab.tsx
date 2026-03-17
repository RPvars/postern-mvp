'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TableProperties, TrendingUp, Loader2 } from 'lucide-react';
import { FinancialRatiosDisplay } from '@/components/financial-ratios-display';
import { formatCurrency } from '@/lib/format';
import type { Company } from '@/lib/types/company';

const DEFAULT_YEARS = 3;

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

interface RowDef {
  label: string;
  key: string;
  format: 'currency' | 'ratio' | 'percent' | 'integer';
}

interface ScrollableYearTableProps<T> {
  years: T[];
  allYearsCount: number;
  rows: RowDef[];
  getValue: (year: T, key: string) => number | null;
  getYear: (year: T) => number;
  limit: number;
  onLimitChange: (limit: number) => void;
  showingText: (count: number, total: number) => string;
  showMoreLabel: string;
  showLessLabel: string;
  showCurrencySuffix?: boolean;
}

function ScrollableYearTable<T>({
  years, allYearsCount, rows, getValue, getYear,
  limit, onLimitChange, showingText, showMoreLabel, showLessLabel,
  showCurrencySuffix = false,
}: ScrollableYearTableProps<T>) {
  const scroll = useScrollShadow();

  useEffect(() => {
    scroll.onScroll();
  }, [limit, scroll]);

  return (
    <>
      <div className="relative">
        <div className="overflow-x-auto" ref={scroll.scrollRef} onScroll={scroll.onScroll}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 whitespace-nowrap"></TableHead>
                {years.map((y) => (
                  <TableHead key={getYear(y)} className="text-right whitespace-nowrap min-w-[260px] px-4">{getYear(y)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium sticky left-0 bg-card z-10 whitespace-nowrap">{row.label}</TableCell>
                  {years.map((y, idx) => {
                    const value = getValue(y, row.key);
                    const prevValue = years[idx + 1] ? getValue(years[idx + 1], row.key) : null;
                    const trend = getTrend(value, prevValue);
                    return (
                      <TableCell key={getYear(y)} className="text-right whitespace-nowrap min-w-[260px] px-4">
                        <span className="inline-flex items-center gap-1">
                          {formatValue(value, row.format)}
                          {showCurrencySuffix && row.format === 'currency' && value != null && ' EUR'}
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
        {scroll.showShadow && (
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-card to-transparent" />
        )}
      </div>
      {allYearsCount > DEFAULT_YEARS && (
        <div className="border-t pt-4 mt-2 space-y-2">
          <div className="text-center text-xs text-muted-foreground">
            {showingText(Math.min(limit, allYearsCount), allYearsCount)}
          </div>
          {limit < allYearsCount ? (
            <button
              onClick={() => onLimitChange(allYearsCount)}
              className="w-full rounded-md border bg-muted text-muted-foreground py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              {showMoreLabel}
            </button>
          ) : (
            <button
              onClick={() => onLimitChange(DEFAULT_YEARS)}
              className="w-full rounded-md border bg-muted text-muted-foreground py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              {showLessLabel}
            </button>
          )}
        </div>
      )}
    </>
  );
}

interface FinancialTabProps {
  company: Company;
  isLoadingExternal?: boolean;
}

export function FinancialTab({ company, isLoadingExternal }: FinancialTabProps) {
  const t = useTranslations('company');
  const [financialYearsLimit, setFinancialYearsLimit] = useState(DEFAULT_YEARS);
  const [taxYearsLimit, setTaxYearsLimit] = useState(DEFAULT_YEARS);

  const financialRows: RowDef[] = [
    { label: t('financialSummary.netIncome'), key: 'netIncome', format: 'currency' },
    { label: t('financialSummary.revenue'), key: 'revenue', format: 'currency' },
    { label: t('financialSummary.totalAssets'), key: 'totalAssets', format: 'currency' },
    { label: t('financialSummary.equity'), key: 'equity', format: 'currency' },
    { label: t('financialSummary.totalDebt'), key: 'totalDebt', format: 'currency' },
    { label: t('financialSummary.liquidityRatio'), key: 'currentRatio', format: 'ratio' },
    { label: t('financialSummary.returnOnAssets'), key: 'returnOnAssets', format: 'percent' },
    { label: t('financialSummary.employees'), key: 'employees', format: 'integer' },
  ];

  const taxRows: RowDef[] = [
    { label: t('taxPayments.amount'), key: 'amount', format: 'currency' },
    { label: t('taxPayments.iinAmount'), key: 'iinAmount', format: 'currency' },
    { label: t('taxPayments.vsaoiAmount'), key: 'vsaoiAmount', format: 'currency' },
    { label: t('taxPayments.employeeCount'), key: 'employeeCount', format: 'integer' },
  ];

  const visibleFinancialYears = company.financialRatios?.slice(0, financialYearsLimit) ?? [];
  const visibleTaxYears = company.taxPayments?.slice(0, taxYearsLimit) ?? [];

  const showingText = (count: number, total: number) =>
    t('ownership.showing', { count, total });

  return (
    <TabsContent value="financial">
      <div className="grid gap-6 lg:grid-cols-2">
        {isLoadingExternal && (!company.financialRatios || company.financialRatios.length === 0) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('financialSummary.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        )}

        {company.financialRatios && company.financialRatios.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableProperties className="h-5 w-5" />
                {t('financialSummary.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollableYearTable
                years={visibleFinancialYears}
                allYearsCount={company.financialRatios.length}
                rows={financialRows}
                getValue={(y, key) => (y as unknown as Record<string, number | null>)[key] ?? null}
                getYear={(y) => y.year}
                limit={financialYearsLimit}
                onLimitChange={setFinancialYearsLimit}
                showingText={showingText}
                showMoreLabel={t('ownership.showMore')}
                showLessLabel={t('ownership.showLess')}
                showCurrencySuffix
              />
            </CardContent>
          </Card>
        )}

        {company.taxPayments && company.taxPayments.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('taxPayments.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollableYearTable
                years={visibleTaxYears}
                allYearsCount={company.taxPayments.length}
                rows={taxRows}
                getValue={(y, key) => y[key as keyof typeof y] as number | null}
                getYear={(y) => y.year}
                limit={taxYearsLimit}
                onLimitChange={setTaxYearsLimit}
                showingText={showingText}
                showMoreLabel={t('ownership.showMore')}
                showLessLabel={t('ownership.showLess')}
              />
            </CardContent>
          </Card>
        )}

        {company.financialRatios && company.financialRatios.length > 0 && (
          <div className="lg:col-span-2">
            <FinancialRatiosDisplay ratios={company.financialRatios} />
          </div>
        )}
      </div>
    </TabsContent>
  );
}
