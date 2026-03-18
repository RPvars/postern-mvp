'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Building2, Users, UserCog, ShieldCheck, Info, ExternalLink, GitFork } from 'lucide-react';
import { translateEnum } from '@/lib/i18n/translate-enum';
import { formatCurrency, formatDate } from '@/lib/format';
import { RelationshipGraph } from '@/components/person/relationship-graph';

interface CompanyRef {
  registrationNumber: string;
  name: string;
  status: string;
  legalForm: string | null;
}

interface PersonData {
  name: string | null;
  personalCode: string;
  citizenship: string | null;
  residenceCountry: string | null;
  birthDate: string | null;
  ownerships: Array<{
    company: CompanyRef;
    sharePercentage: number;
    sharesCount: number | null;
    totalValue: number | null;
    votingRights: number | null;
    memberSince: string | null;
  }>;
  boardPositions: Array<{
    company: CompanyRef;
    position: string | null;
    institution: string | null;
    appointedDate: string | null;
    representationRights: string | null;
  }>;
  beneficialOwnerships: Array<{
    company: CompanyRef;
    controlType: string | null;
    dateFrom: string | null;
    residenceCountry: string | null;
    citizenship: string | null;
  }>;
}

export default function PersonPage() {
  const params = useParams();
  const t = useTranslations('person');
  const tCommon = useTranslations('common');
  const [person, setPerson] = useState<PersonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const te = (key: string, fallback: string) => translateEnum(tCommon, key, fallback);

  useEffect(() => {
    const code = params.code as string;
    fetch(`/api/person/${code}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? t('notFound') : t('loadError'));
        return r.json();
      })
      .then(data => setPerson(data.person))
      .catch(err => setError(err instanceof Error ? err.message : t('loadError')))
      .finally(() => setIsLoading(false));
  }, [params.code, t]);

  const totalCompanies = new Set([
    ...(person?.ownerships.map(o => o.company.registrationNumber) || []),
    ...(person?.boardPositions.map(b => b.company.registrationNumber) || []),
    ...(person?.beneficialOwnerships.map(bo => bo.company.registrationNumber) || []),
  ]).size;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {isLoading ? (
        <>
          <div className="border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-6">
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="container mx-auto px-4 py-8 space-y-6">
            <Card><CardContent className="py-8"><Skeleton className="h-40 w-full" /></CardContent></Card>
          </div>
        </>
      ) : error || !person ? (
        <div className="container mx-auto px-4 py-16 text-center">
          <User className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">{error || t('notFound')}</h1>
          <p className="text-muted-foreground mb-4">{t('notFoundDescription')}</p>
          <Link href="/" className="text-primary hover:underline">{t('backToSearch')}</Link>
        </div>
      ) : (
        <>
          <div className="border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{person.name}</h1>
                  <p className="text-muted-foreground">{person.personalCode}</p>
                  {(person.citizenship || person.residenceCountry || person.birthDate) && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {person.citizenship && (
                        <span>{t('citizenship')}: {te(`country.${person.citizenship}`, person.citizenship)}</span>
                      )}
                      {person.residenceCountry && (
                        <span>{t('residenceCountry')}: {te(`country.${person.residenceCountry}`, person.residenceCountry)}</span>
                      )}
                      {person.birthDate && (
                        <span>{t('birthDate')}: {formatDate(person.birthDate)} ({Math.floor((Date.now() - new Date(person.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))})</span>
                      )}
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="text-sm">
                  {t('companiesCount', { count: totalCompanies })}
                </Badge>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 pt-4">
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
              <Info className="h-4 w-4 shrink-0" />
              {t('dataNotice')}
            </div>
          </div>

          <main className="container mx-auto px-4 py-8 space-y-6">
            {/* Relationship Graph */}
            {totalCompanies > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitFork className="h-5 w-5" />
                    {t('relationshipGraph')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RelationshipGraph
                    personName={person.name || ''}
                    personalCode={person.personalCode}
                    companies={(() => {
                      const map = new Map<string, { registrationNumber: string; name: string; roles: Array<{ type: 'owner' | 'board' | 'beneficial'; label: string; since?: string | null; until?: string | null }> }>();
                      for (const o of person.ownerships) {
                        const key = o.company.registrationNumber;
                        if (!map.has(key)) map.set(key, { registrationNumber: key, name: o.company.name, roles: [] });
                        map.get(key)!.roles.push({ type: 'owner', label: `${o.sharePercentage}%`, since: o.memberSince });
                      }
                      for (const b of person.boardPositions) {
                        const key = b.company.registrationNumber;
                        if (!map.has(key)) map.set(key, { registrationNumber: key, name: b.company.name, roles: [] });
                        map.get(key)!.roles.push({ type: 'board', label: b.position ? te(`position.${b.position}`, b.position) : 'Valde', since: b.appointedDate });
                      }
                      for (const bo of person.beneficialOwnerships) {
                        const key = bo.company.registrationNumber;
                        if (!map.has(key)) map.set(key, { registrationNumber: key, name: bo.company.name, roles: [] });
                        map.get(key)!.roles.push({ type: 'beneficial', label: 'PLG', since: bo.dateFrom });
                      }
                      return [...map.values()];
                    })()}
                  />
                </CardContent>
              </Card>
            )}

            {/* Ownerships */}
            {person.ownerships.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t('ownerships')} ({person.ownerships.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('company')}</TableHead>
                        <TableHead className="text-right">{t('sharePercent')}</TableHead>
                        <TableHead className="text-right">{t('totalValue')}</TableHead>
                        <TableHead>{t('memberSince')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {person.ownerships.map((o, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Link href={`/company/${o.company.registrationNumber}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              {o.company.name}
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                            </Link>
                            <div className="text-xs text-muted-foreground">{o.company.registrationNumber}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{o.sharePercentage}%</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {o.totalValue ? formatCurrency(o.totalValue) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {o.memberSince ? formatDate(o.memberSince) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Board Positions */}
            {person.boardPositions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    {t('boardPositions')} ({person.boardPositions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('company')}</TableHead>
                        <TableHead>{t('position')}</TableHead>
                        <TableHead>{t('institution')}</TableHead>
                        <TableHead>{t('appointedDate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {person.boardPositions.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Link href={`/company/${b.company.registrationNumber}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              {b.company.name}
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                            </Link>
                            <div className="text-xs text-muted-foreground">{b.company.registrationNumber}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {b.position ? te(`position.${b.position}`, b.position) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {b.institution ? te(`governingBody.${b.institution}`, b.institution) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {b.appointedDate ? formatDate(b.appointedDate) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Beneficial Ownerships */}
            {person.beneficialOwnerships.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    {t('beneficialOwnerships')} ({person.beneficialOwnerships.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('company')}</TableHead>
                        <TableHead>{t('controlType')}</TableHead>
                        <TableHead>{t('since')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {person.beneficialOwnerships.map((bo, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Link href={`/company/${bo.company.registrationNumber}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              {bo.company.name}
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                            </Link>
                            <div className="text-xs text-muted-foreground">{bo.company.registrationNumber}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {bo.controlType ? te(`controlType.${bo.controlType}`, bo.controlType) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {bo.dateFrom ? formatDate(bo.dateFrom) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </main>
        </>
      )}
    </div>
  );
}
