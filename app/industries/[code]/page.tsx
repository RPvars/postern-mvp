'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, TrendingUp, ChevronRight, Banknote, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { SECTION_ICONS } from '@/lib/industry-icons';

type Metric = 'revenue' | 'employees' | 'taxes' | 'profit';

interface BreadcrumbItem {
  code: string;
  nameLv: string;
  nameEn: string;
}

interface IndustryChild {
  code: string;
  nameLv: string;
  nameEn: string;
  level: number;
  companyCount: number;
}

interface TopCompany {
  registrationNumber: string;
  name: string;
  legalAddress: string;
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  employees: number | null;
  taxAmount: number | null;
  naceCode: string | null;
  naceDescription: string | null;
}

interface IndustryData {
  industry: { code: string; nameLv: string; nameEn: string; level: number; parentCode: string | null };
  breadcrumb: BreadcrumbItem[];
  children: IndustryChild[];
  stats: {
    totalCompanies: number;
    totalRevenue: number;
    totalEmployees: number;
    totalTaxes: number;
    avgRevenue: number;
  };
  topCompanies: TopCompany[];
  year: number;
  availableYears: number[];
}

export default function IndustryDetailPage() {
  const t = useTranslations('industries');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;

  const [data, setData] = useState<IndustryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>(
    (searchParams.get('metric') as Metric) || 'profit'
  );
  const [year, setYear] = useState<string>(searchParams.get('year') || '');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('metric', metric);
      if (year) params.set('year', year);
      params.set('limit', '20');

      const res = await fetch(`/api/industries/${code}?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        if (!year && result.year) {
          setYear(String(result.year));
        }
      }
    } catch (err) {
      console.error('Failed to load industry data:', err);
    } finally {
      setLoading(false);
    }
  }, [code, metric, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (metric !== 'profit') params.set('metric', metric);
    if (year && data?.availableYears && String(data.availableYears[0]) !== year) {
      params.set('year', year);
    }
    const query = params.toString();
    const newUrl = `/industries/${code}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [code, metric, year, data?.availableYears]);

  const fmt = (v: number | null) => v != null ? formatCurrency(v) : '—';
  const fmtNum = (v: number | null) => v != null ? v.toLocaleString('lv-LV') : '—';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-3 flex-wrap">
            <Link href="/industries" className="hover:text-foreground transition-colors">
              {t('title')}
            </Link>
            {data?.breadcrumb.map((crumb, i) => (
              <span key={crumb.code} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5" />
                {i < data.breadcrumb.length - 1 ? (
                  <Link
                    href={`/industries/${crumb.code}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.nameLv}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{crumb.nameLv}</span>
                )}
              </span>
            ))}
          </nav>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            {data && (() => {
              const sectionCode = data.breadcrumb[0]?.code ?? data.industry.code;
              const Icon = SECTION_ICONS[sectionCode] ?? Building2;
              return (
                <span className="inline-flex items-center justify-center w-10 h-10 shrink-0">
                  <Icon className="h-6 w-6 text-[#FEC200]" />
                </span>
              );
            })()}
            {data?.industry.nameLv ?? <Skeleton className="h-8 w-64" />}
          </h1>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {loading && !data ? (
          <IndustrySkeleton />
        ) : data ? (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label={t('stats.totalCompanies')}
                value={data.stats.totalCompanies.toLocaleString('lv-LV')}
                icon={<Building2 className="h-4 w-4" />}
              />
              <StatCard
                label={t('stats.totalRevenue')}
                value={data.stats.totalRevenue > 0 ? formatCurrency(data.stats.totalRevenue) : '—'}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                label={t('stats.totalEmployees')}
                value={data.stats.totalEmployees > 0 ? data.stats.totalEmployees.toLocaleString('lv-LV') : '—'}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label={t('stats.totalTaxes')}
                value={data.stats.totalTaxes > 0 ? formatCurrency(data.stats.totalTaxes) : '—'}
                icon={<Banknote className="h-4 w-4" />}
              />
            </div>

            {/* Subcategories */}
            {data.children.length > 1 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-3">{t('subcategories')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.children.map((child) => (
                    <Card
                      key={child.code}
                      className="cursor-pointer transition-colors hover:bg-accent/50"
                      onClick={(e) => {
                        const url = `/industries/${child.code}`;
                        e.metaKey || e.ctrlKey ? window.open(url, '_blank') : router.push(url);
                      }}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="shrink-0 font-mono text-xs">
                              {child.code}
                            </Badge>
                            <span className="text-sm truncate">{child.nameLv}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {child.companyCount.toLocaleString('lv-LV')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Top companies */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('topCompanies')}
                </h2>
                <div className="flex items-center gap-3">
                  {data.availableYears.length > 1 && (
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {data.availableYears.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {data.topCompanies.length > 0 ? (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">{t('rank')}</TableHead>
                          <TableHead>{t('companyName')}</TableHead>
                          <SortableHead metric="profit" current={metric} onSort={setMetric} label={t('metric.profit')} />
                          <SortableHead metric="revenue" current={metric} onSort={setMetric} label={t('metric.revenue')} className="hidden md:table-cell" />
                          <SortableHead metric="taxes" current={metric} onSort={setMetric} label={t('metric.taxes')} className="hidden lg:table-cell" />
                          <SortableHead metric="employees" current={metric} onSort={setMetric} label={t('metric.employees')} className="hidden lg:table-cell" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topCompanies.map((company, index) => (
                          <TableRow
                            key={company.registrationNumber}
                            className="cursor-pointer hover:bg-accent/50"
                            onClick={(e) => {
                              const url = `/company/${company.registrationNumber}`;
                              e.metaKey || e.ctrlKey ? window.open(url, '_blank') : router.push(url);
                            }}
                          >
                            <TableCell className="font-medium text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{company.name}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {company.legalAddress}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              <span className={metric === 'profit' ? 'font-semibold' : ''}>{fmt(company.netIncome)}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums hidden md:table-cell">
                              <span className={metric === 'revenue' ? 'font-semibold' : ''}>{fmt(company.revenue)}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums hidden lg:table-cell">
                              <span className={metric === 'taxes' ? 'font-semibold' : ''}>{fmt(company.taxAmount)}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums hidden lg:table-cell">
                              <span className={metric === 'employees' ? 'font-semibold' : ''}>{fmtNum(company.employees)}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {t('noData')}
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : null}
      </main>
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

function SortableHead({
  metric,
  current,
  onSort,
  label,
  className = '',
}: {
  metric: Metric;
  current: Metric;
  onSort: (m: Metric) => void;
  label: string;
  className?: string;
}) {
  const isActive = current === metric;
  return (
    <TableHead
      className={`text-right cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => onSort(metric)}
    >
      <span className={`inline-flex items-center gap-1 ${isActive ? 'text-foreground font-semibold' : ''}`}>
        {label}
        {isActive ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}

function IndustrySkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 px-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <Skeleton className="h-6 w-40 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-3 px-4">
                <Skeleton className="h-5 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <Card>
          <CardContent className="py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
