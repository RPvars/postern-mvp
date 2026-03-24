'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';
import { CompanySelector } from '@/components/company-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Building2, AlertCircle, Link2, Check, Download } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  color: 'var(--popover-foreground)',
};

interface SelectedCompany {
  id: string;
  name: string;
  registrationNumber: string;
}

interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
  legalAddress: string;
  registrationDate: string;
  status: string;
  legalForm: string | null;
  shareCapital: number | null;
  registeredVehiclesCount: number | null;
  taxPayments: {
    year: number;
    amount: number;
    iinAmount: number | null;
    vsaoiAmount: number | null;
    employeeCount: number | null;
  }[];
  financialRatios: {
    year: number;
    revenue: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    equity: number | null;
    totalDebt: number | null;
    employees: number | null;
    returnOnEquity: number | null;
    returnOnAssets: number | null;
    roce: number | null;
    netProfitMargin: number | null;
    grossProfitMargin: number | null;
    operatingProfitMargin: number | null;
    ebitdaMargin: number | null;
    cashFlowMargin: number | null;
    revenuePerEmployee: number | null;
    profitPerEmployee: number | null;
    currentRatio: number | null;
    quickRatio: number | null;
    cashRatio: number | null;
    workingCapitalRatio: number | null;
    debtToEquity: number | null;
    debtRatio: number | null;
    interestCoverageRatio: number | null;
    equityMultiplier: number | null;
    assetTurnover: number | null;
    inventoryTurnover: number | null;
    receivablesTurnover: number | null;
    payablesTurnover: number | null;
    dso: number | null;
    dpo: number | null;
    cashConversionCycle: number | null;
  }[];
  owners: {
    id: string;
    owner: { name: string; isLegalEntity: boolean };
    sharePercentage: number;
  }[];
  vatPayer: {
    vatNumber: string;
    isActive: boolean;
    registeredDate: string | null;
  } | null;
}

// Warm + cool accent color palette for maximum line contrast
// Maintains the Posterns brand vibe with strategic cool accents for distinction
const COMPANY_COLORS = [
  '#FEC200', // Posterns Yellow (main brand)
  '#F97316', // Vibrant Orange
  '#14B8A6', // Teal (cool accent - high contrast)
  '#DC2626', // Red (warm but distinct)
  '#0EA5E9', // Sky Blue (cool accent - high contrast)
];

// Get color for a company by index
const getCompanyColor = (index: number): string => {
  return COMPANY_COLORS[index % COMPANY_COLORS.length];
};

export default function ComparePage() {
  const t = useTranslations('compare');
  const tCommon = useTranslations('common');
  const tFinancial = useTranslations('company.financialRatios');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedCompanies, setSelectedCompanies] = useState<SelectedCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringFromUrl, setIsRestoringFromUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [linkCopied, setLinkCopied] = useState(false);
  const initialLoadDone = useRef(false);

  // Restore selected companies from URL on mount and auto-trigger comparison
  useEffect(() => {
    const restoreCompaniesFromUrl = async () => {
      const companiesParam = searchParams.get('companies');
      const wasCompared = searchParams.get('compared') === 'true';
      if (!companiesParam || initialLoadDone.current) return;

      initialLoadDone.current = true;
      const ids = companiesParam.split(',').filter(id => id.trim().length > 0);

      if (ids.length === 0) return;

      setIsRestoringFromUrl(true);
      try {
        if (wasCompared && ids.length >= 2) {
          // Parallel: batch (for selector) + compare (for data)
          const [batchRes, compareRes] = await Promise.all([
            fetch(`/api/companies/batch?ids=${ids.join(',')}`),
            fetch('/api/compare', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ companyIds: ids }),
            }),
          ]);

          if (batchRes.ok) {
            const batchData = await batchRes.json();
            if (batchData.companies?.length > 0) setSelectedCompanies(batchData.companies);
          }

          if (compareRes.ok) {
            const compareData = await compareRes.json();
            setCompanies(compareData.companies);
            if (compareData.companies?.[0]?.financialRatios?.length > 0) {
              setSelectedYear(compareData.companies[0].financialRatios[0].year);
            }
          }
        } else {
          // Just restore selector (no auto-compare)
          const response = await fetch(`/api/companies/batch?ids=${ids.join(',')}`);
          if (response.ok) {
            const data = await response.json();
            if (data.companies?.length > 0) setSelectedCompanies(data.companies);
          }
        }
      } catch (err) {
        console.error('Failed to restore companies from URL:', err);
      } finally {
        setIsRestoringFromUrl(false);
      }
    };

    restoreCompaniesFromUrl();
  }, [searchParams]);

  // Update URL when selected companies change
  useEffect(() => {
    if (isRestoringFromUrl) return;

    const currentParam = searchParams.get('companies');
    const newParam = selectedCompanies.length > 0
      ? selectedCompanies.map(c => c.id).join(',')
      : null;

    // Only update URL if the value actually changed
    if (currentParam !== newParam) {
      const params = new URLSearchParams(searchParams.toString());
      if (newParam) {
        params.set('companies', newParam);
      } else {
        params.delete('companies');
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [selectedCompanies, isRestoringFromUrl, searchParams, pathname, router]);

  const handleCompare = async () => {
    if (selectedCompanies.length < 2) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyIds: selectedCompanies.map((c) => c.id),
        }),
      });

      if (!response.ok) {
        throw new Error(t('errors.loadFailed'));
      }

      const data = await response.json();
      setCompanies(data.companies);

      // Set default year to most recent available
      if (data.companies.length > 0 && data.companies[0].financialRatios.length > 0) {
        setSelectedYear(data.companies[0].financialRatios[0].year);
      }

      // Update URL to indicate comparison was done
      const params = new URLSearchParams(searchParams.toString());
      params.set('compared', 'true');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = useCallback((amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('lv-LV', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }, []);

  const formatPercent = useCallback((value: number | null) => {
    if (value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  }, []);

  const formatRatio = useCallback((value: number | null, decimals: number = 2) => {
    if (value === null) return 'N/A';
    return value.toFixed(decimals);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('lv-LV');
  }, []);

  // Get all available years (memoized)
  const availableYears = useMemo(() => {
    if (companies.length === 0) return [];
    return Array.from(
      new Set(
        companies.flatMap((c) => c.financialRatios.map((r) => r.year))
      )
    ).sort((a, b) => b - a);
  }, [companies]);

  // Get financial ratios for selected year (memoized callback)
  const getFinancialRatios = useCallback((company: Company) => {
    return company.financialRatios.find((r) => r.year === selectedYear) || null;
  }, [selectedYear]);

  // Get tax payment for selected year (memoized callback)
  const getTaxPayment = useCallback((company: Company) => {
    return company.taxPayments.find((t) => t.year === selectedYear) || null;
  }, [selectedYear]);

  // Get best and worst values for highlighting (memoized callback)
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

  // Memoize line chart data for tax payments
  const taxPaymentsChartData = useMemo(() => {
    if (companies.length === 0) return [];

    // Get all unique years from all companies
    const allYears = Array.from(
      new Set(
        companies.flatMap(c => c.taxPayments.map(t => t.year))
      )
    ).sort((a, b) => a - b);

    // Create data points for each year
    return allYears.map(year => {
      const dataPoint: any = { year };
      companies.forEach(company => {
        const payment = company.taxPayments.find(t => t.year === year);
        dataPoint[company.name] = payment ? payment.amount : null;
      });
      return dataPoint;
    });
  }, [companies]);

  // Memoize Y-axis domain calculation
  const taxPaymentsYAxisDomain = useMemo(() => {
    const allValues = companies.flatMap(c =>
      c.taxPayments.map(t => t.amount)
    ).filter(v => v !== null && v !== undefined);

    if (allValues.length === 0) return [0, 'auto'];

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.1;

    return [
      Math.max(0, minValue - padding),
      maxValue + padding
    ];
  }, [companies]);

  // Trend chart data (revenue + profit over years)
  const trendChartData = useMemo(() => {
    if (companies.length === 0) return [];
    const allYears = Array.from(
      new Set(companies.flatMap(c => c.financialRatios.map(r => r.year)))
    ).sort((a, b) => a - b);
    return allYears.map(year => {
      const point: Record<string, number | string | null> = { year };
      companies.forEach(c => {
        const r = c.financialRatios.find(r => r.year === year);
        point[`rev_${c.id}`] = r?.revenue ?? null;
        point[`profit_${c.id}`] = r?.netIncome ?? null;
      });
      return point;
    });
  }, [companies]);

  // Radar chart data — normalize metrics to 0-100 scale
  const radarChartData = useMemo(() => {
    if (companies.length === 0) return [];
    const metrics = [
      { key: 'returnOnEquity', label: t('radar.roe'), higher: true },
      { key: 'currentRatio', label: t('radar.liquidity'), higher: true },
      { key: 'netProfitMargin', label: t('radar.profitMargin'), higher: true },
      { key: 'assetTurnover', label: t('radar.efficiency'), higher: true },
      { key: 'debtRatio', label: t('radar.leverage'), higher: false },
    ];

    return metrics.map(({ key, label, higher }) => {
      const point: Record<string, string | number> = { metric: label };
      const values = companies.map(c => {
        const r = getFinancialRatios(c);
        return r ? (r as Record<string, number | null>)[key] : null;
      });
      const valid = values.filter((v): v is number => v != null);
      if (valid.length === 0) {
        companies.forEach((c, i) => { point[c.id] = 0; });
        return point;
      }
      const min = Math.min(...valid);
      const max = Math.max(...valid);
      const range = max - min || 1;
      companies.forEach((c, i) => {
        const v = values[i];
        if (v == null) { point[c.id] = 0; return; }
        const normalized = ((v - min) / range) * 80 + 10; // 10-90 scale
        point[c.id] = higher ? normalized : (100 - normalized);
      });
      return point;
    });
  }, [companies, getFinancialRatios, t]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (companies.length === 0) return;
    const headers = [
      t('basicInfo.company'),
      t('basicInfo.regNumber'),
      t('basicInfo.legalForm'),
      t('financialRatios.profitability.returnOnEquity'),
      t('financialRatios.profitability.netProfitMargin'),
      t('financialRatios.liquidity.currentRatio'),
      t('financialRatios.leverage.debtToEquity'),
      t('taxPayments.amount'),
      t('taxPayments.employeeCount'),
    ].join(',');

    const rows = companies.map(c => {
      const r = getFinancialRatios(c);
      const tp = getTaxPayment(c);
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        c.registrationNumber,
        `"${c.legalForm ?? ''}"`,
        r?.returnOnEquity != null ? (r.returnOnEquity * 100).toFixed(2) : '',
        r?.netProfitMargin != null ? (r.netProfitMargin * 100).toFixed(2) : '',
        r?.currentRatio?.toFixed(2) ?? '',
        r?.debtToEquity?.toFixed(2) ?? '',
        tp?.amount ?? '',
        tp?.employeeCount ?? '',
      ].join(',');
    });

    const csv = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salidz-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Company Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('selection.title')}
              </CardTitle>
              <CardDescription>
                {t('selection.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CompanySelector
                selectedCompanies={selectedCompanies}
                onCompaniesChange={setSelectedCompanies}
              />

              {selectedCompanies.length >= 2 && (
                <Button onClick={handleCompare} disabled={isLoading} className="w-full">
                  {isLoading ? t('selection.loading') : t('selection.compare')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          )}

          {/* Comparison Results */}
          {!isLoading && companies.length > 0 && (
            <>
              {/* Action buttons */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  {linkCopied ? <Check className="h-4 w-4 mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
                  {linkCopied ? t('actions.copied') : t('actions.copyLink')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </div>

              {/* Summary Cards */}
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
                              {r?.revenue != null ? formatCurrency(r.revenue) : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t('summary.profit')}</div>
                            <div className="font-medium tabular-nums">
                              {r?.netIncome != null ? formatCurrency(r.netIncome) : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t('summary.employees')}</div>
                            <div className="font-medium tabular-nums">{tp?.employeeCount ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t('summary.taxes')}</div>
                            <div className="font-medium tabular-nums">
                              {tp ? formatCurrency(tp.amount) : '—'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Basic Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('basicInfo.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-48">{t('basicInfo.company')}</TableHead>
                          {companies.map((company) => (
                            <TableHead key={company.id} className="min-w-48">
                              <div className="font-semibold">{company.name}</div>
                              <div className="text-xs text-muted-foreground font-normal">
                                {company.registrationNumber}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">{t('basicInfo.status')}</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id}>
                              <Badge variant={company.status === 'REGISTERED' ? 'default' : 'destructive'}>
                                {tCommon(`companyStatus.${company.status}`) || company.status}
                              </Badge>
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{t('basicInfo.legalForm')}</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id} className="text-sm">
                              {company.legalForm ?? tCommon('notAvailable')}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{t('basicInfo.shareCapital')}</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id} className="text-sm">
                              {formatCurrency(company.shareCapital)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{t('basicInfo.registrationDate')}</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id} className="text-sm">
                              {formatDate(company.registrationDate)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">PVN</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id} className="text-sm">
                              {company.vatPayer ? (
                                <div className="flex items-center gap-1">
                                  <Badge variant={company.vatPayer.isActive ? 'default' : 'destructive'} className="text-xs">
                                    {company.vatPayer.isActive ? 'Aktīvs' : 'Neaktīvs'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{company.vatPayer.vatNumber}</span>
                                </div>
                              ) : '—'}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Year Selector */}
              {availableYears.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{t('yearSelector.label')}</span>
                      <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => setSelectedYear(parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Financial Summary Table */}
              {availableYears.length > 0 && (
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
              )}

              {/* Ownership Comparison */}
              {companies.some(c => c.owners?.some(o => o.sharePercentage > 0)) && (
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
              )}

              {/* Radar Chart */}
              {radarChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('radar.title')} ({selectedYear})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarChartData}>
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
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Financial Ratios Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t('financialRatios.title')} ({selectedYear})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="profitability" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="profitability">{t('financialRatios.profitability')}</TabsTrigger>
                      <TabsTrigger value="liquidity">{t('financialRatios.liquidity')}</TabsTrigger>
                      <TabsTrigger value="leverage">{t('financialRatios.leverage')}</TabsTrigger>
                      <TabsTrigger value="efficiency">{t('financialRatios.efficiency')}</TabsTrigger>
                    </TabsList>

                    {/* Profitability Ratios */}
                    <TabsContent value="profitability" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-64">{t('financialRatios.ratio')}</TableHead>
                              {companies.map((company) => (
                                <TableHead key={company.id} className="text-center">
                                  {company.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('returnOnEquity')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.returnOnEquity || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('returnOnAssets')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.returnOnAssets || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('roce')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.roce || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('netProfitMargin')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.netProfitMargin || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('grossProfitMargin')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.grossProfitMargin || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('operatingProfitMargin')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.operatingProfitMargin || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('ebitdaMargin')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.ebitdaMargin || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('revenuePerEmployee')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.revenuePerEmployee || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatCurrency(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('profitPerEmployee')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.profitPerEmployee || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatCurrency(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* Liquidity Ratios */}
                    <TabsContent value="liquidity" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-64">{t('financialRatios.ratio')}</TableHead>
                              {companies.map((company) => (
                                <TableHead key={company.id} className="text-center">
                                  {company.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('currentRatio')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.currentRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('quickRatio')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.quickRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('cashRatio')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.cashRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('workingCapitalRatio')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.workingCapitalRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* Leverage Ratios */}
                    <TabsContent value="leverage" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-64">{t('financialRatios.ratio')}</TableHead>
                              {companies.map((company) => (
                                <TableHead key={company.id} className="text-center">
                                  {company.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('debtToEquity')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.debtToEquity || null);
                                const { best, worst } = getBestWorst(values, false); // Lower is better
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('debtRatio')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.debtRatio || null);
                                const { best, worst } = getBestWorst(values, false); // Lower is better
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('interestCoverageRatio')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.interestCoverageRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('equityMultiplier')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.equityMultiplier || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* Efficiency Ratios */}
                    <TabsContent value="efficiency" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-64">{t('financialRatios.ratio')}</TableHead>
                              {companies.map((company) => (
                                <TableHead key={company.id} className="text-center">
                                  {company.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('assetTurnover')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.assetTurnover || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('inventoryTurnover')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.inventoryTurnover || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('receivablesTurnover')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.receivablesTurnover || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('payablesTurnover')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.payablesTurnover || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('dso')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.dso || null);
                                const { best, worst } = getBestWorst(values, false); // Lower is better
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value, 0)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('dpo')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.dpo || null);
                                const { best, worst } = getBestWorst(values); // Higher is generally better
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value, 0)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">{tFinancial('cashConversionCycle')}</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.cashConversionCycle || null);
                                const { best, worst } = getBestWorst(values, false); // Lower is better
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value, 0)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Trend Charts — Revenue & Profit over years */}
              {trendChartData.length > 1 && (
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
                              <YAxis tickFormatter={(v) => `€${(v / 1000000).toFixed(0)}M`} tick={{ fill: 'var(--chart-text, #6b7280)', fontSize: 12 }} />
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
                              <YAxis tickFormatter={(v) => `€${(v / 1000000).toFixed(0)}M`} tick={{ fill: 'var(--chart-text, #6b7280)', fontSize: 12 }} />
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
              )}

              {/* Tax Payments Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('taxPayments.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('taxPayments.company')}</TableHead>
                          <TableHead className="text-right">{t('taxPayments.amount')} ({selectedYear})</TableHead>
                          <TableHead className="text-right">{t('taxBreakdown.iinAmount')}</TableHead>
                          <TableHead className="text-right">{t('taxBreakdown.vsaoiAmount')}</TableHead>
                          <TableHead className="text-right">{t('taxPayments.employeeCount')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companies.map((company) => {
                          const payment = getTaxPayment(company);
                          return (
                            <TableRow key={company.id}>
                              <TableCell className="font-medium">{company.name}</TableCell>
                              <TableCell className="text-right">
                                {payment ? formatCurrency(payment.amount) : t('taxPayments.noData')}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {payment?.iinAmount != null ? formatCurrency(payment.iinAmount) : '-'}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {payment?.vsaoiAmount != null ? formatCurrency(payment.vsaoiAmount) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {payment?.employeeCount ?? '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Tax Payments Line Chart */}
                  <div className="mt-6 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={taxPaymentsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis
                          tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                          domain={taxPaymentsYAxisDomain as [number, number]}
                        />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatCurrency(value as number)} />
                        <Legend formatter={(value) => <span className="text-foreground">{value}</span>} />
                        {companies.map((company, index) => (
                          <Line
                            key={company.id}
                            type="monotone"
                            dataKey={company.name}
                            stroke={getCompanyColor(index)}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
