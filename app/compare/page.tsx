'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { CompanySelector } from '@/components/company-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Building2, AlertCircle } from 'lucide-react';

interface SelectedCompany {
  id: string;
  name: string;
  registrationNumber: string;
}

interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
  legalAddress: string;
  registrationDate: string;
  status: string;
  legalForm: string | null;
  shareCapital: number | null;
  registeredVehiclesCount: number | null;
  taxPayments: {
    year: number;
    amount: number;
    date: string;
  }[];
  financialRatios: {
    year: number;
    returnOnEquity: number | null;
    returnOnAssets: number | null;
    netProfitMargin: number | null;
    grossProfitMargin: number | null;
    operatingProfitMargin: number | null;
    ebitdaMargin: number | null;
    cashFlowMargin: number | null;
    currentRatio: number | null;
    quickRatio: number | null;
    cashRatio: number | null;
    workingCapitalRatio: number | null;
    debtToEquity: number | null;
    debtRatio: number | null;
    interestCoverageRatio: number | null;
    equityMultiplier: number | null;
    assetTurnover: number | null;
    inventoryTurnover: number | null;
    receivablesTurnover: number | null;
    payablesTurnover: number | null;
    cashConversionCycle: number | null;
  }[];
}

// Warm + cool accent color palette for maximum line contrast
// Maintains the Posterns brand vibe with strategic cool accents for distinction
const COMPANY_COLORS = [
  '#FEC200', // Posterns Yellow (main brand)
  '#F97316', // Vibrant Orange
  '#14B8A6', // Teal (cool accent - high contrast)
  '#DC2626', // Red (warm but distinct)
  '#0EA5E9', // Sky Blue (cool accent - high contrast)
];

// Get color for a company by index
const getCompanyColor = (index: number): string => {
  return COMPANY_COLORS[index % COMPANY_COLORS.length];
};

export default function ComparePage() {
  const [selectedCompanies, setSelectedCompanies] = useState<SelectedCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const handleCompare = async () => {
    if (selectedCompanies.length < 2) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyIds: selectedCompanies.map((c) => c.id),
        }),
      });

      if (!response.ok) {
        throw new Error('Neizdevās ielādēt uzņēmumus');
      }

      const data = await response.json();
      setCompanies(data.companies);

      // Set default year to most recent available
      if (data.companies.length > 0 && data.companies[0].financialRatios.length > 0) {
        setSelectedYear(data.companies[0].financialRatios[0].year);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Radās kļūda');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('lv-LV', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatRatio = (value: number | null, decimals: number = 2) => {
    if (value === null) return 'N/A';
    return value.toFixed(decimals);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lv-LV');
  };

  // Get all available years
  const availableYears = companies.length > 0
    ? Array.from(
        new Set(
          companies.flatMap((c) => c.financialRatios.map((r) => r.year))
        )
      ).sort((a, b) => b - a)
    : [];

  // Get financial ratios for selected year
  const getFinancialRatios = (company: Company) => {
    return company.financialRatios.find((r) => r.year === selectedYear) || null;
  };

  // Get tax payment for selected year
  const getTaxPayment = (company: Company) => {
    return company.taxPayments.find((t) => t.year === selectedYear) || null;
  };

  // Get best and worst values for highlighting
  const getBestWorst = (values: (number | null)[], higherIsBetter: boolean = true) => {
    const validValues = values.filter((v): v is number => v !== null);
    if (validValues.length === 0) return { best: null, worst: null };

    const best = higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
    const worst = higherIsBetter ? Math.min(...validValues) : Math.max(...validValues);

    return { best, worst };
  };

  const getCellColor = (value: number | null, best: number | null, worst: number | null) => {
    if (value === null || best === null || worst === null) return '';
    if (value === best) return 'bg-green-50 border-green-200';
    if (value === worst) return 'bg-red-50 border-red-200';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />

      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-slate-900">Uzņēmumu Salīdzinājums</h1>
          <p className="text-slate-600">Salīdziniet līdz 5 uzņēmumu finanšu datus</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Company Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Izvēlēties Uzņēmumus
              </CardTitle>
              <CardDescription>
                Izvēlieties no 2 līdz 5 uzņēmumiem salīdzināšanai
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CompanySelector
                selectedCompanies={selectedCompanies}
                onCompaniesChange={setSelectedCompanies}
              />

              {selectedCompanies.length >= 2 && (
                <Button onClick={handleCompare} disabled={isLoading} className="w-full">
                  {isLoading ? 'Ielādē...' : 'Salīdzināt Uzņēmumus'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          )}

          {/* Comparison Results */}
          {!isLoading && companies.length > 0 && (
            <>
              {/* Basic Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Pamata Informācija</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-48">Uzņēmums</TableHead>
                          {companies.map((company) => (
                            <TableHead key={company.id} className="min-w-48">
                              <div className="font-semibold">{company.name}</div>
                              <div className="text-xs text-muted-foreground font-normal">
                                {company.registrationNumber}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Statuss</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id}>
                              <Badge variant={company.status === 'Aktīvs' ? 'default' : 'destructive'}>
                                {company.status}
                              </Badge>
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Juridiskā forma</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id} className="text-sm">
                              {company.legalForm || 'N/A'}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Pamatkapitāls</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id} className="text-sm">
                              {formatCurrency(company.shareCapital)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">CSDD transportlīdzekļi</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id} className="text-sm">
                              {company.registeredVehiclesCount ?? 'N/A'}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Reģistrācijas datums</TableCell>
                          {companies.map((company) => (
                            <TableCell key={company.id} className="text-sm">
                              {formatDate(company.registrationDate)}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Year Selector */}
              {availableYears.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Izvēlēties gadu:</span>
                      <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => setSelectedYear(parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Financial Ratios Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Finanšu Rādītāji ({selectedYear})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="profitability" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="profitability">Rentabilitāte</TabsTrigger>
                      <TabsTrigger value="liquidity">Likviditāte</TabsTrigger>
                      <TabsTrigger value="leverage">Finansējums</TabsTrigger>
                      <TabsTrigger value="efficiency">Efektivitāte</TabsTrigger>
                    </TabsList>

                    {/* Profitability Ratios */}
                    <TabsContent value="profitability" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-64">Rādītājs</TableHead>
                              {companies.map((company) => (
                                <TableHead key={company.id} className="text-center">
                                  {company.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Return on Equity (ROE)</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.returnOnEquity || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Return on Assets (ROA)</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.returnOnAssets || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Net Profit Margin</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.netProfitMargin || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Gross Profit Margin</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.grossProfitMargin || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Operating Profit Margin</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.operatingProfitMargin || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">EBITDA Margin</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.ebitdaMargin || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* Liquidity Ratios */}
                    <TabsContent value="liquidity" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-64">Rādītājs</TableHead>
                              {companies.map((company) => (
                                <TableHead key={company.id} className="text-center">
                                  {company.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Current Ratio</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.currentRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Quick Ratio</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.quickRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Cash Ratio</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.cashRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Working Capital Ratio</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.workingCapitalRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* Leverage Ratios */}
                    <TabsContent value="leverage" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-64">Rādītājs</TableHead>
                              {companies.map((company) => (
                                <TableHead key={company.id} className="text-center">
                                  {company.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Debt to Equity</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.debtToEquity || null);
                                const { best, worst } = getBestWorst(values, false); // Lower is better
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Debt Ratio</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.debtRatio || null);
                                const { best, worst } = getBestWorst(values, false); // Lower is better
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatPercent(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Interest Coverage Ratio</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.interestCoverageRatio || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Equity Multiplier</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.equityMultiplier || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* Efficiency Ratios */}
                    <TabsContent value="efficiency" className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-64">Rādītājs</TableHead>
                              {companies.map((company) => (
                                <TableHead key={company.id} className="text-center">
                                  {company.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Asset Turnover</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.assetTurnover || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Inventory Turnover</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.inventoryTurnover || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Receivables Turnover</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.receivablesTurnover || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Payables Turnover</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.payablesTurnover || null);
                                const { best, worst } = getBestWorst(values);
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Cash Conversion Cycle (days)</TableCell>
                              {(() => {
                                const values = companies.map((c) => getFinancialRatios(c)?.cashConversionCycle || null);
                                const { best, worst } = getBestWorst(values, false); // Lower is better
                                return values.map((value, idx) => (
                                  <TableCell key={idx} className={`text-center ${getCellColor(value, best, worst)}`}>
                                    {formatRatio(value, 0)}
                                  </TableCell>
                                ));
                              })()}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Tax Payments Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Nodokļu Maksājumi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Uzņēmums</TableHead>
                          <TableHead className="text-right">Summa ({selectedYear})</TableHead>
                          <TableHead>Datums</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companies.map((company) => {
                          const payment = getTaxPayment(company);
                          return (
                            <TableRow key={company.id}>
                              <TableCell className="font-medium">{company.name}</TableCell>
                              <TableCell className="text-right">
                                {payment ? formatCurrency(payment.amount) : 'Nav datu'}
                              </TableCell>
                              <TableCell>
                                {payment ? formatDate(payment.date) : 'N/A'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Tax Payments Line Chart */}
                  <div className="mt-6 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(() => {
                        // Get all unique years from all companies
                        const allYears = Array.from(
                          new Set(
                            companies.flatMap(c => c.taxPayments.map(t => t.year))
                          )
                        ).sort((a, b) => a - b);

                        // Create data points for each year
                        return allYears.map(year => {
                          const dataPoint: any = { year };
                          companies.forEach(company => {
                            const payment = company.taxPayments.find(t => t.year === year);
                            dataPoint[company.name] = payment ? payment.amount : null;
                          });
                          return dataPoint;
                        });
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis
                          tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                          domain={(() => {
                            // Calculate dynamic Y-axis range based on actual data
                            const allValues = companies.flatMap(c =>
                              c.taxPayments.map(t => t.amount)
                            ).filter(v => v !== null && v !== undefined);

                            if (allValues.length === 0) return [0, 'auto'];

                            const minValue = Math.min(...allValues);
                            const maxValue = Math.max(...allValues);
                            const padding = (maxValue - minValue) * 0.1;

                            return [
                              Math.max(0, minValue - padding),
                              maxValue + padding
                            ];
                          })()}
                        />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend formatter={(value) => <span style={{ color: '#000000' }}>{value}</span>} />
                        {companies.map((company, index) => (
                          <Line
                            key={company.id}
                            type="monotone"
                            dataKey={company.name}
                            stroke={getCompanyColor(index)}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
