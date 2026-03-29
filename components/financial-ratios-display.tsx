'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import type { CompanyFinancialRatio } from '@/lib/types/company';
import type { RatioWarning } from '@/lib/types/ratio-warning';
import { formatCurrency } from '@/lib/format';

interface FinancialRatiosDisplayProps {
  ratios: CompanyFinancialRatio[];
}

const formatRatio = (value: number | null, isPercentage: boolean = false, decimals: number = 2, unit?: string): string => {
  if (value == null) return 'N/A';
  if (isPercentage) return `${(value * 100).toFixed(2)}%`;
  const formatted = value.toFixed(decimals);
  if (unit) return `${formatted} ${unit}`;
  return formatted;
};

// Calculate trend direction and change
const calculateTrend = (current: number | null, previous: number | null, isPercentage: boolean = false): {
  direction: 'up' | 'down' | 'flat';
  change: number | null;
  color: string;
  isPercentagePoints: boolean;
} => {
  if (current == null || previous == null) {
    return { direction: 'flat', change: null, color: 'text-muted-foreground', isPercentagePoints: false };
  }

  // For percentage ratios: show percentage point difference (p.p.)
  // For other ratios: show relative % change
  const change = isPercentage
    ? (current - previous) * 100  // percentage point difference
    : previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;

  if (change == null) {
    return { direction: 'flat', change: null, color: 'text-muted-foreground', isPercentagePoints: false };
  }

  if (Math.abs(change) < (isPercentage ? 0.1 : 1)) {
    return { direction: 'flat', change, color: 'text-muted-foreground', isPercentagePoints: isPercentage };
  }

  if (change > 0) {
    return { direction: 'up', change, color: 'text-green-600', isPercentagePoints: isPercentage };
  }

  return { direction: 'down', change, color: 'text-red-600', isPercentagePoints: isPercentage };
};

// Context field definition for tooltip
interface ContextField {
  key: keyof CompanyFinancialRatio;
  label: string;
  format?: 'currency' | 'number';
}

// Enhanced Financial Chart Component
const FinancialChart = ({
  data,
  isPercentage = false,
  decimals = 2,
  unit,
  noDataText = 'No data available',
  contextFields,
  yearData,
  ratioKey,
  gapLabel
}: {
  data: (number | null)[];
  isPercentage?: boolean;
  decimals?: number;
  unit?: string;
  noDataText?: string;
  contextFields?: ContextField[];
  yearData?: CompanyFinancialRatio[];
  ratioKey?: string;
  gapLabel?: string;
}) => {
  // Don't render if all values are null or no data
  if (data.every(v => v == null) || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        <p className="text-sm">{noDataText}</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  // Create chart data with year labels (reversed to show oldest to newest)
  const chartData = [...data].reverse().map((value, index) => {
    const year = currentYear - data.length + 1 + index;
    const yd = yearData?.find(r => r.year === year);

    // Check if this data point is mathematically misleading
    // (e.g. both equity and income negative → ROE is a math artifact)
    const yearWarning = ratioKey ? yd?.ratioWarnings?.[ratioKey] : undefined;
    const isInvalidPoint = yearWarning?.type === 'negativeEquityNegativeIncome';

    return {
      year,
      value: isInvalidPoint ? null : (value ?? 0),
      dotted: null as number | null,
      originalValue: value,
      isInvalid: isInvalidPoint,
      ...(yd && contextFields
        ? Object.fromEntries(contextFields.map(f => [f.key, yd[f.key]]))
        : {}),
    };
  });

  // Dynamic Y axis domain from valid data only
  const validValues = chartData.filter(d => !d.isInvalid && d.value != null).map(d => d.value!);
  const minVal = validValues.length > 0 ? Math.min(...validValues) : 0;
  const maxVal = validValues.length > 0 ? Math.max(...validValues) : 1;
  const range = maxVal - minVal;
  const padding = range > 0 ? range * 0.3 : Math.abs(maxVal) * 0.1 || 0.1;
  const yDomain: [number, number] = [
    minVal - padding,
    maxVal + padding,
  ];

  // Build dotted series: invalid points sink below chart bottom
  const belowChart = yDomain[0] - padding * 2;
  for (let i = 0; i < chartData.length; i++) {
    if (chartData[i].isInvalid) {
      chartData[i].dotted = belowChart;
      if (i > 0 && !chartData[i - 1].isInvalid) {
        chartData[i - 1].dotted = chartData[i - 1].value;
      }
      if (i < chartData.length - 1 && !chartData[i + 1].isInvalid) {
        chartData[i + 1].dotted = chartData[i + 1].value;
      }
    }
  }

  // Custom tooltip formatter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, gapLabel }: { active?: boolean; payload?: Array<{ value: number; payload: Record<string, any> }>; gapLabel?: string }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      const isGap = point.isInvalid;
      const displayValue = isGap ? point.originalValue : point.value;

      return (
        <div className="bg-background border border-border rounded-md px-3 py-2 shadow-md max-w-[250px]">
          <p className="text-sm font-semibold">{point.year}</p>
          {isGap ? (
            <>
              <p className="text-sm text-muted-foreground line-through">
                {formatRatio(displayValue, isPercentage, decimals, unit)}
              </p>
              {gapLabel && (
                <p className="text-xs text-[#FF8042] mt-1">{gapLabel}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#fec200]">
              {formatRatio(displayValue, isPercentage, decimals, unit)}
            </p>
          )}
          {contextFields?.map(f => {
            const raw = point[f.key];
            return (
              <p key={f.key} className="text-xs text-muted-foreground">
                {f.label}: {raw != null ? (f.format === 'number' ? (raw as number).toLocaleString('lv-LV') : formatCurrency(raw as number)) : 'N/A'}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" opacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
            tickLine={{ stroke: 'var(--chart-grid)' }}
            axisLine={{ stroke: 'var(--chart-grid)' }}
          />
          <YAxis
            domain={yDomain}
            allowDataOverflow={true}
            tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
            tickLine={{ stroke: 'var(--chart-grid)' }}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            tickFormatter={(value) => formatRatio(value, isPercentage, 0)}
          />
          <Tooltip content={<CustomTooltip gapLabel={gapLabel} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#fec200"
            strokeWidth={2.5}
            dot={{ fill: '#fec200', r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
          {/* Dotted line bridging invalid segments */}
          <Line
            type="monotone"
            dataKey="dotted"
            stroke="#FF8042"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            connectNulls={false}
            legendType="none"
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
  unit,
  description,
  noDataText = 'No data available',
  warning,
  warningText,
  contextFields,
  yearData,
  ratioKey,
  gapLabel
}: {
  label: string;
  value: number | null;
  historicalValues: (number | null)[];
  isPercentage?: boolean;
  decimals?: number;
  unit?: string;
  description: string;
  noDataText?: string;
  warning?: RatioWarning;
  warningText?: string;
  contextFields?: ContextField[];
  yearData?: CompanyFinancialRatio[];
  ratioKey?: string;
  gapLabel?: string;
}) => {
  // Calculate trend from most recent to previous year
  const trend = historicalValues.length >= 2
    ? calculateTrend(historicalValues[0], historicalValues[1], isPercentage)
    : { direction: 'flat' as const, change: null, color: 'text-muted-foreground', isPercentagePoints: false };

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;

  const dataYear = yearData?.[0]?.year ?? new Date().getFullYear();

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">{label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
            {warning && warningText && (
              <p className="text-xs text-[#FF8042] mt-1.5 flex items-start gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{warningText}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs font-medium text-muted-foreground">{dataYear}</span>
            <div className="flex items-center gap-1">
              <TrendIcon className={`h-4 w-4 ${warning?.type === 'negativeEquityNegativeIncome' ? 'text-red-600' : trend.color}`} />
              <span className={`font-mono text-sm font-semibold ${warning?.type === 'negativeEquityNegativeIncome' ? 'text-red-600' : trend.color}`}>
                {formatRatio(value, isPercentage, decimals, unit)}
              </span>
            </div>
            {trend.change != null && (
              <span className={`text-xs ${warning?.type === 'negativeEquityNegativeIncome' ? 'text-red-600' : trend.color}`}>
                {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}{trend.isPercentagePoints ? ' p.p.' : '%'} YoY
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
          unit={unit}
          noDataText={noDataText}
          contextFields={contextFields}
          yearData={yearData}
          ratioKey={ratioKey}
          gapLabel={gapLabel}
        />
      </CardContent>
    </Card>
  );
};

export function FinancialRatiosDisplay({ ratios }: FinancialRatiosDisplayProps) {
  const t = useTranslations('company.financialRatios');
  const tSelector = useTranslations('companySelector');

  if (ratios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tSelector('noDataAvailable')}</p>
        </CardContent>
      </Card>
    );
  }

  // Get most recent year data for displaying current values
  const currentYearData = ratios[0];

  // Helper to extract historical values for a specific ratio
  const getHistoricalValues = (ratioKey: keyof CompanyFinancialRatio): (number | null)[] => {
    return ratios.map(r => r[ratioKey] as number | null);
  };

  const getWarning = (ratioKey: string): RatioWarning | undefined => {
    return currentYearData.ratioWarnings?.[ratioKey];
  };

  const getWarningText = (ratioKey: string): string | undefined => {
    const warning = getWarning(ratioKey);
    if (!warning) return undefined;
    return t(`warnings.${warning.messageKey}`, warning.params);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profitability" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profitability" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">{t('profitability')}</TabsTrigger>
            <TabsTrigger value="liquidity" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">{t('liquidity')}</TabsTrigger>
            <TabsTrigger value="leverage" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">{t('leverage')}</TabsTrigger>
            <TabsTrigger value="efficiency" className="data-[state=active]:bg-black data-[state=active]:text-white font-semibold">{t('efficiency')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profitability" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RatioCard
                  label={t('returnOnEquity')}
                  value={currentYearData.returnOnEquity}
                  historicalValues={getHistoricalValues('returnOnEquity')}
                  isPercentage
                  description={t('desc.returnOnEquity')}
                  noDataText={tSelector('noDataAvailable')}
                  warning={getWarning('returnOnEquity')}
                  warningText={getWarningText('returnOnEquity')}
                  contextFields={[
                    { key: 'netIncome', label: t('netIncome') },
                    { key: 'equity', label: t('equity') },
                  ]}
                  yearData={ratios}
                  ratioKey="returnOnEquity"
                  gapLabel={t('warnings.gapExplanation')}
                />
                <RatioCard
                  label={t('returnOnAssets')}
                  value={currentYearData.returnOnAssets}
                  historicalValues={getHistoricalValues('returnOnAssets')}
                  isPercentage
                  description={t('desc.returnOnAssets')}
                  noDataText={tSelector('noDataAvailable')}
                  contextFields={[{ key: 'netIncome', label: t('netIncome') }, { key: 'totalAssets', label: t('totalAssets') }]}
                  yearData={ratios}
                />
                <RatioCard
                  label={t('roce')}
                  value={currentYearData.roce}
                  historicalValues={getHistoricalValues('roce')}
                  isPercentage
                  description={t('desc.roce')}
                  noDataText={tSelector('noDataAvailable')}
                  contextFields={[{ key: 'ebit', label: t('ebit') }, { key: 'totalAssets', label: t('totalAssets') }, { key: 'currentLiabilities', label: t('currentLiabilities') }]}
                  yearData={ratios}
                />
                <RatioCard
                  label={t('roic')}
                  value={currentYearData.roic}
                  historicalValues={getHistoricalValues('roic')}
                  isPercentage
                  description={t('desc.roic')}
                  noDataText={tSelector('noDataAvailable')}
                  contextFields={[{ key: 'netIncome', label: t('netIncome') }, { key: 'equity', label: t('equity') }, { key: 'totalDebt', label: t('totalDebt') }, { key: 'cash', label: t('cash') }]}
                  yearData={ratios}
                />
                <RatioCard
                  label={t('grossProfitMargin')}
                  value={currentYearData.grossProfitMargin}
                  historicalValues={getHistoricalValues('grossProfitMargin')}
                  isPercentage
                  description={t('desc.grossProfitMargin')}
                  noDataText={tSelector('noDataAvailable')}
                  contextFields={[{ key: 'grossProfit', label: t('grossProfit') }, { key: 'revenue', label: t('revenue') }]}
                  yearData={ratios}
                />
                <RatioCard
                  label={t('operatingProfitMargin')}
                  value={currentYearData.operatingProfitMargin}
                  historicalValues={getHistoricalValues('operatingProfitMargin')}
                  isPercentage
                  description={t('desc.operatingProfitMargin')}
                  noDataText={tSelector('noDataAvailable')}
                  contextFields={[{ key: 'ebit', label: t('ebit') }, { key: 'revenue', label: t('revenue') }]}
                  yearData={ratios}
                />
                <RatioCard
                  label={t('ebitdaMargin')}
                  value={currentYearData.ebitdaMargin}
                  historicalValues={getHistoricalValues('ebitdaMargin')}
                  isPercentage
                  description={t('desc.ebitdaMargin')}
                  noDataText={tSelector('noDataAvailable')}
                  contextFields={[{ key: 'ebitda', label: t('ebitda') }, { key: 'revenue', label: t('revenue') }]}
                  yearData={ratios}
                />
                <RatioCard
                  label={t('netProfitMargin')}
                  value={currentYearData.netProfitMargin}
                  historicalValues={getHistoricalValues('netProfitMargin')}
                  isPercentage
                  description={t('desc.netProfitMargin')}
                  noDataText={tSelector('noDataAvailable')}
                  contextFields={[{ key: 'netIncome', label: t('netIncome') }, { key: 'revenue', label: t('revenue') }]}
                  yearData={ratios}
                />
                <RatioCard
                  label={t('cashFlowMargin')}
                  value={currentYearData.cashFlowMargin}
                  historicalValues={getHistoricalValues('cashFlowMargin')}
                  isPercentage
                  description={t('desc.cashFlowMargin')}
                  noDataText={tSelector('noDataAvailable')}
                  contextFields={[{ key: 'operatingCashFlow', label: t('operatingCashFlow') }, { key: 'revenue', label: t('revenue') }]}
                  yearData={ratios}
                />
                <RatioCard
                  label={t('grossProfitToAssets')}
                  value={currentYearData.grossProfitToAssets}
                  historicalValues={getHistoricalValues('grossProfitToAssets')}
                  isPercentage
                  description={t('desc.grossProfitToAssets')}
                  noDataText={tSelector('noDataAvailable')}
                  contextFields={[{ key: 'grossProfit', label: t('grossProfit') }, { key: 'totalAssets', label: t('totalAssets') }]}
                  yearData={ratios}
                />
              </div>
          </TabsContent>

          <TabsContent value="liquidity" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RatioCard
                label={t('currentRatio')}
                value={currentYearData.currentRatio}
                historicalValues={getHistoricalValues('currentRatio')}
                unit="×"
                description={t('desc.currentRatio')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'currentAssets', label: t('currentAssets') }, { key: 'currentLiabilities', label: t('currentLiabilities') }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('quickRatio')}
                value={currentYearData.quickRatio}
                historicalValues={getHistoricalValues('quickRatio')}
                unit="×"
                description={t('desc.quickRatio')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'currentAssets', label: t('currentAssets') }, { key: 'inventory', label: t('inventory') }, { key: 'currentLiabilities', label: t('currentLiabilities') }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('cashRatio')}
                value={currentYearData.cashRatio}
                historicalValues={getHistoricalValues('cashRatio')}
                unit="×"
                description={t('desc.cashRatio')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'cash', label: t('cash') }, { key: 'currentLiabilities', label: t('currentLiabilities') }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('workingCapitalRatio')}
                value={currentYearData.workingCapitalRatio}
                historicalValues={getHistoricalValues('workingCapitalRatio')}
                isPercentage
                description={t('desc.workingCapitalRatio')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'currentAssets', label: t('currentAssets') }, { key: 'currentLiabilities', label: t('currentLiabilities') }, { key: 'totalAssets', label: t('totalAssets') }]}
                yearData={ratios}
              />
            </div>
          </TabsContent>

          <TabsContent value="leverage" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RatioCard
                label={t('debtToEquity')}
                value={currentYearData.debtToEquity}
                historicalValues={getHistoricalValues('debtToEquity')}
                unit="×"
                description={t('desc.debtToEquity')}
                noDataText={tSelector('noDataAvailable')}
                warning={getWarning('debtToEquity')}
                warningText={getWarningText('debtToEquity')}
                contextFields={[
                  { key: 'totalDebt', label: t('totalDebt') },
                  { key: 'equity', label: t('equity') },
                ]}
                yearData={ratios}
                ratioKey="debtToEquity"
                gapLabel={t('warnings.gapExplanation')}
              />
              <RatioCard
                label={t('debtRatio')}
                value={currentYearData.debtRatio}
                historicalValues={getHistoricalValues('debtRatio')}
                unit="×"
                description={t('desc.debtRatio')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'totalDebt', label: t('totalDebt') }, { key: 'totalAssets', label: t('totalAssets') }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('interestCoverageRatio')}
                value={currentYearData.interestCoverageRatio}
                historicalValues={getHistoricalValues('interestCoverageRatio')}
                unit="×"
                description={t('desc.interestCoverageRatio')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'ebit', label: t('ebit') }, { key: 'interestExpense', label: t('interestExpense') }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('equityMultiplier')}
                value={currentYearData.equityMultiplier}
                historicalValues={getHistoricalValues('equityMultiplier')}
                unit="×"
                description={t('desc.equityMultiplier')}
                noDataText={tSelector('noDataAvailable')}
                warning={getWarning('equityMultiplier')}
                warningText={getWarningText('equityMultiplier')}
                contextFields={[
                  { key: 'totalAssets', label: t('totalAssets') },
                  { key: 'equity', label: t('equity') },
                ]}
                yearData={ratios}
                ratioKey="equityMultiplier"
                gapLabel={t('warnings.gapExplanation')}
              />
            </div>
          </TabsContent>

          <TabsContent value="efficiency" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RatioCard
                label={t('revenuePerEmployee')}
                value={currentYearData.revenuePerEmployee}
                historicalValues={getHistoricalValues('revenuePerEmployee')}
                unit="EUR"
                description={t('desc.revenuePerEmployee')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'revenue', label: t('revenue') }, { key: 'employees', label: t('employees'), format: 'number' }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('profitPerEmployee')}
                value={currentYearData.profitPerEmployee}
                historicalValues={getHistoricalValues('profitPerEmployee')}
                unit="EUR"
                description={t('desc.profitPerEmployee')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'netIncome', label: t('netIncome') }, { key: 'employees', label: t('employees'), format: 'number' }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('assetTurnover')}
                value={currentYearData.assetTurnover}
                historicalValues={getHistoricalValues('assetTurnover')}
                unit="×"
                description={t('desc.assetTurnover')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'revenue', label: t('revenue') }, { key: 'totalAssets', label: t('totalAssets') }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('inventoryTurnover')}
                value={currentYearData.inventoryTurnover}
                historicalValues={getHistoricalValues('inventoryTurnover')}
                unit="×"
                description={t('desc.inventoryTurnover')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'cogs', label: t('cogs') }, { key: 'inventory', label: t('inventory') }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('receivablesTurnover')}
                value={currentYearData.receivablesTurnover}
                historicalValues={getHistoricalValues('receivablesTurnover')}
                unit="×"
                description={t('desc.receivablesTurnover')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'revenue', label: t('revenue') }, { key: 'receivables', label: t('receivables') }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('payablesTurnover')}
                value={currentYearData.payablesTurnover}
                historicalValues={getHistoricalValues('payablesTurnover')}
                unit="×"
                description={t('desc.payablesTurnover')}
                noDataText={tSelector('noDataAvailable')}
                contextFields={[{ key: 'cogs', label: t('cogs') }, { key: 'currentLiabilities', label: t('currentLiabilities') }]}
                yearData={ratios}
              />
              <RatioCard
                label={t('dso')}
                value={currentYearData.dso}
                historicalValues={getHistoricalValues('dso')}
                decimals={0}
                unit={t('unitDays')}
                description={t('desc.dso')}
                noDataText={tSelector('noDataAvailable')}
              />
              <RatioCard
                label={t('dpo')}
                value={currentYearData.dpo}
                historicalValues={getHistoricalValues('dpo')}
                decimals={0}
                unit={t('unitDays')}
                description={t('desc.dpo')}
                noDataText={tSelector('noDataAvailable')}
              />
              <RatioCard
                label={t('cashConversionCycle')}
                value={currentYearData.cashConversionCycle}
                historicalValues={getHistoricalValues('cashConversionCycle')}
                decimals={0}
                unit={t('unitDays')}
                description={t('desc.cashConversionCycle')}
                noDataText={tSelector('noDataAvailable')}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
