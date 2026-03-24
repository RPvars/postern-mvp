'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useTranslations } from 'next-intl';
import { CompareCompany, getCompanyColor, TOOLTIP_STYLE } from '@/components/compare/types';

interface TaxBreakdownProps {
  companies: CompareCompany[];
  selectedYear: number;
  formatCurrency: (amount: number | null) => string;
  taxPaymentsChartData: Record<string, unknown>[];
  taxPaymentsYAxisDomain: (number | string)[];
}

export function TaxBreakdown({ companies, selectedYear, formatCurrency, taxPaymentsChartData, taxPaymentsYAxisDomain }: TaxBreakdownProps) {
  const t = useTranslations('compare');

  const getTaxPayment = useCallback((company: CompareCompany) => {
    return company.taxPayments.find((tp) => tp.year === selectedYear) || null;
  }, [selectedYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('taxPayments.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('taxPayments.company')}</TableHead>
                <TableHead className="text-right">{t('taxPayments.amount')} ({selectedYear})</TableHead>
                <TableHead className="text-right">{t('taxBreakdown.iinAmount')}</TableHead>
                <TableHead className="text-right">{t('taxBreakdown.vsaoiAmount')}</TableHead>
                <TableHead className="text-right">{t('taxPayments.employeeCount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => {
                const payment = getTaxPayment(company);
                return (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="text-right">
                      {payment ? formatCurrency(payment.amount) : t('taxPayments.noData')}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {payment?.iinAmount != null ? formatCurrency(payment.iinAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {payment?.vsaoiAmount != null ? formatCurrency(payment.vsaoiAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {payment?.employeeCount ?? '-'}
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
            <LineChart data={taxPaymentsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis
                tickFormatter={(value) => `\u20AC${(value / 1000).toFixed(0)}k`}
                domain={taxPaymentsYAxisDomain as [number, number]}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatCurrency(value as number)} />
              <Legend formatter={(value) => <span className="text-foreground">{value}</span>} />
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
  );
}
