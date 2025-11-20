'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  if (value == null) return 'N/A';
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

// Enhanced Financial Chart Component
const FinancialChart = ({
  data,
  isPercentage = false,
  decimals = 2
}: {
  data: (number | null)[];
  isPercentage?: boolean;
  decimals?: number;
}) => {
  // Don't render if all values are null or no data
  if (data.every(v => v == null) || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  // Create chart data with year labels (reversed to show oldest to newest)
  const chartData = [...data].reverse().map((value, index) => ({
    year: new Date().getFullYear() - data.length + 1 + index,
    value: value ?? 0
  }));

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-background border border-border rounded-md px-3 py-2 shadow-md">
          <p className="text-sm font-semibold">{payload[0].payload.year}</p>
          <p className="text-sm text-[#fec200]">
            {formatRatio(value, isPercentage, decimals)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => formatRatio(value, isPercentage, 0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#fec200"
            strokeWidth={2.5}
            dot={{ fill: '#fec200', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Ratio Card Component for 2-column grid
const RatioCard = ({
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

  // Get current year
  const currentYear = new Date().getFullYear();

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">{label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs font-medium text-muted-foreground">{currentYear}</span>
            <div className="flex items-center gap-1">
              <TrendIcon className={`h-4 w-4 ${trend.color}`} />
              <span className={`font-mono text-sm font-semibold ${trend.color}`}>
                {formatRatio(value, isPercentage, decimals)}
              </span>
            </div>
            {trend.change != null && (
              <span className={`text-xs ${trend.color}`}>
                {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}% YoY
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <FinancialChart
          data={historicalValues}
          isPercentage={isPercentage}
          decimals={decimals}
        />
      </CardContent>
    </Card>
  );
};

export function FinancialRatiosDisplay({ ratios }: FinancialRatiosDisplayProps) {
  if (ratios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Finanšu Rādītāji
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nav pieejami finanšu dati</p>
        </CardContent>
      </Card>
    );
  }

  // Get most recent year data for displaying current values
  const currentYearData = ratios[0];

  // Helper to extract historical values for a specific ratio
  const getHistoricalValues = (ratioKey: keyof FinancialRatio): (number | null)[] => {
    return ratios.map(r => r[ratioKey] as number | null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Finanšu Rādītāji
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profitability" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profitability" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">Rentabilitāte</TabsTrigger>
            <TabsTrigger value="liquidity" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">Likviditāte</TabsTrigger>
            <TabsTrigger value="leverage" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">Finansējums</TabsTrigger>
            <TabsTrigger value="efficiency" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">Efektivitāte</TabsTrigger>
          </TabsList>

          <TabsContent value="profitability" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RatioCard
                label="Return on Equity (ROE)"
                value={currentYearData.returnOnEquity}
                historicalValues={getHistoricalValues('returnOnEquity')}
                isPercentage
                description="Net Income / Shareholder's Equity"
              />
              <RatioCard
                label="Return on Assets (ROA)"
                value={currentYearData.returnOnAssets}
                historicalValues={getHistoricalValues('returnOnAssets')}
                isPercentage
                description="Net Income / Total Assets"
              />
              <RatioCard
                label="Net Profit Margin"
                value={currentYearData.netProfitMargin}
                historicalValues={getHistoricalValues('netProfitMargin')}
                isPercentage
                description="Net Income / Revenue"
              />
              <RatioCard
                label="Gross Profit Margin"
                value={currentYearData.grossProfitMargin}
                historicalValues={getHistoricalValues('grossProfitMargin')}
                isPercentage
                description="Gross Profit / Revenue"
              />
              <RatioCard
                label="Operating Profit Margin"
                value={currentYearData.operatingProfitMargin}
                historicalValues={getHistoricalValues('operatingProfitMargin')}
                isPercentage
                description="Operating Income / Revenue"
              />
              <RatioCard
                label="EBITDA Margin"
                value={currentYearData.ebitdaMargin}
                historicalValues={getHistoricalValues('ebitdaMargin')}
                isPercentage
                description="EBITDA / Revenue"
              />
              <RatioCard
                label="Cash Flow Margin"
                value={currentYearData.cashFlowMargin}
                historicalValues={getHistoricalValues('cashFlowMargin')}
                isPercentage
                description="Operating Cash Flow / Revenue"
              />
            </div>
          </TabsContent>

          <TabsContent value="liquidity" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RatioCard
                label="Current Ratio"
                value={currentYearData.currentRatio}
                historicalValues={getHistoricalValues('currentRatio')}
                description="Current Assets / Current Liabilities"
              />
              <RatioCard
                label="Quick Ratio"
                value={currentYearData.quickRatio}
                historicalValues={getHistoricalValues('quickRatio')}
                description="(Current Assets - Inventory) / Current Liabilities"
              />
              <RatioCard
                label="Cash Ratio"
                value={currentYearData.cashRatio}
                historicalValues={getHistoricalValues('cashRatio')}
                description="Cash & Equivalents / Current Liabilities"
              />
              <RatioCard
                label="Working Capital Ratio"
                value={currentYearData.workingCapitalRatio}
                historicalValues={getHistoricalValues('workingCapitalRatio')}
                isPercentage
                description="Working Capital / Total Assets"
              />
            </div>
          </TabsContent>

          <TabsContent value="leverage" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RatioCard
                label="Debt to Equity"
                value={currentYearData.debtToEquity}
                historicalValues={getHistoricalValues('debtToEquity')}
                description="Total Debt / Total Equity"
              />
              <RatioCard
                label="Debt Ratio"
                value={currentYearData.debtRatio}
                historicalValues={getHistoricalValues('debtRatio')}
                description="Total Debt / Total Assets"
              />
              <RatioCard
                label="Interest Coverage Ratio"
                value={currentYearData.interestCoverageRatio}
                historicalValues={getHistoricalValues('interestCoverageRatio')}
                description="EBIT / Interest Expense"
              />
              <RatioCard
                label="Equity Multiplier"
                value={currentYearData.equityMultiplier}
                historicalValues={getHistoricalValues('equityMultiplier')}
                description="Total Assets / Total Equity"
              />
            </div>
          </TabsContent>

          <TabsContent value="efficiency" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RatioCard
                label="Asset Turnover"
                value={currentYearData.assetTurnover}
                historicalValues={getHistoricalValues('assetTurnover')}
                description="Revenue / Total Assets"
              />
              <RatioCard
                label="Inventory Turnover"
                value={currentYearData.inventoryTurnover}
                historicalValues={getHistoricalValues('inventoryTurnover')}
                description="Cost of Goods Sold / Average Inventory"
              />
              <RatioCard
                label="Receivables Turnover"
                value={currentYearData.receivablesTurnover}
                historicalValues={getHistoricalValues('receivablesTurnover')}
                description="Revenue / Average Accounts Receivable"
              />
              <RatioCard
                label="Payables Turnover"
                value={currentYearData.payablesTurnover}
                historicalValues={getHistoricalValues('payablesTurnover')}
                description="COGS / Average Accounts Payable"
              />
              <RatioCard
                label="Cash Conversion Cycle"
                value={currentYearData.cashConversionCycle}
                historicalValues={getHistoricalValues('cashConversionCycle')}
                decimals={0}
                description="Days Inventory + Days Receivables - Days Payables"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
