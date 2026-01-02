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
import { Building2, Users, FileText, TrendingUp, Phone, Mail, MapPin, Calendar, AlertCircle, FolderOpen } from 'lucide-react';
import { OwnershipChart } from '@/components/ownership-chart';
import { FinancialRatiosDisplay } from '@/components/financial-ratios-display';

interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
  legalAddress: string;
  registrationDate: string;
  phone: string | null;
  email: string | null;

  // Business Status & Capital
  status: string;
  legalForm: string | null;
  registryName: string | null;
  shareCapital: number | null;
  shareCapitalRegisteredDate: string | null;
  registeredVehiclesCount: number | null;

  // Risk & Compliance
  hasEncumbrances: boolean;
  inLiquidation: boolean;
  inInsolvencyRegister: boolean;
  hasPaymentClaims: boolean;
  hasCommercialPledges: boolean;
  hasSecurities: boolean;
  hasTaxDebts: boolean;
  taxDebtsCheckedDate: string | null;

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
    notes: string | null;
  }[];
  boardMembers: {
    id: string;
    name: string;
    personalCode: string | null;
    institution: string | null;
    position: string | null;
    appointedDate: string | null;
    representationRights: string | null;
    notes: string | null;
  }[];
  beneficialOwners: {
    id: string;
    name: string;
    personalCode: string | null;
    dateFrom: string | null;
    residenceCountry: string | null;
    citizenship: string | null;
    controlType: string | null;
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
            <Badge variant={company.status === 'Aktīvs' ? 'default' : 'destructive'} className="text-sm">
              {tCommon(`companyStatus.${company.status}`) || company.status}
            </Badge>
          </div>
        </div>
      </div>

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
              {/* Company Information */}
              <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('companyInfo.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{t('companyInfo.registrationNumber')}</div>
                    <div className="text-sm text-muted-foreground">{company.registrationNumber}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{t('companyInfo.taxNumber')}</div>
                    <div className="text-sm text-muted-foreground">{company.taxNumber}</div>
                  </div>
                </div>
                {company.legalForm && (
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{t('companyInfo.legalForm')}</div>
                      <div className="text-sm text-muted-foreground">{company.legalForm}</div>
                    </div>
                  </div>
                )}
                {company.registryName && (
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{t('companyInfo.registry')}</div>
                      <div className="text-sm text-muted-foreground">{company.registryName}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{t('companyInfo.registrationDate')}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(company.registrationDate)}</div>
                  </div>
                </div>
                {company.shareCapital && (
                  <div className="flex items-start gap-2">
                    <TrendingUp className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{t('companyInfo.shareCapital')}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(company.shareCapital)}
                        {company.shareCapitalRegisteredDate && (
                          <span className="text-xs ml-1">
                            ({t('companyInfo.registered')} {formatDate(company.shareCapitalRegisteredDate)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {company.registeredVehiclesCount !== null && (
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{t('companyInfo.vehicles')}</div>
                      <div className="text-sm text-muted-foreground">{company.registeredVehiclesCount}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{t('companyInfo.legalAddress')}</div>
                    <div className="text-sm text-muted-foreground">{company.legalAddress}</div>
                  </div>
                </div>
                {company.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{t('companyInfo.phone')}</div>
                      <div className="text-sm text-muted-foreground">{company.phone}</div>
                    </div>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{t('companyInfo.email')}</div>
                      <div className="text-sm text-muted-foreground">{company.email}</div>
                    </div>
                  </div>
                )}
              </div>
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
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.insolvency')}</TableCell>
                    <TableCell className={company.inInsolvencyRegister ? 'text-[#FF8042] font-semibold' : ''}>
                      {company.inInsolvencyRegister ? t('risk.hasValue') : t('risk.noValue')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.paymentClaims')}</TableCell>
                    <TableCell>
                      {company.hasPaymentClaims ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#FF8042] font-semibold">{t('risk.hasValue')}</span>
                          <Badge variant="outline" className="bg-blue-50">{t('risk.loginRequired')}</Badge>
                        </div>
                      ) : (
                        t('risk.noValue')
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.commercialPledges')}</TableCell>
                    <TableCell className={company.hasCommercialPledges ? 'text-[#FF8042] font-semibold' : ''}>
                      {company.hasCommercialPledges ? t('risk.hasValue') : t('risk.noValue')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.securities')}</TableCell>
                    <TableCell className={company.hasSecurities ? 'text-[#FF8042] font-semibold' : ''}>
                      {company.hasSecurities ? t('risk.hasValue') : t('risk.noValue')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('risk.taxDebts')}</TableCell>
                    <TableCell>
                      <span className={company.hasTaxDebts ? 'text-[#FF8042] font-semibold' : ''}>
                        {company.hasTaxDebts ? t('risk.hasValue') : t('risk.noValue')}
                      </span>
                      {company.taxDebtsCheckedDate && (
                        <span className="text-sm text-muted-foreground ml-2">
                          {t('risk.asOf')} {formatDate(company.taxDebtsCheckedDate)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
              <div className="space-y-6">
                {/* Pie Chart */}
                <div className="flex items-center justify-center">
                  <OwnershipChart
                    owners={[...company.owners]
                      .sort((a, b) => b.sharePercentage - a.sharePercentage)
                      .map(o => ({
                        name: o.owner.name,
                        sharePercentage: o.sharePercentage
                      }))}
                  />
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...company.owners]
                        .sort((a, b) => b.sharePercentage - a.sharePercentage)
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
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
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
                          {member.institution || tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.position || tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.appointedDate ? formatDate(member.appointedDate) : tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.representationRights || tCommon('notAvailable')}
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
                          {owner.residenceCountry || tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.citizenship || tCommon('notAvailable')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.controlType || tCommon('notAvailable')}
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
            </CardContent>
          </Card>

              {/* Financial Ratios */}
              <div className="lg:col-span-2">
                <FinancialRatiosDisplay ratios={company.financialRatios} />
              </div>
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
