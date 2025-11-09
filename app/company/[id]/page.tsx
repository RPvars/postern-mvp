'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, FileText, TrendingUp, Phone, Mail, MapPin, Calendar, AlertCircle } from 'lucide-react';
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
    netProfitMargin: number | null;
    grossProfitMargin: number | null;
    operatingProfitMargin: number | null;
    ebitdaMargin: number | null;
    cashFlowMargin: number | null;
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
    cashConversionCycle: number | null;
  }[];
}

export default function CompanyPage() {
  const params = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/company/${params.id}`);
        if (!response.ok) {
          throw new Error('Uzņēmums nav atrasts');
        }
        const data = await response.json();
        setCompany(data.company);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Neizdevās ielādēt uzņēmumu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [params.id]);

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
              <CardTitle>Kļūda</CardTitle>
              <CardDescription>{error || 'Uzņēmums nav atrasts'}</CardDescription>
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
              {company.status}
            </Badge>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Uzņēmuma Informācija
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Reģistrācijas numurs</div>
                    <div className="text-sm text-muted-foreground">{company.registrationNumber}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Nodokļu numurs</div>
                    <div className="text-sm text-muted-foreground">{company.taxNumber}</div>
                  </div>
                </div>
                {company.legalForm && (
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Juridiskā forma</div>
                      <div className="text-sm text-muted-foreground">{company.legalForm}</div>
                    </div>
                  </div>
                )}
                {company.registryName && (
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Reģistrs</div>
                      <div className="text-sm text-muted-foreground">{company.registryName}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Reģistrācijas datums</div>
                    <div className="text-sm text-muted-foreground">{formatDate(company.registrationDate)}</div>
                  </div>
                </div>
                {company.shareCapital && (
                  <div className="flex items-start gap-2">
                    <TrendingUp className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Pamatkapitāls</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(company.shareCapital)}
                        {company.shareCapitalRegisteredDate && (
                          <span className="text-xs ml-1">
                            (reģ. {formatDate(company.shareCapitalRegisteredDate)})
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
                      <div className="text-sm font-medium">CSDD reģistrētie transportlīdzekļi</div>
                      <div className="text-sm text-muted-foreground">{company.registeredVehiclesCount}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Juridiskā adrese</div>
                    <div className="text-sm text-muted-foreground">{company.legalAddress}</div>
                  </div>
                </div>
                {company.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Tālrunis</div>
                      <div className="text-sm text-muted-foreground">{company.phone}</div>
                    </div>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">E-pasts</div>
                      <div className="text-sm text-muted-foreground">{company.email}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Owners */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Īpašumtiesību Struktūra
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
                        <TableHead>Īpašnieks</TableHead>
                        <TableHead className="text-right">Daļa %</TableHead>
                        <TableHead className="text-right">Daļu skaits</TableHead>
                        <TableHead className="text-right">Kopējā vērtība</TableHead>
                        <TableHead className="text-right">Balsstiesības</TableHead>
                        <TableHead>Dalībnieks kopš</TableHead>
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
                              {ownership.sharesCount ?? 'N/A'}
                              {ownership.nominalValue && (
                                <div className="text-xs">
                                  ({formatCurrency(ownership.nominalValue)} nom.)
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {ownership.totalValue ? formatCurrency(ownership.totalValue) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {ownership.votingRights ? formatPercent(ownership.votingRights) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ownership.memberSince ? formatDate(ownership.memberSince) : 'N/A'}
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
                  Amatpersonas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vārds, uzvārds</TableHead>
                      <TableHead>Personas kods</TableHead>
                      <TableHead>Institūcija</TableHead>
                      <TableHead>Amats</TableHead>
                      <TableHead>Apstiprināšanas datums</TableHead>
                      <TableHead>Pārstāvības tiesības</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.boardMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.personalCode || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.institution || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.position || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.appointedDate ? formatDate(member.appointedDate) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.representationRights || 'N/A'}
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
                  Patiesie labuma guvēji
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vārds, uzvārds</TableHead>
                      <TableHead>Personas kods</TableHead>
                      <TableHead>Statuss kopš</TableHead>
                      <TableHead>Dzīvesvietas valsts</TableHead>
                      <TableHead>Pilsonība</TableHead>
                      <TableHead>Kontroles veids</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.beneficialOwners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">{owner.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.personalCode || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.dateFrom ? formatDate(owner.dateFrom) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.residenceCountry || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.citizenship || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner.controlType || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Risk & Compliance Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Apgrūtinājumi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Likvidācijas process</TableCell>
                    <TableCell className={company.inLiquidation ? 'text-[#FF8042] font-semibold' : ''}>
                      {company.inLiquidation ? 'Ir' : 'Nav'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Aktuāls ieraksts maksātnespējas reģistrā</TableCell>
                    <TableCell className={company.inInsolvencyRegister ? 'text-[#FF8042] font-semibold' : ''}>
                      {company.inInsolvencyRegister ? 'Ir' : 'Nav'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Aktuālās pretenzijas par maksājumiem</TableCell>
                    <TableCell>
                      {company.hasPaymentClaims ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#FF8042] font-semibold">Ir</span>
                          <Badge variant="outline" className="bg-blue-50">Pieslēgties</Badge>
                        </div>
                      ) : (
                        'Nav'
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Aktuāli komercķīlu akti</TableCell>
                    <TableCell className={company.hasCommercialPledges ? 'text-[#FF8042] font-semibold' : ''}>
                      {company.hasCommercialPledges ? 'Ir' : 'Nav'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Aktuālie nodrošinājumi</TableCell>
                    <TableCell className={company.hasSecurities ? 'text-[#FF8042] font-semibold' : ''}>
                      {company.hasSecurities ? 'Ir' : 'Nav'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Nodokļu parādi VID (uz datumu)</TableCell>
                    <TableCell>
                      <span className={company.hasTaxDebts ? 'text-[#FF8042] font-semibold' : ''}>
                        {company.hasTaxDebts ? 'Ir' : 'Nav'}
                      </span>
                      {company.taxDebtsCheckedDate && (
                        <span className="text-sm text-muted-foreground ml-2">
                          uz {formatDate(company.taxDebtsCheckedDate)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tax Payments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Nodokļu Maksājumi Valsts Budžetā
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gads</TableHead>
                    <TableHead>Summa</TableHead>
                    <TableHead>Datums</TableHead>
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
      </main>
    </div>
  );
}
