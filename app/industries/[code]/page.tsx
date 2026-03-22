'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ChevronRight } from 'lucide-react';
import { SECTION_ICONS } from '@/lib/industry-icons';
import { StatsCards } from '@/components/industry/stats-cards';
import { SubcategoryTabs } from '@/components/industry/subcategory-tabs';
import { TopCompaniesTable } from '@/components/industry/top-companies-table';
import type { Metric, TopCompany, IndustryData } from '@/components/industry/types';

export default function IndustryDetailPage() {
  const t = useTranslations('industries');
  const locale = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const n = (item: { nameLv: string; nameEn: string }) =>
    locale === 'en' ? item.nameEn : item.nameLv;

  const [data, setData] = useState<IndustryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<Metric>(
    (searchParams.get('metric') as Metric) || 'profit'
  );
  const [year, setYear] = useState<string>(searchParams.get('year') || '');
  const [activeSub, setActiveSub] = useState<string>(searchParams.get('sub') || '');

  const [displayStats, setDisplayStats] = useState<IndustryData['stats'] | null>(null);
  const [displayCompanies, setDisplayCompanies] = useState<TopCompany[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
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
        if (!activeSub) {
          setDisplayStats(result.stats);
          setDisplayCompanies(result.topCompanies);
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to load industry data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [code, metric, year]);

  useEffect(() => {
    fetchData();
    setActiveSub('');
  }, [fetchData]);

  useEffect(() => {
    if (!activeSub || !data) {
      if (data) {
        setDisplayStats(data.stats);
        setDisplayCompanies(data.topCompanies);
      }
      return;
    }

    const fetchSub = async () => {
      setSubLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('metric', metric);
        if (year) params.set('year', year);
        params.set('limit', '20');

        const res = await fetch(`/api/industries/${activeSub}?${params}`);
        if (res.ok) {
          const result = await res.json();
          setDisplayStats(result.stats);
          setDisplayCompanies(result.topCompanies);
        }
      } catch (err) {
        console.error('Failed to load sub-category:', err);
      } finally {
        setSubLoading(false);
      }
    };
    fetchSub();
  }, [activeSub, metric, year, data]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (metric !== 'profit') params.set('metric', metric);
    if (year && data?.availableYears && String(data.availableYears[0]) !== year) {
      params.set('year', year);
    }
    if (activeSub) params.set('sub', activeSub);
    const query = params.toString();
    const newUrl = `/industries/${code}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [code, metric, year, activeSub, data?.availableYears]);

  const sectionHeading = activeSub
    ? (() => { const c = data?.children.find(c => c.code === activeSub); return c ? n(c) : ''; })()
    : data && data.children.length > 1
      ? `${n(data.industry)} — ${t('allSubcategories')}`
      : data ? n(data.industry) : '';

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
                    {n(crumb)}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{n(crumb)}</span>
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
            {data ? n(data.industry) : <Skeleton className="h-8 w-64" />}
          </h1>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 pb-20 max-w-7xl">
        {error && !data ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('errorLoading')}</p>
              <button
                onClick={() => fetchData()}
                className="text-sm px-4 py-2 rounded-md bg-[#FEC200] text-black font-medium hover:bg-[#FEC200]/90"
              >
                {t('retry')}
              </button>
            </CardContent>
          </Card>
        ) : loading && !data ? (
          <IndustrySkeleton />
        ) : data ? (
          <>
            <SubcategoryTabs
              children={data.children}
              activeSub={activeSub}
              onSelect={setActiveSub}
              name={n}
              t={t}
              locale={locale}
            />

            {/* Section heading for stats + table */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {sectionHeading}
                {year && <span className="text-muted-foreground font-normal text-base ml-2">({year})</span>}
              </h2>
              {activeSub && (
                <button
                  onClick={() => setActiveSub('')}
                  className="text-xs px-2 py-0.5 rounded bg-accent hover:bg-accent/80 text-muted-foreground"
                >
                  ✕ {t('showAll')}
                </button>
              )}
            </div>

            <div className={`relative transition-opacity duration-200 ${subLoading ? 'opacity-30 pointer-events-none' : ''}`}>
              <StatsCards stats={displayStats} t={t} locale={locale} />
              <TopCompaniesTable
                data={data}
                displayCompanies={displayCompanies}
                metric={metric}
                setMetric={setMetric}
                year={year}
                setYear={setYear}
                t={t}
                locale={locale}
              />
            </div>
            {subLoading && (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 border-2 border-[#FEC200] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
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
