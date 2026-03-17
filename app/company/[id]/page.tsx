'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Info, X } from 'lucide-react';
import type { Company } from '@/lib/types/company';
import { CompanySkeleton } from '@/components/company/company-skeleton';
import { CompanyError } from '@/components/company/company-error';
import { BasicTab } from '@/components/company/basic-tab';
import { PeopleTab } from '@/components/company/people-tab';
import { FinancialTab } from '@/components/company/financial-tab';
import { DocumentsTab } from '@/components/company/documents-tab';

export default function CompanyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('company');
  const tCommon = useTranslations('common');
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDataWarning, setShowDataWarning] = useState(true);

  const activeTab = searchParams.get('tab') || 'basic';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/company/${params.id}`);
        if (!response.ok) {
          throw new Error(t('notFound'));
        }
        const data = await response.json();
        setCompany(data.company);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [params.id, t]);

  useEffect(() => {
    if (company) {
      const shortName = company.cleanedShortName || company.name.replace(/^(Sabiedrība ar ierobežotu atbildību|Akciju sabiedrība)\s*/i, '').replace(/^[""]|[""]$/g, '');
      document.title = `${shortName} — Posterns`;
    }
    return () => { document.title = 'Posterns - Latvijas Uzņēmumu Analīzes Platforma'; };
  }, [company]);

  if (isLoading) {
    return <CompanySkeleton />;
  }

  if (error || !company) {
    return <CompanyError error={error} companyId={params.id as string} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />

      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
              <p className="text-slate-600">{company.registrationNumber}</p>
            </div>
            <Badge variant={company.status === 'REGISTERED' ? 'default' : 'destructive'} className="text-sm">
              {tCommon(`companyStatus.${company.status}`) || company.status}
            </Badge>
          </div>
        </div>
      </div>

      {company.isAnnulled && (
        <div className="container mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t('companyInfo.isAnnulledWarning')}
          </div>
        </div>
      )}

      {showDataWarning && (
        <div className="container mx-auto px-4 pt-4">
          <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" />
              {t('dataWarning')}
            </div>
            <button
              onClick={() => setShowDataWarning(false)}
              className="shrink-0 rounded-sm p-0.5 hover:bg-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border shadow-sm rounded-lg">
            <TabsTrigger value="basic" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">{t('tabs.basic')}</TabsTrigger>
            <TabsTrigger value="people" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">{t('tabs.people')}</TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">{t('tabs.financial')}</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">{t('tabs.documents')}</TabsTrigger>
          </TabsList>

          <BasicTab company={company} />
          <PeopleTab company={company} />
          <FinancialTab company={company} />
          <DocumentsTab company={company} />
        </Tabs>
      </main>
    </div>
  );
}
