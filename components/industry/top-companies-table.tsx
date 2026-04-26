'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, ArrowDown, Undo2, BarChart3, Scale } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { AddressLink } from '@/components/address/address-link';
import type { Metric, TopCompany, IndustryData, ViewGroup } from './types';

interface TopCompaniesTableProps {
  data: IndustryData;
  displayCompanies: TopCompany[];
  metric: Metric;
  setMetric: (m: Metric) => void;
  view: ViewGroup;
  setView: (v: ViewGroup) => void;
  year: string;
  setYear: (y: string) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  locale: string;
}

const MAX_COMPARE = 5;

export function TopCompaniesTable({ data, displayCompanies, metric, setMetric, view, setView, year, setYear, t, locale }: TopCompaniesTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const numLocale = locale === 'en' ? 'en-US' : 'lv-LV';

  const fmt = (v: number | null) => formatCurrency(v ?? 0);
  const fmtNum = (v: number | null) => (v ?? 0).toLocaleString(numLocale);
  const fmtPct = (v: number | null) => v == null ? '—' : `${(v * 100).toFixed(1)}%`;
  const debtOf = (c: TopCompany) =>
    c.totalAssets != null && c.equity != null ? c.totalAssets - c.equity : null;
  const roaOf = (c: TopCompany) =>
    c.netIncome != null && c.totalAssets != null && c.totalAssets !== 0
      ? c.netIncome / c.totalAssets
      : null;

  const toggleSelect = (regNum: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(regNum)) {
        next.delete(regNum);
      } else if (next.size < MAX_COMPARE) {
        next.add(regNum);
      }
      return next;
    });
  };

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-foreground">{t('topCompanies')}</h2>
        <div className="flex items-center gap-3">
          {displayCompanies.length > 0 && (
            <button
              onClick={() => exportCSV(displayCompanies, year, t)}
              className="text-xs px-3 py-1.5 rounded-md border hover:bg-accent text-muted-foreground transition-colors"
            >
              CSV ↓
            </button>
          )}
          {data.availableYears.length > 1 && (
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {data.availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* View tabs — prominent above the table */}
      <div className="flex items-center gap-1 border-b border-border mb-4">
        <button
          onClick={() => setView('volume')}
          className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 text-sm font-medium transition-colors ${
            view === 'volume'
              ? 'border-[#FEC200] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          {t('view.volume')}
        </button>
        <button
          onClick={() => setView('balance')}
          className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 text-sm font-medium transition-colors ${
            view === 'balance'
              ? 'border-[#FEC200] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <Scale className="h-4 w-4" />
          {t('view.balance')}
        </button>
      </div>
      {displayCompanies.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-12">{t('rank')}</TableHead>
                  <TableHead>{t('companyName')}</TableHead>
                  {view === 'volume' ? (
                    <>
                      <SortableHead metric="profit" current={metric} onSort={setMetric} label={t('metric.profit')} />
                      <SortableHead metric="revenue" current={metric} onSort={setMetric} label={t('metric.revenue')} className="hidden md:table-cell" />
                      <SortableHead metric="taxes" current={metric} onSort={setMetric} label={t('metric.taxes')} className="hidden lg:table-cell" />
                      <SortableHead metric="employees" current={metric} onSort={setMetric} label={t('metric.employees')} className="hidden lg:table-cell" />
                    </>
                  ) : (
                    <>
                      <SortableHead metric="assets" current={metric} onSort={setMetric} label={t('metric.assets')} />
                      <SortableHead metric="equity" current={metric} onSort={setMetric} label={t('metric.equity')} className="hidden md:table-cell" />
                      <SortableHead metric="debt" current={metric} onSort={setMetric} label={t('metric.debt')} className="hidden lg:table-cell" />
                      <SortableHead metric="roa" current={metric} onSort={setMetric} label={t('metric.roa')} className="hidden lg:table-cell" />
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayCompanies.map((company, index) => (
                  <TableRow
                    key={company.registrationNumber}
                    tabIndex={0}
                    className="cursor-pointer hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-[#FEC200] focus-visible:outline-none"
                    onClick={(e) => {
                      const url = `/company/${company.registrationNumber}`;
                      e.metaKey || e.ctrlKey ? window.open(url, '_blank') : router.push(url);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/company/${company.registrationNumber}`);
                      }
                    }}
                  >
                    <TableCell className="w-8" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(company.registrationNumber)}
                        onChange={() => toggleSelect(company.registrationNumber)}
                        disabled={!selected.has(company.registrationNumber) && selected.size >= MAX_COMPARE}
                        title={!selected.has(company.registrationNumber) && selected.size >= MAX_COMPARE ? t('maxCompanies', { max: MAX_COMPARE }) : undefined}
                        className="h-3.5 w-3.5 rounded border-muted-foreground/30 accent-[#FEC200] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground">
                      <RankCell rank={index + 1} change={company.rankChange} history={company.rankHistory} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-xs text-muted-foreground max-w-[300px]">
                          <AddressLink address={company.legalAddress} showIcon={false} className="text-xs" />
                        </div>
                      </div>
                    </TableCell>
                    {view === 'volume' ? (
                      <>
                        <TableCell className="text-right tabular-nums">
                          <span className={metric === 'profit' ? 'font-semibold' : ''}>{fmt(company.netIncome)}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden md:table-cell">
                          <span className={metric === 'revenue' ? 'font-semibold' : ''}>{fmt(company.revenue)}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden lg:table-cell">
                          <span className={metric === 'taxes' ? 'font-semibold' : ''}>{fmt(company.taxAmount)}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden lg:table-cell">
                          <span className={metric === 'employees' ? 'font-semibold' : ''}>{fmtNum(company.employees)}</span>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right tabular-nums">
                          <span className={metric === 'assets' ? 'font-semibold' : ''}>{fmt(company.totalAssets)}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden md:table-cell">
                          <span className={metric === 'equity' ? 'font-semibold' : ''}>{fmt(company.equity)}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden lg:table-cell">
                          <span className={metric === 'debt' ? 'font-semibold' : ''}>{fmt(debtOf(company))}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden lg:table-cell">
                          <span className={metric === 'roa' ? 'font-semibold' : ''}>{fmtPct(roaOf(company))}</span>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{t('noData')}</CardContent>
        </Card>
      )}

      {/* Compare sticky bar */}
      {selected.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-7xl">
            <span className="text-sm text-muted-foreground">
              {t('companiesSelected', { count: selected.size })}
              {selected.size >= MAX_COMPARE && <span className="text-xs ml-2">{t('maxCompanies', { max: MAX_COMPARE })}</span>}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs px-3 py-1.5 rounded-md border hover:bg-accent text-muted-foreground"
              >
                {t('clear')}
              </button>
              <button
                onClick={() => router.push(`/compare?companies=${Array.from(selected).join(',')}&compared=true`)}
                className="text-sm px-4 py-1.5 rounded-md bg-[#FEC200] text-black font-medium hover:bg-[#FEC200]/90"
              >
                {t('compareButton')} →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableHead({
  metric,
  current,
  onSort,
  label,
  className = '',
}: {
  metric: Metric;
  current: Metric;
  onSort: (m: Metric) => void;
  label: string;
  className?: string;
}) {
  const isActive = current === metric;
  return (
    <TableHead
      className={`text-right cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => onSort(metric)}
    >
      <span className={`inline-flex items-center gap-1 ${isActive ? 'text-foreground font-semibold' : ''}`}>
        {label}
        {isActive ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}

function exportCSV(companies: TopCompany[], year: string, t: (key: string) => string) {
  const header = [t('rank'), t('companyName'), t('address'),
    `${t('metric.profit')} (EUR)`, `${t('metric.revenue')} (EUR)`,
    `${t('metric.assets')} (EUR)`, `${t('metric.equity')} (EUR)`, `${t('metric.debt')} (EUR)`,
    `${t('metric.roa')} (%)`,
    `${t('metric.taxes')} (EUR)`, t('metric.employees')].join(',');
  const rows = companies.map((c, i) => {
    const debt = c.totalAssets != null && c.equity != null ? c.totalAssets - c.equity : null;
    const roa = c.netIncome != null && c.totalAssets != null && c.totalAssets !== 0
      ? c.netIncome / c.totalAssets
      : null;
    return [
      i + 1,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.legalAddress || '').replace(/"/g, '""')}"`,
      c.netIncome ?? 0,
      c.revenue ?? 0,
      c.totalAssets ?? '',
      c.equity ?? '',
      debt ?? '',
      roa != null ? (roa * 100).toFixed(2) : '',
      c.taxAmount ?? 0,
      c.employees ?? 0,
    ].join(',');
  });
  const csv = '\uFEFF' + [header, ...rows].join('\n'); // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `top-uznemumi-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RankCell({ rank, change, history }: { rank: number; change: number | null; history?: Record<number, number | null> }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative inline-flex items-center gap-1 cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span>{rank}</span>
      {change != null && change !== 0 ? (
        <span className={`text-[10px] font-semibold ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change > 0 ? `▲${change}` : `▼${Math.abs(change)}`}
        </span>
      ) : change === 0 ? (
        <span className="text-[10px] text-muted-foreground">—</span>
      ) : change === null && history && !Object.values(history).some((r, i) => i > 0 && r != null) ? (
        <span className="text-[10px] text-link-accent font-semibold">NEW</span>
      ) : change === null ? (
        <Undo2 className="h-3 w-3 text-blue-400" />
      ) : null}
      {/* Tooltip with rank history */}
      {showTooltip && history && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs whitespace-nowrap">
          {Object.entries(history)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([y, r], idx) => {
              const yr = Number(y);
              const prev = history[yr + 1];
              const diff = idx === 0 ? change : (r != null && prev != null ? prev - r : null);
              const hasAnyPrevRank = Object.entries(history)
                .some(([yk, rk]) => Number(yk) < yr && rk != null);
              const isNew = r != null && prev == null && !hasAnyPrevRank;
              const isReturn = r != null && prev == null && hasAnyPrevRank;
              return (
                <div key={y} className="flex items-center gap-3 py-0.5">
                  <span className="text-muted-foreground w-10">{y}</span>
                  <span className="font-medium w-6 text-right">{r != null ? `#${r}` : '—'}</span>
                  {diff != null && diff !== 0 ? (
                    <span className={`text-[10px] ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {diff > 0 ? `▲${diff}` : `▼${Math.abs(diff)}`}
                    </span>
                  ) : diff === 0 ? null : isNew ? (
                    <span className="text-[10px] text-link-accent font-semibold">NEW</span>
                  ) : isReturn ? (
                    <Undo2 className="h-3 w-3 text-blue-400" />
                  ) : null}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
