'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkline } from "@/components/sparkline";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinancialRatio {
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
}

interface FinancialRatiosDisplayProps {
  ratios: FinancialRatio[];
}

const formatRatio = (value: number | null, isPercentage: boolean = false, decimals: number = 2): string => {
  if (value == null) return 'N/A'; // Checks for both null and undefined
  const formatted = value.toFixed(decimals);
  return isPercentage ? `${(parseFloat(formatted) * 100).toFixed(2)}%` : formatted;
};

// Calculate trend direction and percentage change
const calculateTrend = (current: number | null, previous: number | null): {
  direction: 'up' | 'down' | 'flat';
  change: number | null;
  color: string;
} => {
  if (current == null || previous == null || previous === 0) {
    return { direction: 'flat', change: null, color: 'text-muted-foreground' };
  }

  const percentChange = ((current - previous) / Math.abs(previous)) * 100;

  if (Math.abs(percentChange) < 1) {
    return { direction: 'flat', change: percentChange, color: 'text-muted-foreground' };
  }

  if (percentChange > 0) {
    return { direction: 'up', change: percentChange, color: 'text-green-600' };
  }

  return { direction: 'down', change: percentChange, color: 'text-red-600' };
};

const RatioItem = ({
  label,
  value,
  historicalValues,
  isPercentage = false,
  decimals = 2,
  description
}: {
  label: string;
  value: number | null;
  historicalValues: (number | null)[];
  isPercentage?: boolean;
  decimals?: number;
  description: string;
}) => {
  // Calculate trend from most recent to previous year
  const trend = historicalValues.length >= 2
    ? calculateTrend(historicalValues[0], historicalValues[1])
    : { direction: 'flat' as const, change: null, color: 'text-muted-foreground' };

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;

  return (
    <div className="flex justify-between items-start py-3 border-b last:border-0">
      <div className="flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-3 ml-4">
        {/* Trend Indicator */}
        <div className="flex items-center gap-1">
          <TrendIcon className={`h-4 w-4 ${trend.color}`} />
          {trend.change != null && (
            <span className={`text-xs ${trend.color}`}>
              {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Sparkline */}
        <div className="hidden sm:block">
          <Sparkline data={historicalValues} width={60} height={24} />
        </div>

        {/* Current Value Badge */}
        <Badge variant="secondary" className="font-mono min-w-[80px] text-center">
          {formatRatio(value, isPercentage, decimals)}
        </Badge>
      </div>
    </div>
  );
};

export function FinancialRatiosDisplay({ ratios }: FinancialRatiosDisplayProps) {
  const [selectedYear, setSelectedYear] = useState<number>(ratios.length > 0 ? ratios[0].year : new Date().getFullYear());
  const [showComparison, setShowComparison] = useState(false);

  if (ratios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Ratios</CardTitle>
          <CardDescription>No financial data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get data for selected year
  const selectedYearData = ratios.find(r => r.year === selectedYear) || ratios[0];
  const selectedYearIndex = ratios.findIndex(r => r.year === selectedYear);
  const previousYearData = selectedYearIndex < ratios.length - 1 ? ratios[selectedYearIndex + 1] : null;

  // Helper to extract historical values for a specific ratio
  const getHistoricalValues = (ratioKey: keyof FinancialRatio): (number | null)[] => {
    return ratios.map(r => r[ratioKey] as number | null);
  };

  // Helper to get trend for selected year compared to previous year
  const getSelectedYearTrend = (ratioKey: keyof FinancialRatio) => {
    const currentValue = selectedYearData[ratioKey] as number | null;
    const previousValue = previousYearData ? (previousYearData[ratioKey] as number | null) : null;
    return calculateTrend(currentValue, previousValue);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Financial Ratios</CardTitle>
            <CardDescription>Comprehensive financial analysis</CardDescription>
          </div>

          {/* Year Selector */}
          <div className="flex gap-2">
            {ratios.map((ratio) => (
              <Button
                key={ratio.year}
                variant={selectedYear === ratio.year ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedYear(ratio.year)}
                className="min-w-[70px]"
              >
                {ratio.year}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profitability" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
            <TabsTrigger value="leverage">Leverage</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          </TabsList>

          <TabsContent value="profitability" className="mt-4">
            <div className="space-y-1">
              <RatioItem
                label="Return on Equity (ROE)"
                value={selectedYearData.returnOnEquity}
                historicalValues={getHistoricalValues('returnOnEquity')}
                isPercentage
                description="Net Income / Shareholder's Equity"
              />
              <RatioItem
                label="Return on Assets (ROA)"
                value={selectedYearData.returnOnAssets}
                historicalValues={getHistoricalValues('returnOnAssets')}
                isPercentage
                description="Net Income / Total Assets"
              />
              <RatioItem
                label="Net Profit Margin"
                value={selectedYearData.netProfitMargin}
                historicalValues={getHistoricalValues('netProfitMargin')}
                isPercentage
                description="Net Income / Revenue"
              />
              <RatioItem
                label="Gross Profit Margin"
                value={selectedYearData.grossProfitMargin}
                historicalValues={getHistoricalValues('grossProfitMargin')}
                isPercentage
                description="Gross Profit / Revenue"
              />
              <RatioItem
                label="Operating Profit Margin"
                value={selectedYearData.operatingProfitMargin}
                historicalValues={getHistoricalValues('operatingProfitMargin')}
                isPercentage
                description="Operating Income / Revenue"
              />
              <RatioItem
                label="EBITDA Margin"
                value={selectedYearData.ebitdaMargin}
                historicalValues={getHistoricalValues('ebitdaMargin')}
                isPercentage
                description="EBITDA / Revenue"
              />
              <RatioItem
                label="Cash Flow Margin"
                value={selectedYearData.cashFlowMargin}
                historicalValues={getHistoricalValues('cashFlowMargin')}
                isPercentage
                description="Operating Cash Flow / Revenue"
              />
            </div>

            {/* Historical Comparison Table */}
            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className="w-full"
              >
                {showComparison ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {showComparison ? 'Hide' : 'Show'} Historical Comparison
              </Button>

              {showComparison && (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ratio</TableHead>
                        {ratios.map(r => (
                          <TableHead key={r.year} className="text-center">{r.year}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">ROE</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.returnOnEquity, true)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">ROA</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.returnOnAssets, true)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Net Profit Margin</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.netProfitMargin, true)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Gross Profit Margin</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.grossProfitMargin, true)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Operating Profit Margin</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.operatingProfitMargin, true)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">EBITDA Margin</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.ebitdaMargin, true)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Cash Flow Margin</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.cashFlowMargin, true)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="liquidity" className="mt-4">
            <div className="space-y-1">
              <RatioItem
                label="Current Ratio"
                value={selectedYearData.currentRatio}
                historicalValues={getHistoricalValues('currentRatio')}
                description="Current Assets / Current Liabilities"
              />
              <RatioItem
                label="Quick Ratio"
                value={selectedYearData.quickRatio}
                historicalValues={getHistoricalValues('quickRatio')}
                description="(Current Assets - Inventory) / Current Liabilities"
              />
              <RatioItem
                label="Cash Ratio"
                value={selectedYearData.cashRatio}
                historicalValues={getHistoricalValues('cashRatio')}
                description="Cash & Equivalents / Current Liabilities"
              />
              <RatioItem
                label="Working Capital Ratio"
                value={selectedYearData.workingCapitalRatio}
                historicalValues={getHistoricalValues('workingCapitalRatio')}
                isPercentage
                description="Working Capital / Total Assets"
              />
            </div>

            {/* Historical Comparison Table for Liquidity */}
            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className="w-full"
              >
                {showComparison ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {showComparison ? 'Hide' : 'Show'} Historical Comparison
              </Button>

              {showComparison && (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ratio</TableHead>
                        {ratios.map(r => (
                          <TableHead key={r.year} className="text-center">{r.year}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Current Ratio</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.currentRatio)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Quick Ratio</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.quickRatio)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Cash Ratio</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.cashRatio)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Working Capital Ratio</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.workingCapitalRatio, true)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="leverage" className="mt-4">
            <div className="space-y-1">
              <RatioItem
                label="Debt to Equity"
                value={selectedYearData.debtToEquity}
                historicalValues={getHistoricalValues('debtToEquity')}
                description="Total Debt / Total Equity"
              />
              <RatioItem
                label="Debt Ratio"
                value={selectedYearData.debtRatio}
                historicalValues={getHistoricalValues('debtRatio')}
                description="Total Debt / Total Assets"
              />
              <RatioItem
                label="Interest Coverage Ratio"
                value={selectedYearData.interestCoverageRatio}
                historicalValues={getHistoricalValues('interestCoverageRatio')}
                description="EBIT / Interest Expense"
              />
              <RatioItem
                label="Equity Multiplier"
                value={selectedYearData.equityMultiplier}
                historicalValues={getHistoricalValues('equityMultiplier')}
                description="Total Assets / Total Equity"
              />
            </div>

            {/* Historical Comparison Table for Leverage */}
            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className="w-full"
              >
                {showComparison ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {showComparison ? 'Hide' : 'Show'} Historical Comparison
              </Button>

              {showComparison && (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ratio</TableHead>
                        {ratios.map(r => (
                          <TableHead key={r.year} className="text-center">{r.year}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Debt to Equity</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.debtToEquity)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Debt Ratio</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.debtRatio)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Interest Coverage Ratio</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.interestCoverageRatio)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Equity Multiplier</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.equityMultiplier)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="efficiency" className="mt-4">
            <div className="space-y-1">
              <RatioItem
                label="Asset Turnover"
                value={selectedYearData.assetTurnover}
                historicalValues={getHistoricalValues('assetTurnover')}
                description="Revenue / Total Assets"
              />
              <RatioItem
                label="Inventory Turnover"
                value={selectedYearData.inventoryTurnover}
                historicalValues={getHistoricalValues('inventoryTurnover')}
                description="Cost of Goods Sold / Average Inventory"
              />
              <RatioItem
                label="Receivables Turnover"
                value={selectedYearData.receivablesTurnover}
                historicalValues={getHistoricalValues('receivablesTurnover')}
                description="Revenue / Average Accounts Receivable"
              />
              <RatioItem
                label="Payables Turnover"
                value={selectedYearData.payablesTurnover}
                historicalValues={getHistoricalValues('payablesTurnover')}
                description="COGS / Average Accounts Payable"
              />
              <RatioItem
                label="Cash Conversion Cycle"
                value={selectedYearData.cashConversionCycle}
                historicalValues={getHistoricalValues('cashConversionCycle')}
                decimals={0}
                description="Days Inventory + Days Receivables - Days Payables"
              />
            </div>

            {/* Historical Comparison Table for Efficiency */}
            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className="w-full"
              >
                {showComparison ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {showComparison ? 'Hide' : 'Show'} Historical Comparison
              </Button>

              {showComparison && (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ratio</TableHead>
                        {ratios.map(r => (
                          <TableHead key={r.year} className="text-center">{r.year}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Asset Turnover</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.assetTurnover)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Inventory Turnover</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.inventoryTurnover)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Receivables Turnover</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.receivablesTurnover)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Payables Turnover</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.payablesTurnover)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Cash Conversion Cycle</TableCell>
                        {ratios.map(r => (
                          <TableCell key={r.year} className="text-center">
                            {formatRatio(r.cashConversionCycle, false, 0)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
