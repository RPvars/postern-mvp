'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, FolderOpen, Download } from 'lucide-react';
import type { Company } from '@/lib/types/company';

const DEFAULT_LIMIT = 5;

interface DocumentsTabProps {
  company: Company;
}

export function DocumentsTab({ company }: DocumentsTabProps) {
  const t = useTranslations('company');
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const allReports = company.annualReports ?? [];
  const reports = allReports.slice(0, limit);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('lv-LV');
  };

  const formatPeriod = (from: string | null, to: string | null) => {
    if (!from || !to) return '-';
    return `${formatDate(from)} – ${formatDate(to)}`;
  };

  return (
    <TabsContent value="documents">
      {allReports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('documents.annualReports')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('documents.year')}</TableHead>
                  <TableHead>{t('documents.period')}</TableHead>
                  <TableHead>{t('documents.reportType')}</TableHead>
                  <TableHead>{t('documents.registeredOn')}</TableHead>
                  <TableHead>{t('documents.format')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.fileId}>
                    <TableCell className="font-medium">{report.year}</TableCell>
                    <TableCell>{formatPeriod(report.periodFrom, report.periodTo)}</TableCell>
                    <TableCell>{report.type ? t(`documents.reportTypes.${report.type}`) : '-'}</TableCell>
                    <TableCell>{formatDate(report.registeredOn)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        {report.fileExtension || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/api/annual-report/${report.fileId}/content`}
                        download={`gada_parskats_${report.year}${report.fileExtension ? '.' + report.fileExtension.toLowerCase() : ''}`}
                        className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        title={t('documents.download')}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {allReports.length > DEFAULT_LIMIT && (
              <div className="border-t pt-4 mt-2 space-y-2">
                <div className="text-center text-xs text-muted-foreground">
                  {t('ownership.showing', { count: Math.min(limit, allReports.length), total: allReports.length })}
                </div>
                {limit < allReports.length ? (
                  <button
                    onClick={() => setLimit(allReports.length)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 text-gray-600 py-2.5 text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    {t('ownership.showMore')}
                  </button>
                ) : (
                  <button
                    onClick={() => setLimit(DEFAULT_LIMIT)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 text-gray-600 py-2.5 text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    {t('ownership.showLess')}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {t('documents.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {t('documents.noReports')}
            </p>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
