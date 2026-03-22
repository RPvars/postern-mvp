'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { SECTION_ICONS } from '@/lib/industry-icons';

interface IndustrySection {
  code: string;
  nameLv: string;
  nameEn: string;
  level: number;
  companyCount: number;
  totalRevenue: number;
  totalEmployees: number;
}

export default function IndustriesPage() {
  const t = useTranslations('industries');
  const router = useRouter();
  const [sections, setSections] = useState<IndustrySection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/industries');
        if (res.ok) {
          setSections(await res.json());
        }
      } catch (err) {
        console.error('Failed to load industries:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section) => {
              const Icon = SECTION_ICONS[section.code] ?? Building2;
              return (
                <Card
                  key={section.code}
                  className="cursor-pointer transition-all hover:bg-accent/50 hover:shadow-md relative overflow-hidden"
                  onClick={(e) => {
                    const url = `/industries/${section.code}`;
                    if (e.metaKey || e.ctrlKey) {
                      window.open(url, '_blank');
                    } else {
                      router.push(url);
                    }
                  }}
                >
                  {/* Section letter — top-left corner */}
                  <span className="absolute top-2 left-3 text-[10px] font-bold text-muted-foreground/50">
                    {section.code}
                  </span>

                  <CardContent className="p-5 pt-7 flex flex-col items-center text-center gap-3">
                    {/* Icon */}
                    <Icon className="h-8 w-8 text-[#FEC200]" />

                    {/* Name */}
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                      {section.nameLv}
                    </h3>

                    {/* Stats row */}
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
