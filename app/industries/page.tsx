'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Building2, Users, TrendingUp, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { SECTION_ICONS } from '@/lib/industry-icons';
import { normalizeName } from '@/lib/text-utils';

interface IndustrySection {
  code: string;
  nameLv: string;
  nameEn: string;
  level: number;
  companyCount: number;
  totalRevenue: number;
  totalEmployees: number;
}

type SortKey = 'code' | 'companies' | 'revenue' | 'employees';

export default function IndustriesPage() {
  const t = useTranslations('industries');
  const locale = useLocale();
  const router = useRouter();
  const name = (item: { nameLv: string; nameEn: string }) =>
    locale === 'en' ? item.nameEn : item.nameLv;

  const [sections, setSections] = useState<IndustrySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('code');

  useEffect(() => {
    document.title = `${t('title')} — Posterns`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      setError(false);
      setLoading(true);
      try {
        const res = await fetch('/api/industries');
        if (res.ok) {
          setSections(await res.json());
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to load industries:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = sections;
    if (search.trim()) {
      const q = normalizeName(search);
      result = result.filter(s =>
        normalizeName(s.nameLv).includes(q)
        || normalizeName(s.nameEn).includes(q)
        || s.code.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'companies': return b.companyCount - a.companyCount;
        case 'revenue': return b.totalRevenue - a.totalRevenue;
        case 'employees': return b.totalEmployees - a.totalEmployees;
        default: return a.code.localeCompare(b.code);
      }
    });
  }, [sections, search, sortBy]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'code', label: t('sort.code') },
    { key: 'companies', label: t('sort.companies') },
    { key: 'revenue', label: t('sort.revenue') },
    { key: 'employees', label: t('sort.employees') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground">{t('allSections')}</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('errorLoading')}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm px-4 py-2 rounded-md bg-[#FEC200] text-black font-medium hover:bg-[#FEC200]/90"
              >
                {t('retry')}
              </button>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Search + Sort controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                      sortBy === opt.key
                        ? 'bg-link-accent/15 text-link-accent font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {t('noResults')}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((section) => {
                  const Icon = SECTION_ICONS[section.code] ?? Building2;
                  return (
                    <Card
                      key={section.code}
                      className="group cursor-pointer transition-all duration-150 hover:bg-accent/50 hover:shadow-md hover:scale-[1.01] relative overflow-hidden"
                      onClick={(e) => {
                        const url = `/industries/${section.code}`;
                        if (e.metaKey || e.ctrlKey) {
                          window.open(url, '_blank');
                        } else {
                          router.push(url);
                        }
                      }}
                    >
                      {/* Section letter badge — top-right */}
                      <span className="absolute top-2.5 right-3 text-xs font-bold text-link-accent/40 group-hover:text-link-accent/70 transition-colors">
                        {section.code}
                      </span>

                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Icon in circle */}
                          <div className="bg-muted/50 rounded-full p-2.5 shrink-0">
                            <Icon className="h-5 w-5 text-link-accent" />
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Name */}
                            <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-2">
                              {name(section)}
                            </h3>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {section.companyCount.toLocaleString('lv-LV')}
                              </span>
                              {section.totalEmployees > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {section.totalEmployees.toLocaleString('lv-LV')}
                                </span>
                              )}
                              {section.totalRevenue > 0 && (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {formatCurrency(section.totalRevenue)}
                                </span>
                              )}
                            </div>


                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
