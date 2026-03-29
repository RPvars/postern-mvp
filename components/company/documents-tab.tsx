'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, FolderOpen, Download, Eye, Info, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { sanitizeFilename } from '@/lib/format';
import { translateEnum } from '@/lib/i18n/translate-enum';
import type { Company } from '@/lib/types/company';

const DEFAULT_LIMIT = 5;

interface DocumentsTabProps {
  company: Company;
  isLoadingExternal?: boolean;
}

export function DocumentsTab({ company, isLoadingExternal }: DocumentsTabProps) {
  const t = useTranslations('company');
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const sanitizedName = sanitizeFilename(company.name);
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

  if (isLoadingExternal && allReports.length === 0) {
    return (
      <TabsContent value="documents">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('documents.annualReports')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      </TabsContent>
    );
  }

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
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.fileId}>
                    <TableCell className="font-medium">{report.year}</TableCell>
                    <TableCell>{formatPeriod(report.periodFrom, report.periodTo)}</TableCell>
                    <TableCell>{report.type ? translateEnum(t, `documents.reportTypes.${report.type}`, report.type) : '-'}</TableCell>
                    <TableCell>{formatDate(report.registeredOn)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {report.fileExtension || '—'}
                        </span>
                        {report.fileExtension === 'DUF' && (
                          <span title={t('documents.dufWarning')}>
                            <Info className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {report.fileExtension?.toUpperCase() === 'PDF' && (
                          <a
                            href={`/api/annual-report/${report.fileId}/content?preview=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            title={t('documents.preview')}
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                        <a
                          href={`/api/annual-report/${report.fileId}/content`}
                          download={`${sanitizedName}_${report.year}${report.fileExtension ? '.' + report.fileExtension.toLowerCase() : ''}`}
                          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title={t('documents.download')}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
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
                    className="w-full rounded-md border bg-muted text-muted-foreground py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    {t('ownership.showMore')}
                  </button>
                ) : (
                  <button
                    onClick={() => setLimit(DEFAULT_LIMIT)}
                    className="w-full rounded-md border bg-muted text-muted-foreground py-2.5 text-sm font-medium hover:bg-accent transition-colors"
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
