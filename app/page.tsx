'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SearchBar } from '@/components/search-bar';
import { Navigation } from '@/components/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BarChart3, Building2, TrendingUp, ChevronRight, ArrowDown, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { SECTION_ICONS } from '@/lib/industry-icons';
import { RankCell } from '@/components/industry/top-companies-table';

interface IndustrySection {
  code: string;
  nameLv: string;
  nameEn: string;
  companyCount: number;
}

interface TopCompanyItem {
  rank: number;
  registrationNumber: string;
  name: string;
  revenue: number | null;
  netIncome: number | null;
  rankChange: number | null;
  rankHistory: Record<number, number | null>;
}

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string>('latvia');
  const t = useTranslations('home');
  const common = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const [industries, setIndustries] = useState<IndustrySection[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [topCompanies, setTopCompanies] = useState<TopCompanyItem[]>([]);
  const [topYear, setTopYear] = useState<number | null>(null);
  const [loadingTop, setLoadingTop] = useState(true);
  const [topMetric, setTopMetric] = useState<'revenue' | 'profit'>('revenue');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const MAX_COMPARE = 5;

  const name = (item: { nameLv: string; nameEn: string }) =>
    locale === 'en' ? item.nameEn : item.nameLv;

  useEffect(() => {
    fetch('/api/industries')
      .then(r => r.ok ? r.json() : [])
      .then(data => setIndustries(data))
      .catch(() => {})
      .finally(() => setLoadingIndustries(false));
  }, []);

  useEffect(() => {
    setLoadingTop(true);
    fetch(`/api/companies/top?limit=50&metric=${topMetric}`)
      .then(r => r.ok ? r.json() : { companies: [], year: null })
      .then(data => {
        setTopCompanies(data.companies);
        setTopYear(data.year);
      })
      .catch(() => {})
      .finally(() => setLoadingTop(false));
  }, [topMetric]);

  const topIndustries = useMemo(
    () => [...industries].sort((a, b) => b.companyCount - a.companyCount).slice(0, 6),
    [industries]
  );

  const getHeaderText = () => t(`title.${selectedCountry}` as Parameters<typeof t>[0]);
  const getSubText = () => t(`subtitle.${selectedCountry}` as Parameters<typeof t>[0]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Geometric Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 dark:opacity-15"
          style={{ backgroundImage: 'url(/BG_2.avif)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center w-full space-y-12">
          <div className="text-center max-w-3xl">
            <h1 className="mb-4 text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              {getHeaderText()}
            </h1>
            <p className="text-xl text-muted-foreground">
              {getSubText()}
            </p>
          </div>

          <SearchBar country={selectedCountry} onCountryChange={setSelectedCountry} />
        </div>
      </main>

      {/* Enrichment sections */}
      <section className="bg-background border-t">
        {/* Quick Links */}
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Search, href: '/search', key: 'search' as const },
              { icon: BarChart3, href: '/compare', key: 'compare' as const },
              { icon: Building2, href: '/industries', key: 'industries' as const },
            ].map(({ icon: Icon, href, key }) => (
              <Link key={key} href={href}>
                <Card className="h-full cursor-pointer transition-all hover:bg-accent/50 hover:shadow-md group">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="bg-[#FEC200]/10 rounded-full p-3">
                      <Icon className="h-6 w-6 text-[#FEC200]" />
                    </div>
                    <h3 className="font-semibold text-foreground">{t(`quickLinks.${key}.title`)}</h3>
                    <p className="text-sm text-muted-foreground">{t(`quickLinks.${key}.description`)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Industry Preview */}
        <div className="container mx-auto px-4 py-12 max-w-5xl border-t">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">{t('industries.title')}</h2>
            <Link href="/industries" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              {t('industries.viewAll')}
            </Link>
          </div>
          {loadingIndustries ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-14" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {topIndustries.map((section) => {
                const Icon = SECTION_ICONS[section.code] ?? Building2;
                return (
                  <Card
                    key={section.code}
                    className="cursor-pointer transition-all hover:bg-accent/50 hover:shadow-md group"
                    onClick={(e) => {
                      const url = `/industries/${section.code}`;
                      e.metaKey || e.ctrlKey ? window.open(url, '_blank') : router.push(url);
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <div className="bg-muted/50 rounded-full p-2.5">
                        <Icon className="h-5 w-5 text-[#FEC200]" />
                      </div>
                      <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                        {name(section)}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        {section.companyCount.toLocaleString(locale === 'en' ? 'en-US' : 'lv-LV')} {t('industries.companies')}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Companies */}
        <div className="container mx-auto px-4 py-12 pb-20 max-w-5xl border-t">
          <h2 className="text-xl font-bold text-foreground mb-6">
            {t('topCompanies.title')}
            {topYear && <span className="text-muted-foreground font-normal text-base ml-2">({topYear})</span>}
          </h2>
          <p className="text-sm text-muted-foreground -mt-4 mb-6">{t('topCompanies.hint')}</p>
          {loadingTop ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-5 w-48" />
                  <div className="flex-1" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : topCompanies.length > 0 ? (
            <Card>
              {/* Column header */}
              <div className="flex items-center gap-4 px-4 py-2 border-b text-xs text-muted-foreground font-medium">
                <span className="w-8" />
                <span className="w-12">#</span>
                <span className="flex-1">{t('topCompanies.company')}</span>
                <button
                  onClick={() => setTopMetric('revenue')}
                  className={`inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors ${topMetric === 'revenue' ? 'text-foreground font-semibold' : ''}`}
                >
                  {t('topCompanies.revenue')}
                  {topMetric === 'revenue' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
                <button
                  onClick={() => setTopMetric('profit')}
                  className={`hidden md:inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors ${topMetric === 'profit' ? 'text-foreground font-semibold' : ''}`}
                >
                  {t('topCompanies.profit')}
                  {topMetric === 'profit' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
                <span className="w-4" />
              </div>
              <div className="divide-y">
                {topCompanies.map((company) => (
                  <div
                    key={company.registrationNumber}
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors group"
                    onClick={(e) => {
                      const url = `/company/${company.registrationNumber}`;
                      e.metaKey || e.ctrlKey ? window.open(url, '_blank') : router.push(url);
                    }}
                  >
                    <div className="w-8" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(company.registrationNumber)}
                        onChange={() => {
                          setSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(company.registrationNumber)) {
                              next.delete(company.registrationNumber);
                            } else if (next.size < MAX_COMPARE) {
                              next.add(company.registrationNumber);
                            }
                            return next;
                          });
                        }}
                        disabled={!selected.has(company.registrationNumber) && selected.size >= MAX_COMPARE}
                        title={!selected.has(company.registrationNumber) && selected.size >= MAX_COMPARE ? t('topCompanies.maxCompanies', { max: MAX_COMPARE }) : undefined}
                        className="h-3.5 w-3.5 rounded border-muted-foreground/30 accent-[#FEC200] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="w-12 text-sm font-medium text-muted-foreground">
                      <RankCell rank={company.rank} change={company.rankChange} history={company.rankHistory} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground text-sm truncate block">
                        {company.name}
                      </span>
                    </div>
                    <span className={`text-sm tabular-nums ${topMetric === 'revenue' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {formatCurrency(company.revenue ?? 0)}
                    </span>
                    <span className={`text-sm tabular-nums hidden md:inline ${topMetric === 'profit' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {formatCurrency(company.netIncome ?? 0)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {/* Compare sticky bar */}
          {selected.size >= 2 && (
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
              <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-5xl">
                <span className="text-sm text-muted-foreground">
                  {t('topCompanies.companiesSelected', { count: selected.size })}
                  {selected.size >= MAX_COMPARE && <span className="text-xs ml-2">{t('topCompanies.maxCompanies', { max: MAX_COMPARE })}</span>}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-xs px-3 py-1.5 rounded-md border hover:bg-accent text-muted-foreground"
                  >
                    {t('topCompanies.clear')}
                  </button>
                  <button
                    onClick={() => router.push(`/compare?companies=${Array.from(selected).join(',')}&compared=true`)}
                    className="text-sm px-4 py-1.5 rounded-md bg-[#FEC200] text-black font-medium hover:bg-[#FEC200]/90"
                  >
                    {t('topCompanies.compare')} →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Compare CTA */}
        <div className="container mx-auto px-4 py-16 max-w-5xl border-t">
          <div className="rounded-xl border bg-card p-8 md:p-12 text-center">
            <div className="bg-[#FEC200]/10 rounded-full p-4 w-fit mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-[#FEC200]" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              {t('compareCta.title')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              {t('compareCta.description')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/compare?companies=40003053029,40003520643,40003032949&compared=true"
                className="px-6 py-2.5 rounded-md bg-[#FEC200] text-black font-medium hover:bg-[#FEC200]/90 transition-colors"
              >
                {t('compareCta.tryIt')}
              </Link>
              <span className="text-sm text-muted-foreground">{t('compareCta.or')}</span>
              <Link
                href="/compare"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                {t('compareCta.chooseOwn')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          {common('copyright', { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}

