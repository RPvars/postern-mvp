'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Info, X, ChevronDown } from 'lucide-react';
import type { Company } from '@/lib/types/company';
import { translateEnum } from '@/lib/i18n/translate-enum';
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
  const [basicData, setBasicData] = useState<Company | null>(null);
  const [peopleData, setPeopleData] = useState<Record<string, unknown> | null>(null);
  const [externalData, setExternalData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDataWarning, setShowDataWarning] = useState(true);
  const [dataWarningExpanded, setDataWarningExpanded] = useState(false);
  const [loadingPhases, setLoadingPhases] = useState({
    basic: true,
    people: true,
    external: true,
  });
  const activeTab = searchParams.get('tab') || 'basic';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Combine all phases into a single company object
  const company = useMemo(() => {
    if (!basicData) return null;
    return {
      ...basicData,
      ...(peopleData || {}),
      ...(externalData || {}),
    } as Company;
  }, [basicData, peopleData, externalData]);

  useEffect(() => {
    const id = params.id as string;

    setIsLoading(true);
    setError(null);
    setBasicData(null);
    setPeopleData(null);
    setExternalData(null);
    setLoadingPhases({ basic: true, people: true, external: true });

    // Phase 1: Basic data (critical path — renders page header + Basic tab)
    fetch(`/api/company/${id}/basic`)
      .then(r => {
        if (!r.ok) throw new Error(t('notFound'));
        return r.json();
      })
      .then(data => {
        setBasicData(data.company);
        setLoadingPhases(prev => ({ ...prev, basic: false }));
        setIsLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : t('loadError'));
        setIsLoading(false);
      });

    // Phase 2: People data (name resolution — updates owners/boardMembers)
    fetch(`/api/company/${id}/people`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setPeopleData(data);
        setLoadingPhases(prev => ({ ...prev, people: false }));
      })
      .catch(() => {
        setLoadingPhases(prev => ({ ...prev, people: false }));
      });

    // Phase 3: External data (financial ratios + annual reports)
    fetch(`/api/company/${id}/external`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setExternalData(data);
        setLoadingPhases(prev => ({ ...prev, external: false }));
      })
      .catch(() => {
        setLoadingPhases(prev => ({ ...prev, external: false }));
      });
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
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
              <p className="text-muted-foreground">{company.registrationNumber}</p>
            </div>
            <Badge variant={company.status === 'REGISTERED' ? 'default' : 'destructive'} className="text-sm">
              {translateEnum(tCommon, `companyStatus.${company.status}`, company.status)}
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
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
            <div className="flex items-center justify-between gap-2 p-3">
              <button
                onClick={() => setDataWarningExpanded(!dataWarningExpanded)}
                className="flex items-center gap-2 text-left flex-1"
              >
                <Info className="h-4 w-4 shrink-0" />
                <span>{t('dataWarning')}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${dataWarningExpanded ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setShowDataWarning(false)}
                className="shrink-0 rounded-sm p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {dataWarningExpanded && (
              <div className="border-t border-amber-200 dark:border-amber-800 px-3 pb-3 pt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-amber-700 dark:text-amber-300">
                      <th className="text-left py-1 font-medium">{t('dataWarningTable.source')}</th>
                      <th className="text-left py-1 font-medium">{t('dataWarningTable.records')}</th>
                      <th className="text-left py-1 font-medium">{t('dataWarningTable.frequency')}</th>
                      <th className="text-left py-1 font-medium">{t('dataWarningTable.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-amber-800 dark:text-amber-200">
                    <tr><td className="py-1">{t('dataWarningTable.taxPayments')}</td><td>~428K</td><td>{t('dataWarningTable.yearly')}</td><td>{t('dataWarningTable.manual')}</td></tr>
                    <tr><td className="py-1">{t('dataWarningTable.vatRegistry')}</td><td>~280K</td><td>{t('dataWarningTable.monthly')}</td><td>{t('dataWarningTable.manual')}</td></tr>
                    <tr><td className="py-1">{t('dataWarningTable.taxpayerRating')}</td><td>~141K</td><td>{t('dataWarningTable.monthly')}</td><td>{t('dataWarningTable.manual')}</td></tr>
                    <tr><td className="py-1">{t('dataWarningTable.nameHistory')}</td><td>~93K</td><td>{t('dataWarningTable.monthly')}</td><td>{t('dataWarningTable.manual')}</td></tr>
                    <tr><td className="py-1">{t('dataWarningTable.insolvency')}</td><td>~17K</td><td>{t('dataWarningTable.ongoing')}</td><td>{t('dataWarningTable.manual')}</td></tr>
                    <tr><td className="py-1">{t('dataWarningTable.reorganizations')}</td><td>~10K</td><td>{t('dataWarningTable.monthly')}</td><td>{t('dataWarningTable.manual')}</td></tr>
                    <tr><td className="py-1">{t('dataWarningTable.stateAid')}</td><td>~5K</td><td>{t('dataWarningTable.ongoing')}</td><td>{t('dataWarningTable.manual')}</td></tr>
                    <tr><td className="py-1">{t('dataWarningTable.naceCodes')}</td><td>~2K</td><td>{t('dataWarningTable.yearly')}</td><td>{t('dataWarningTable.manual')}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card border shadow-sm rounded-lg">
            <TabsTrigger value="basic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">{t('tabs.basic')}</TabsTrigger>
            <TabsTrigger value="people" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">{t('tabs.people')}</TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">{t('tabs.financial')}</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">{t('tabs.documents')}</TabsTrigger>
          </TabsList>

          <BasicTab company={company} />
          <PeopleTab company={company} isResolvingNames={loadingPhases.people} />
          <FinancialTab company={company} isLoadingExternal={loadingPhases.external} />
          <DocumentsTab company={company} isLoadingExternal={loadingPhases.external} />
        </Tabs>
      </main>
    </div>
  );
}
