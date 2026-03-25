'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Building2 } from 'lucide-react';
import { formatCompanyDisplayName } from '@/lib/text-utils';
import { formatDate } from '@/lib/format';
import { translateEnum } from '@/lib/i18n/translate-enum';

const CompanyMap = dynamic(
  () => import('@/components/person/company-map').then(mod => mod.CompanyMapInner),
  { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-lg" /> }
);

interface CompanyResult {
  registrationNumber: string;
  name: string;
  status: string;
  legalForm: string | null;
  legalAddress: string;
  registrationDate: string;
  latitude: number | null;
  longitude: number | null;
}

interface AddressData {
  address: string;
  companies: CompanyResult[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export default function AddressPage() {
  const searchParams = useSearchParams();
  const t = useTranslations('address');
  const tCommon = useTranslations('common');
  const [data, setData] = useState<AddressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const te = (key: string, fallback: string) => translateEnum(tCommon, key, fallback);

  const addressQuery = searchParams.get('q');

  useEffect(() => {
    if (!addressQuery || addressQuery.trim().length < 3) {
      setError(t('notFound'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch(`/api/address?q=${encodeURIComponent(addressQuery)}&page=${page}`)
      .then(r => {
        if (!r.ok) {
          throw new Error(t('notFound'));
        }
        return r.json();
      })
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : t('notFound')))
      .finally(() => setIsLoading(false));
  }, [addressQuery, page, t]);

  useEffect(() => {
    if (addressQuery) {
      document.title = `${addressQuery} — Posterns`;
    }
    return () => { document.title = 'Posterns - Latvijas Uzņēmumu Analīzes Platforma'; };
  }, [addressQuery]);

  const allLocations = data?.companies.map(c => ({
    registrationNumber: c.registrationNumber,
    name: c.name,
    legalAddress: c.legalAddress,
    latitude: c.latitude,
    longitude: c.longitude,
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {isLoading ? (
        <>
          <div className="border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-6">
              <Skeleton className="h-9 w-96 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="container mx-auto px-4 py-8 space-y-6">
            <Card><CardContent className="py-8"><Skeleton className="h-40 w-full" /></CardContent></Card>
          </div>
        </>
      ) : error || !data ? (
        <div className="container mx-auto px-4 py-16 text-center">
          <MapPin className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">{error || t('notFound')}</h1>
          <p className="text-muted-foreground mb-4">{t('noCompanies')}</p>
          <Link href="/" className="text-primary hover:underline">{t('backToSearch')}</Link>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-7 w-7 text-muted-foreground" />
                    <h1 className="text-3xl font-bold text-foreground">{data.address}</h1>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {t('companyCount', { count: data.totalCount })}
                </Badge>
              </div>
            </div>
          </div>

          <main className="container mx-auto px-4 py-8 space-y-6">
            {/* Map */}
            {allLocations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t('map')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CompanyMap companies={allLocations} />
                </CardContent>
              </Card>
            )}

            {/* Company Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('companiesAtAddress')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('companyName')}</TableHead>
                        <TableHead>{t('regNumber')}</TableHead>
                        <TableHead>{t('legalForm')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{t('registrationDate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.companies.map((company) => (
                        <TableRow key={company.registrationNumber}>
                          <TableCell>
                            <Link
                              href={`/company/${company.registrationNumber}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {formatCompanyDisplayName(company.name)}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {company.registrationNumber}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {company.legalForm ? te(`legalForm.${company.legalForm}`, company.legalForm) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={company.status === 'REGISTERED' ? 'default' : 'secondary'}
                              className={company.status === 'REGISTERED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
                            >
                              {te(`companyStatus.${company.status}`, company.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(company.registrationDate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1 rounded border bg-card text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                    >
                      {t('prevPage')}
                    </button>
                    <span className="text-sm text-muted-foreground">
                      {page} / {data.totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={page >= data.totalPages}
                      className="px-3 py-1 rounded border bg-card text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                    >
                      {t('nextPage')}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </>
      )}
    </div>
  );
}
