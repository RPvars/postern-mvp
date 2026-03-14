'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, FileText, TrendingUp, Phone, Mail, MapPin, Calendar, AlertCircle, FolderOpen, MessageSquare } from 'lucide-react';
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

  owners: {
    id: string;
    owner: {
      name: string;
      personalCode: string | null;
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
    date: string;
  }[];
  financialRatios: {
    id: string;
    year: number;
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
        <div className="mx-auto max-w-7xl p-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
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
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>{t('error')}</CardTitle>
              <CardDescription>{error || t('notFound')}</CardDescription>
            </CardHeader>
          </Card>
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
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.taxNumber')}</div>
                    <div className="text-sm text-muted-foreground italic">{t('companyInfo.vidDataRequired')}</div>
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
                  {!company.durationIndefinite && company.durationIndefinite == null && !company.businessPurpose && (
                    <div className="text-sm text-muted-foreground">{tCommon('notAvailable')}</div>
                  )}
                </CardContent>
              </Card>

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
                  <TableRow className="opacity-50">
                    <TableCell className="font-medium">{t('risk.insolvency')}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground italic">{t('risk.noDataSource')}</span>
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
                  <TableRow className="opacity-50">
                    <TableCell className="font-medium">{t('risk.taxDebts')}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground italic">{t('risk.noDataSource')}</span>
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
                        <TableCell className="font-medium">{ss.type}</TableCell>
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
                                <div className="font-medium">{ownership.owner.name}</div>
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
                      <TableHead>{t('boardMembers.institution')}</TableHead>
                      <TableHead>{t('boardMembers.position')}</TableHead>
                      <TableHead>{t('boardMembers.appointedDate')}</TableHead>
                      <TableHead>{t('boardMembers.representationRights')}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.boardMembers.map((member) => (
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
              {/* Tax Payments */}
              <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('taxPayments.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.taxPayments && company.taxPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('taxPayments.year')}</TableHead>
                    <TableHead>{t('taxPayments.amount')}</TableHead>
                    <TableHead>{t('taxPayments.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.taxPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.year}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(payment.date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4">{t('financial.noData')}</p>
              )}
            </CardContent>
          </Card>

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
    </div>
  );
}
