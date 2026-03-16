'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Users, FileText, TrendingUp, Calendar, AlertCircle, FolderOpen, MessageSquare, BarChart3, CheckCircle2, XCircle, ExternalLink, X, Info, Landmark, Globe, History, ArrowRightLeft, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { OwnershipChart } from '@/components/ownership-chart';
import { FinancialRatiosDisplay } from '@/components/financial-ratios-display';

interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
  legalAddress: string;
  postalCode: string | null;
  city: string | null;
  street: string | null;
  houseNumber: string | null;
  addressRegisterCode: number | null;
  atvkCode: string | null;
  registrationDate: string;
  phone: string | null;
  email: string | null;
  isAnnulled: boolean;

  // Business Status & Capital
  status: string;
  legalForm: string | null;
  registryName: string | null;
  register: string | null;
  cleanedShortName: string | null;
  lastModifiedAt: string | null;
  sepaCreditorId: string | null;
  vatPayer: {
    vatNumber: string;
    isActive: boolean;
    registeredDate: string | null;
    deregisteredDate: string | null;
  } | null;
  naceCode: string | null;
  naceDescription: string | null;
  stateAid: Array<{
    assignDate: string;
    projectTitle: string;
    assignerTitle: string;
    programTitle: string | null;
    amount: number;
    instrumentTitle: string | null;
  }>;
  previousNames: Array<{
    name: string;
    dateTo: string;
  }>;
  reorganizations: Array<{
    type: string;
    typeText: string;
    sourceRegcode: string;
    finalRegcode: string;
    registered: string;
  }>;
  businessPurpose: string | null;
  durationIndefinite: boolean | null;
  articlesDate: string | null;
  shareCapital: number | null;
  shareCapitalRegisteredDate: string | null;
  registeredVehiclesCount: number | null;
  sanctionsRisk: boolean;

  // Risk & Compliance
  hasEncumbrances: boolean;
  inLiquidation: boolean;
  inInsolvencyRegister: boolean;
  hasPaymentClaims: boolean;
  hasCommercialPledges: boolean;
  hasSecurities: boolean;
  hasTaxDebts: boolean;
  taxDebtsCheckedDate: string | null;
  specialStatuses: Array<{
    id: string;
    type: string;
    dateFrom: string;
    registeredOn?: string;
    isAnnulled: boolean;
  }>;
  securingMeasures: Array<Record<string, unknown>>;
  taxpayerRating: string | null;
  taxpayerRatingDescription: string | null;
  insolvencyProceedings: Array<{
    proceedingForm: string | null;
    status: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    court: string | null;
  }>;

  owners: {
    id: string;
    owner: {
      name: string;
      isLegalEntity: boolean;
      personalCode: string | null;
      country: string | null;
      isForeignEntity: boolean;
    };
    sharePercentage: number;
    sharesCount: number | null;
    nominalValue: number | null;
    totalValue: number | null;
    votingRights: number | null;
    memberSince: string | null;
    registeredOn: string | null;
    isPersonallyLiable: boolean;
    notes: string | null;
  }[];
  boardMembers: {
    id: string;
    name: string;
    personalCode: string | null;
    institution: string | null;
    position: string | null;
    appointedDate: string | null;
    endDate: string | null;
    representationRights: string | null;
    note: string | null;
  }[];
  beneficialOwners: {
    id: string;
    name: string;
    personalCode: string | null;
    dateFrom: string | null;
    registeredOn: string | null;
    residenceCountry: string | null;
    citizenship: string | null;
    controlType: string | null;
    birthDate: string | null;
    isMinor: boolean;
  }[];
  taxPayments: {
    id: string;
    year: number;
    amount: number;
    iinAmount: number | null;
    vsaoiAmount: number | null;
    employeeCount: number | null;
  }[];
  financialRatios: {
    year: number;
    // Raw financial figures
    revenue: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    equity: number | null;
    totalDebt: number | null;
    employees: number | null;
    // Profitability Ratios
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
    // Liquidity Ratios
    currentRatio: number | null;
    quickRatio: number | null;
    cashRatio: number | null;
    workingCapitalRatio: number | null;
    // Leverage Ratios
    debtToEquity: number | null;
    debtRatio: number | null;
    interestCoverageRatio: number | null;
    equityMultiplier: number | null;
    // Efficiency Ratios
    assetTurnover: number | null;
    inventoryTurnover: number | null;
    receivablesTurnover: number | null;
    payablesTurnover: number | null;
    dso: number | null;
    dpo: number | null;
    cashConversionCycle: number | null;
  }[];
}

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
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [ownersLimit, setOwnersLimit] = useState(10);
  const [stateAidLimit, setStateAidLimit] = useState(3);
  const [showDataWarning, setShowDataWarning] = useState(true);
  const [foreignEntityDetail, setForeignEntityDetail] = useState<Company['owners'][number] | null>(null);
  const [boardSort, setBoardSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  // Get active tab from URL or default to 'basic'
  const activeTab = searchParams.get('tab') || 'basic';

  // Handler to update tab in URL
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('lv-LV', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lv-LV');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-6">
            <Skeleton className="h-9 w-80 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-32 mb-1" />
                <Skeleton className="h-4 w-64" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <div className="flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="bg-red-50 rounded-full p-5">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-2">
              {error || t('notFound')}
            </h1>

            <p className="text-slate-500 mb-2 leading-relaxed text-sm">
              {t('errorDescription')}
            </p>

            {params.id && (
              <p className="text-xs font-mono text-slate-400 mb-6">
                {params.id}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-[#FEC200] px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-[#e5af00] transition-colors"
              >
                {t('backToSearch')}
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {t('tryAgain')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

          {/* Tab 1: Pamatinformācija */}
          <TabsContent value="basic">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pamatdati */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    {t('companyInfo.basicData')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {company.cleanedShortName && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.shortName')}</div>
                      <div className="text-sm">{company.cleanedShortName}</div>
                    </div>
                  )}
                  {company.legalForm && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.legalForm')}</div>
                      <div className="text-sm">{tCommon(`legalForm.${company.legalForm}`) || company.legalForm}</div>
                    </div>
                  )}
                  {company.register && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.register')}</div>
                      <div className="text-sm">{tCommon(`register.${company.register}`) || company.register}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.legalAddress')}</div>
                    <div className="text-sm">{company.legalAddress}</div>
                  </div>
                  {company.phone && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.phone')}</div>
                      <div className="text-sm">{company.phone}</div>
                    </div>
                  )}
                  {company.email && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.email')}</div>
                      <div className="text-sm">{company.email}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reģistrācija */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4" />
                    {t('companyInfo.registrationSection')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.registrationNumberDate')}</div>
                    <div className="text-sm">{company.registrationNumber}, {formatDate(company.registrationDate)}</div>
                  </div>
                  {company.articlesDate && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.articlesDate')}</div>
                      <div className="text-sm">{formatDate(company.articlesDate)}</div>
                    </div>
                  )}
                  {company.lastModifiedAt && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.lastModified')}</div>
                      <div className="text-sm">{formatDate(company.lastModifiedAt)}</div>
                    </div>
                  )}
                  {company.sepaCreditorId && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.sepaId')}</div>
                      <div className="text-sm font-mono">{company.sepaCreditorId}</div>
                    </div>
                  )}
                  {/* PVN maksātāju reģistrs */}
                  <div className="border-t pt-3 mt-1">
                    <div className="text-xs font-medium text-muted-foreground">{t('vatRegistry.title')}</div>
                    {company.vatPayer ? (
                      <div>
                        <div className="text-sm flex items-center gap-1 flex-wrap">
                          <span className="font-medium">{company.vatPayer.vatNumber}</span>
                          <span className="text-muted-foreground">·</span>
                          {company.vatPayer.isActive ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t('vatRegistry.active')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <XCircle className="h-3.5 w-3.5" />
                              {t('vatRegistry.inactive')}
                            </span>
                          )}
                          {company.vatPayer.registeredDate && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">{t('vatRegistry.registered')} {formatDate(company.vatPayer.registeredDate)}</span>
                            </>
                          )}
                          {company.vatPayer.deregisteredDate && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">{t('vatRegistry.deregistered')} {formatDate(company.vatPayer.deregisteredDate)}</span>
                            </>
                          )}
                        </div>
                        <a
                          href="https://ec.europa.eu/taxation_customs/vies/#/vat-validation"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1"
                        >
                          {t('vatRegistry.viewEuRegistry')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">{t('vatRegistry.notRegistered')}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Kapitāls */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    {t('companyInfo.capital')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {company.shareCapital ? (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.shareCapital')}</div>
                      <div className="text-sm">
                        {formatCurrency(company.shareCapital)}
                        {company.shareCapitalRegisteredDate && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({t('companyInfo.registered')} {formatDate(company.shareCapitalRegisteredDate)})
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{tCommon('notAvailable')}</div>
                  )}
                  {company.registeredVehiclesCount != null && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.vehicles')}</div>
                      <div className="text-sm">{company.registeredVehiclesCount}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Darbība */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    {t('companyInfo.operations')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {company.naceCode && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.naceCode')}</div>
                      <div className="text-sm">
                        {company.naceDescription || company.naceCode}
                        <span className="text-muted-foreground ml-1">({company.naceCode})</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t('companyInfo.naceSource')}</div>
                    </div>
                  )}
                  {company.durationIndefinite != null && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.duration')}</div>
                      <div className="text-sm">
                        {company.durationIndefinite ? t('companyInfo.durationIndefinite') : t('companyInfo.durationDefinite')}
                      </div>
                    </div>
                  )}
                  {company.businessPurpose && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.businessPurpose')}</div>
                      <div className="text-sm">{company.businessPurpose}</div>
                    </div>
                  )}
                  {!company.naceCode && !company.durationIndefinite && company.durationIndefinite == null && !company.businessPurpose && (
                    <div className="text-sm text-muted-foreground">{tCommon('notAvailable')}</div>
                  )}
                </CardContent>
              </Card>

              {/* Valsts atbalsts (de minimis) */}
              {company.stateAid && company.stateAid.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Landmark className="h-4 w-4" />
                      {t('stateAid.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('stateAid.totalAmount')}: {company.stateAid.reduce((sum, sa) => sum + sa.amount, 0).toLocaleString('lv-LV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y">
                      {company.stateAid.slice(0, stateAidLimit).map((sa, idx) => (
                        <div key={idx} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-baseline justify-between gap-4 mb-1">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(sa.assignDate)}</span>
                            <span className="text-sm font-mono font-medium whitespace-nowrap">
                              {sa.amount.toLocaleString('lv-LV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                            </span>
                          </div>
                          <div className="text-sm">{sa.projectTitle}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {sa.assignerTitle}
                            {sa.programTitle && <> · {sa.programTitle}</>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {company.stateAid.length > 3 && (
                      <div className="border-t pt-4 mt-2 space-y-2">
                        <div className="text-center text-xs text-muted-foreground">
                          {t('ownership.showing', { count: Math.min(stateAidLimit, company.stateAid.length), total: company.stateAid.length })}
                        </div>
                        {stateAidLimit < company.stateAid.length ? (
                          <button
                            onClick={() => setStateAidLimit(company.stateAid.length)}
                            className="w-full rounded-md bg-black text-white py-2.5 text-sm font-medium hover:bg-black/90 transition-colors"
                          >
                            {t('ownership.showMore')}
                          </button>
                        ) : (
                          <button
                            onClick={() => setStateAidLimit(3)}
                            className="w-full rounded-md bg-black text-white py-2.5 text-sm font-medium hover:bg-black/90 transition-colors"
                          >
                            {t('ownership.showLess')}
                          </button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

          {/* Risk & Compliance Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('risk.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.liquidation')}</TableCell>
                    <TableCell className={company.inLiquidation ? 'text-[#FF8042] font-semibold' : ''}>
                      {company.inLiquidation ? t('risk.hasValue') : t('risk.noValue')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.insolvency')}</TableCell>
                    <TableCell className={company.inInsolvencyRegister ? 'text-red-600 font-semibold' : ''}>
                      {company.inInsolvencyRegister ? t('risk.hasValue') : t('risk.noValue')}
                    </TableCell>
                  </TableRow>
                  <TableRow className="opacity-50">
                    <TableCell className="font-medium">{t('risk.paymentClaims')}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground italic">{t('risk.noDataSource')}</span>
                    </TableCell>
                  </TableRow>
                  <TableRow className="opacity-50">
                    <TableCell className="font-medium">{t('risk.commercialPledges')}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground italic">{t('risk.noDataSource')}</span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.securities')}</TableCell>
                    <TableCell className={company.hasSecurities ? 'text-[#FF8042] font-semibold' : ''}>
                      {company.hasSecurities
                        ? `${t('risk.hasValue')} (${company.securingMeasures.length})`
                        : t('risk.noValue')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.sanctionsRisk')}</TableCell>
                    <TableCell className={company.sanctionsRisk ? 'text-red-600 font-semibold' : ''}>
                      {company.sanctionsRisk ? t('risk.hasValue') : t('risk.noValue')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.taxpayerRating')}</TableCell>
                    <TableCell>
                      {company.taxpayerRating ? (
                        <span className={`font-semibold ${
                          company.taxpayerRating === 'A' ? 'text-green-600' :
                          company.taxpayerRating === 'B' ? 'text-yellow-600' :
                          company.taxpayerRating === 'C' ? 'text-red-600' :
                          'text-muted-foreground'
                        }`}>
                          {company.taxpayerRating}
                          {company.taxpayerRatingDescription && (
                            <span className="font-normal text-muted-foreground text-sm ml-2">
                              ({company.taxpayerRatingDescription})
                            </span>
                          )}
                        </span>
                      ) : t('risk.noValue')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {company.specialStatuses.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {t('companyInfo.specialStatuses')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('companyInfo.specialStatusType')}</TableHead>
                      <TableHead>{t('companyInfo.specialStatusDateFrom')}</TableHead>
                      <TableHead>{t('companyInfo.specialStatusRegisteredOn')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.specialStatuses.map((ss) => (
                      <TableRow key={ss.id}>
                        <TableCell className="font-medium">{tCommon(`specialStatus.${ss.type}`) || ss.type}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(ss.dateFrom)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {ss.registeredOn ? formatDate(ss.registeredOn) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {company.previousNames.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  {t('previousNames.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {company.previousNames.map((pn, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b last:border-0">
                      <span className="text-sm font-medium">{pn.name}</span>
                      <span className="text-sm text-muted-foreground">{t('previousNames.validUntil')} {formatDate(pn.dateTo)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {company.reorganizations.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowRightLeft className="h-4 w-4" />
                  {t('reorganizations.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {company.reorganizations.map((reorg, i) => (
                    <div key={i} className="py-2 border-b last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{tCommon(`reorganizationType.${reorg.type}`) || reorg.typeText}</Badge>
                        <span className="text-sm text-muted-foreground">{formatDate(reorg.registered)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {/^\d{11}$/.test(reorg.sourceRegcode) ? (
                          <Link href={`/company/${reorg.sourceRegcode}`} className="text-primary hover:underline">
                            {reorg.sourceRegcode}
                          </Link>
                        ) : (
                          <span>{reorg.sourceRegcode}</span>
                        )}
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        {/^\d{11}$/.test(reorg.finalRegcode) ? (
                          <Link href={`/company/${reorg.finalRegcode}`} className="text-primary hover:underline">
                            {reorg.finalRegcode}
                          </Link>
                        ) : (
                          <span>{reorg.finalRegcode}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

            </div>
          </TabsContent>

          {/* Tab 2: Personas */}
          <TabsContent value="people">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Owners */}
              <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('ownership.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.owners && company.owners.length > 0 ? (
              <div className="space-y-6">
                {/* Summary + Pie Chart */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Summary Stats */}
                  <div className="flex flex-col justify-center space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">{t('ownership.totalOwners')}</div>
                        <div className="text-2xl font-bold">{company.owners.length}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">{t('ownership.totalShares')}</div>
                        <div className="text-2xl font-bold">
                          {company.owners.reduce((sum, o) => sum + (o.sharesCount ?? 0), 0).toLocaleString('lv-LV')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">{t('ownership.totalCapital')}</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(company.owners.reduce((sum, o) => sum + (o.totalValue ?? 0), 0))}
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">{t('ownership.personallyLiableCount')}</div>
                        <div className="text-2xl font-bold">
                          {company.owners.filter(o => o.isPersonallyLiable).length}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Pie Chart */}
                  <div className="flex items-center justify-center">
                    <OwnershipChart
                      owners={[...company.owners]
                        .sort((a, b) => b.sharePercentage - a.sharePercentage)
                        .map(o => ({
                          name: o.owner.name,
                          sharePercentage: o.sharePercentage
                        }))}
                      otherLabel={t('ownership.other')}
                    />
                  </div>
                </div>

                {/* Detailed Ownership Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('ownership.owner')}</TableHead>
                        <TableHead className="text-right">{t('ownership.sharePercent')}</TableHead>
                        <TableHead className="text-right">{t('ownership.sharesCount')}</TableHead>
                        <TableHead className="text-right">{t('ownership.totalValue')}</TableHead>
                        <TableHead className="text-right">{t('ownership.votingRights')}</TableHead>
                        <TableHead>{t('ownership.memberSince')}</TableHead>
                        <TableHead>{t('ownership.registeredOn')}</TableHead>
                        <TableHead>{t('ownership.personallyLiable')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...company.owners]
                        .sort((a, b) => b.sharePercentage - a.sharePercentage)
                        .slice(0, ownersLimit)
                        .map((ownership) => (
                          <TableRow key={ownership.id}>
                            <TableCell>
                              <div>
                                {ownership.owner.isLegalEntity && ownership.owner.personalCode && /^\d{11}$/.test(ownership.owner.personalCode) ? (
                                  <Link href={`/company/${ownership.owner.personalCode}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                                    {ownership.owner.name}
                                    <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                                  </Link>
                                ) : ownership.owner.isForeignEntity ? (
                                  <button
                                    onClick={() => setForeignEntityDetail(ownership)}
                                    className="font-medium text-primary hover:underline inline-flex items-center gap-1 text-left"
                                  >
                                    <Globe className="h-3.5 w-3.5 shrink-0" />
                                    {ownership.owner.name}
                                    <Info className="h-3 w-3 shrink-0 opacity-50" />
                                  </button>
                                ) : ownership.owner.isLegalEntity ? (
                                  <div className="font-medium inline-flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    {ownership.owner.name}
                                  </div>
                                ) : (
                                  <div className="font-medium">{ownership.owner.name}</div>
                                )}
                                {ownership.owner.personalCode && (
                                  <div className="text-xs text-muted-foreground">
                                    {ownership.owner.personalCode}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">
                                {ownership.sharePercentage}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {ownership.sharesCount ?? tCommon('notAvailable')}
                              {ownership.nominalValue && (
                                <div className="text-xs">
                                  ({formatCurrency(ownership.nominalValue)} {t('ownership.nominal')})
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {ownership.totalValue ? formatCurrency(ownership.totalValue) : tCommon('notAvailable')}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {ownership.votingRights ? formatPercent(ownership.votingRights) : tCommon('notAvailable')}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ownership.memberSince ? formatDate(ownership.memberSince) : tCommon('notAvailable')}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ownership.registeredOn ? formatDate(ownership.registeredOn) : tCommon('notAvailable')}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ownership.isPersonallyLiable ? tCommon('yes') : tCommon('no')}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
                {company.owners.length > 10 && (
                  <div className="border-t pt-4 mt-2 space-y-2">
                    <div className="text-center text-xs text-muted-foreground">
                      {t('ownership.showing', { count: Math.min(ownersLimit, company.owners.length), total: company.owners.length })}
                    </div>
                    {ownersLimit < company.owners.length ? (
                      <button
                        onClick={() => setOwnersLimit(prev => prev + 25)}
                        className="w-full rounded-md bg-black text-white py-2.5 text-sm font-medium hover:bg-black/90 transition-colors"
                      >
                        {t('ownership.showMore')} (+25)
                      </button>
                    ) : (
                      <button
                        onClick={() => setOwnersLimit(10)}
                        className="w-full rounded-md bg-black text-white py-2.5 text-sm font-medium hover:bg-black/90 transition-colors"
                      >
                        {t('ownership.showLess')}
                      </button>
                    )}
                  </div>
                )}
              </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">{t('ownership.noData')}</p>
              )}
            </CardContent>
          </Card>

          {/* Board Members */}
          {company.boardMembers.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('boardMembers.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('boardMembers.name')}</TableHead>
                      <TableHead>{t('boardMembers.personalCode')}</TableHead>
                      <TableHead>
                        <button
                          onClick={() => setBoardSort(prev =>
                            prev?.key === 'institution' ? (prev.dir === 'asc' ? { key: 'institution', dir: 'desc' } : null) : { key: 'institution', dir: 'asc' }
                          )}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {t('boardMembers.institution')}
                          {boardSort?.key === 'institution' ? (boardSort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => setBoardSort(prev =>
                            prev?.key === 'position' ? (prev.dir === 'asc' ? { key: 'position', dir: 'desc' } : null) : { key: 'position', dir: 'asc' }
                          )}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {t('boardMembers.position')}
                          {boardSort?.key === 'position' ? (boardSort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => setBoardSort(prev =>
                            prev?.key === 'appointedDate' ? (prev.dir === 'asc' ? { key: 'appointedDate', dir: 'desc' } : null) : { key: 'appointedDate', dir: 'asc' }
                          )}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {t('boardMembers.appointedDate')}
                          {boardSort?.key === 'appointedDate' ? (boardSort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </TableHead>
                      <TableHead>{t('boardMembers.representationRights')}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...company.boardMembers].sort((a, b) => {
                      if (!boardSort) return 0;
                      const { key, dir } = boardSort;
                      const mul = dir === 'asc' ? 1 : -1;
                      if (key === 'institution') return mul * (a.institution || '').localeCompare(b.institution || '');
                      if (key === 'position') return mul * (a.position || '').localeCompare(b.position || '');
                      if (key === 'appointedDate') {
                        const da = a.appointedDate ? new Date(a.appointedDate).getTime() : 0;
                        const db = b.appointedDate ? new Date(b.appointedDate).getTime() : 0;
                        return mul * (da - db);
                      }
                      return 0;
                    }).map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.personalCode || tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.institution ? (tCommon(`governingBody.${member.institution}`) || member.institution) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.position ? (tCommon(`position.${member.position}`) || member.position) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.appointedDate ? formatDate(member.appointedDate) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.representationRights ? (
                            member.representationRights.startsWith('WITH_AT_LEAST:')
                              ? tCommon('representationRights.WITH_AT_LEAST', { count: member.representationRights.split(':')[1] })
                              : (tCommon(`representationRights.${member.representationRights}`) || member.representationRights)
                          ) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="relative">
                          {member.note && (
                            <>
                              <button
                                onClick={() => setExpandedNotes(prev => {
                                  const next = new Set(prev);
                                  if (next.has(member.id)) next.delete(member.id);
                                  else next.add(member.id);
                                  return next;
                                })}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                              {expandedNotes.has(member.id) && (
                                <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md">
                                  {member.note}
                                </div>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Beneficial Owners */}
          {company.beneficialOwners.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('beneficialOwners.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('beneficialOwners.name')}</TableHead>
                      <TableHead>{t('beneficialOwners.personalCode')}</TableHead>
                      <TableHead>{t('beneficialOwners.statusSince')}</TableHead>
                      <TableHead>{t('beneficialOwners.residenceCountry')}</TableHead>
                      <TableHead>{t('beneficialOwners.citizenship')}</TableHead>
                      <TableHead>{t('beneficialOwners.controlType')}</TableHead>
                      <TableHead>{t('beneficialOwners.birthDate')}</TableHead>
                      <TableHead>{t('beneficialOwners.registeredOn')}</TableHead>
                      <TableHead>{t('beneficialOwners.isMinor')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.beneficialOwners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">{owner.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.personalCode || tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.dateFrom ? formatDate(owner.dateFrom) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.residenceCountry ? (tCommon(`country.${owner.residenceCountry}`) || owner.residenceCountry) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.citizenship ? (tCommon(`country.${owner.citizenship}`) || owner.citizenship) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.controlType ? (tCommon(`controlType.${owner.controlType}`) || owner.controlType) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.birthDate ? formatDate(owner.birthDate) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.registeredOn ? formatDate(owner.registeredOn) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.isMinor ? tCommon('yes') : tCommon('no')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
            </div>
          </TabsContent>

          {/* Tab 3: Finanšu informācija */}
          <TabsContent value="financial">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Financial Summary Table */}
              {company.financialRatios && company.financialRatios.length > 0 && (() => {
                const recentYears = company.financialRatios.slice(0, 3);
                const summaryRows: { label: string; key: string; format: 'currency' | 'ratio' | 'percent' | 'integer' }[] = [
                  { label: t('financialSummary.netIncome'), key: 'netIncome', format: 'currency' },
                  { label: t('financialSummary.revenue'), key: 'revenue', format: 'currency' },
                  { label: t('financialSummary.totalAssets'), key: 'totalAssets', format: 'currency' },
                  { label: t('financialSummary.equity'), key: 'equity', format: 'currency' },
                  { label: t('financialSummary.totalDebt'), key: 'totalDebt', format: 'currency' },
                  { label: t('financialSummary.liquidityRatio'), key: 'currentRatio', format: 'ratio' },
                  { label: t('financialSummary.returnOnAssets'), key: 'returnOnAssets', format: 'percent' },
                  { label: t('financialSummary.employees'), key: 'employees', format: 'integer' },
                ];

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

                return (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        {t('financialSummary.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead></TableHead>
                            {recentYears.map((ry) => (
                              <TableHead key={ry.year} className="text-right">{ry.year}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summaryRows.map((row) => (
                            <TableRow key={row.key}>
                              <TableCell className="font-medium">{row.label}</TableCell>
                              {recentYears.map((ry, idx) => {
                                const value = (ry as Record<string, number | null>)[row.key] ?? null;
                                const prevYear = recentYears[idx + 1];
                                const prevValue = prevYear ? (prevYear as Record<string, number | null>)[row.key] ?? null : null;
                                const trend = getTrend(value, prevValue);
                                return (
                                  <TableCell key={ry.year} className="text-right">
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
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Tax Payments */}
              {company.taxPayments && company.taxPayments.length > 0 && (() => {
                const recentTax = company.taxPayments.slice(0, 3);
                const taxRows: { label: string; key: 'amount' | 'iinAmount' | 'vsaoiAmount' | 'employeeCount'; format: 'currency' | 'integer' }[] = [
                  { label: t('taxPayments.amount'), key: 'amount', format: 'currency' },
                  { label: t('taxPayments.iinAmount'), key: 'iinAmount', format: 'currency' },
                  { label: t('taxPayments.vsaoiAmount'), key: 'vsaoiAmount', format: 'currency' },
                  { label: t('taxPayments.employeeCount'), key: 'employeeCount', format: 'integer' },
                ];

                const getTaxTrend = (current: number | null, previous: number | null) => {
                  if (current == null || previous == null || previous === 0) return null;
                  return current > previous ? 'up' : current < previous ? 'down' : null;
                };

                return (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {t('taxPayments.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead></TableHead>
                            {recentTax.map((tp) => (
                              <TableHead key={tp.year} className="text-right">{tp.year}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taxRows.map((row) => (
                            <TableRow key={row.key}>
                              <TableCell className="font-medium">{row.label}</TableCell>
                              {recentTax.map((tp, idx) => {
                                const value = tp[row.key];
                                const prevTp = recentTax[idx + 1];
                                const prevValue = prevTp ? prevTp[row.key] : null;
                                const trend = getTaxTrend(value, prevValue);
                                return (
                                  <TableCell key={tp.year} className="text-right">
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
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Financial Ratios */}
              {company.financialRatios && company.financialRatios.length > 0 && (
              <div className="lg:col-span-2">
                <FinancialRatiosDisplay ratios={company.financialRatios} />
              </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 4: Dokumenti */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  {t('documents.title')}
                </CardTitle>
                <CardDescription>
                  {t('documents.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  {t('documents.comingSoon')}
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  {t('documents.comingSoonDescription')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Foreign entity info dialog */}
      <Dialog open={!!foreignEntityDetail} onOpenChange={(open) => !open && setForeignEntityDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {foreignEntityDetail?.owner.name}
            </DialogTitle>
          </DialogHeader>
          {foreignEntityDetail && (
            <div className="space-y-3">
              {foreignEntityDetail.owner.personalCode && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('foreignEntity.registrationNumber')}</span>
                  <span className="text-sm font-mono">{foreignEntityDetail.owner.personalCode}</span>
                </div>
              )}
              {foreignEntityDetail.owner.country && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('foreignEntity.country')}</span>
                  <span className="text-sm">{tCommon(`country.${foreignEntityDetail.owner.country}`)}</span>
                </div>
              )}
              {foreignEntityDetail.memberSince && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('foreignEntity.memberSince')}</span>
                  <span className="text-sm">{formatDate(foreignEntityDetail.memberSince)}</span>
                </div>
              )}
              {foreignEntityDetail.sharePercentage > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('ownership.sharePercent')}</span>
                  <Badge variant="secondary">{foreignEntityDetail.sharePercentage}%</Badge>
                </div>
              )}
              {foreignEntityDetail.sharesCount != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('ownership.sharesCount')}</span>
                  <span className="text-sm">{foreignEntityDetail.sharesCount}</span>
                </div>
              )}
              {foreignEntityDetail.totalValue != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('ownership.totalValue')}</span>
                  <span className="text-sm font-medium">{formatCurrency(foreignEntityDetail.totalValue)}</span>
                </div>
              )}
              {!foreignEntityDetail.owner.personalCode && !foreignEntityDetail.owner.country && (
                <p className="text-sm text-muted-foreground italic">{t('foreignEntity.noAdditionalInfo')}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
