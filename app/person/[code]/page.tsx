'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Building2, Users, UserCog, ShieldCheck, Info, ExternalLink, GitFork, AlertCircle, MapPin, HelpCircle } from 'lucide-react';
import { translateEnum } from '@/lib/i18n/translate-enum';
import { formatCurrency, formatDate } from '@/lib/format';
import { RelationshipGraph } from '@/components/person/relationship-graph';

const CompanyMap = dynamic(
  () => import('@/components/person/company-map').then(mod => mod.CompanyMapInner),
  { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-lg" /> }
);

interface CompanyRef {
  registrationNumber: string;
  name: string;
  status: string;
  legalForm: string | null;
  legalAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
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
  possibleConnections: Array<{
    registrationNumber: string;
    name: string;
    status: string;
    legalForm: string | null;
    roles: string[];
  }>;
}

export default function PersonPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const t = useTranslations('person');
  const tCommon = useTranslations('common');
  const [person, setPerson] = useState<PersonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const te = (key: string, fallback: string) => translateEnum(tCommon, key, fallback);

  useEffect(() => {
    const code = params.code as string;
    const nameHint = searchParams.get('name');
    const queryStr = nameHint ? `?name=${encodeURIComponent(nameHint)}` : '';
    fetch(`/api/person/${encodeURIComponent(code)}${queryStr}`)
      .then(r => {
        if (!r.ok) {
          if (r.status === 400) throw new Error(t('nameRequired'));
          if (r.status === 404) throw new Error(t('notFound'));
          throw new Error(t('loadError'));
        }
        return r.json();
      })
      .then(data => setPerson(data.person))
      .catch(err => setError(err instanceof Error ? err.message : t('loadError')))
      .finally(() => setIsLoading(false));
  }, [params.code, searchParams, t]);

  // Set browser tab title
  useEffect(() => {
    if (person?.name) {
      document.title = `${person.name} — Posterns`;
    }
    return () => { document.title = 'Posterns - Latvijas Uzņēmumu Analīzes Platforma'; };
  }, [person]);

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
                        <span>{t('birthDate')}: {formatDate(person.birthDate)}{(() => {
                          const age = Math.floor((Date.now() - new Date(person.birthDate!).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                          return age > 0 && age < 150 ? ` (${age})` : '';
                        })()}</span>
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

          <div className="container mx-auto px-4 pt-4 space-y-2">
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
              <Info className="h-4 w-4 shrink-0" />
              {t('dataNotice')}
            </div>
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t('privacyWarning')}
            </div>
            <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200">
              <Info className="h-4 w-4 shrink-0" />
              {t('performanceWarning')}
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

            {/* Company Map */}
            {totalCompanies > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t('companyMap')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CompanyMap
                    companies={(() => {
                      const map = new Map<string, { registrationNumber: string; name: string; legalAddress: string; latitude: number | null; longitude: number | null }>();
                      const addCompany = (c: CompanyRef) => {
                        if (!map.has(c.registrationNumber) && c.legalAddress) {
                          map.set(c.registrationNumber, {
                            registrationNumber: c.registrationNumber,
                            name: c.name,
                            legalAddress: c.legalAddress,
                            latitude: c.latitude ?? null,
                            longitude: c.longitude ?? null,
                          });
                        }
                      };
                      person.ownerships.forEach(o => addCompany(o.company));
                      person.boardPositions.forEach(b => addCompany(b.company));
                      person.beneficialOwnerships.forEach(bo => addCompany(bo.company));
                      return Array.from(map.values());
                    })()}
                  />
                </CardContent>
              </Card>
            )}

            {/* Unified company table */}
            {totalCompanies > 0 && (() => {
              // Merge all relationships into one row per company
              const companyRows = new Map<string, {
                registrationNumber: string;
                name: string;
                roles: ('owner' | 'board' | 'beneficial')[];
                sharePercentage: number | null;
                totalValue: number | null;
                position: string | null;
                institution: string | null;
                controlType: string | null;
                earliestDate: string | null;
              }>();

              const getOrCreate = (c: CompanyRef) => {
                if (!companyRows.has(c.registrationNumber)) {
                  companyRows.set(c.registrationNumber, {
                    registrationNumber: c.registrationNumber,
                    name: c.name,
                    roles: [],
                    sharePercentage: null,
                    totalValue: null,
                    position: null,
                    institution: null,
                    controlType: null,
                    earliestDate: null,
                  });
                }
                return companyRows.get(c.registrationNumber)!;
              };

              const pickEarlier = (a: string | null, b: string | null) => {
                if (!a) return b;
                if (!b) return a;
                return new Date(a) < new Date(b) ? a : b;
              };

              for (const o of person.ownerships) {
                const row = getOrCreate(o.company);
                if (!row.roles.includes('owner')) row.roles.push('owner');
                row.sharePercentage = o.sharePercentage;
                row.totalValue = o.totalValue;
                row.earliestDate = pickEarlier(row.earliestDate, o.memberSince);
              }
              for (const b of person.boardPositions) {
                const row = getOrCreate(b.company);
                if (!row.roles.includes('board')) row.roles.push('board');
                row.position = b.position;
                row.institution = b.institution;
                row.earliestDate = pickEarlier(row.earliestDate, b.appointedDate);
              }
              for (const bo of person.beneficialOwnerships) {
                const row = getOrCreate(bo.company);
                if (!row.roles.includes('beneficial')) row.roles.push('beneficial');
                row.controlType = bo.controlType;
                row.earliestDate = pickEarlier(row.earliestDate, bo.dateFrom);
              }

              const rows = Array.from(companyRows.values());

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {t('connectedCompanies')} ({rows.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('company')}</TableHead>
                          <TableHead>{t('rolesColumn')}</TableHead>
                          <TableHead className="text-right">{t('sharePercent')}</TableHead>
                          <TableHead>{t('position')}</TableHead>
                          <TableHead>{t('since')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.registrationNumber}>
                            <TableCell>
                              <Link href={`/company/${row.registrationNumber}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                {row.name}
                                <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                              </Link>
                              <div className="text-xs text-muted-foreground">{row.registrationNumber}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {row.roles.includes('owner') && (
                                  <span className="inline-flex items-center gap-1 text-xs relative group/owner cursor-default">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEC200]" />
                                    {t('legend.owner')}
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs rounded bg-foreground text-background whitespace-nowrap opacity-0 group-hover/owner:opacity-100 transition-opacity pointer-events-none z-10">
                                      {t('legend.ownerFull')}
                                    </span>
                                  </span>
                                )}
                                {row.roles.includes('board') && (
                                  <span className="inline-flex items-center gap-1 text-xs relative group/board cursor-default">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                    {t('legend.board')}
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs rounded bg-foreground text-background whitespace-nowrap opacity-0 group-hover/board:opacity-100 transition-opacity pointer-events-none z-10">
                                      {t('legend.boardFull')}
                                    </span>
                                  </span>
                                )}
                                {row.roles.includes('beneficial') && (
                                  <span className="inline-flex items-center gap-1 text-xs relative group/bo cursor-default">
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                                    {t('legend.beneficial')}
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs rounded bg-foreground text-background whitespace-nowrap opacity-0 group-hover/bo:opacity-100 transition-opacity pointer-events-none z-10">
                                      {t('legend.beneficialFull')}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {row.sharePercentage != null ? (
                                <Badge variant="secondary">{row.sharePercentage}%</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.position ? te(`position.${row.position}`, row.position) : '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.earliestDate ? formatDate(row.earliestDate) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Possibly connected companies (uncertain BR API validation) */}
            {person.possibleConnections && person.possibleConnections.length > 0 && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    {t('possibleConnections')} ({person.possibleConnections.length})
                  </CardTitle>
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                    <Info className="h-4 w-4 shrink-0" />
                    {t('possibleConnectionsNotice')}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('company')}</TableHead>
                        <TableHead>{t('rolesColumn')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {person.possibleConnections.map((pc) => (
                        <TableRow key={pc.registrationNumber} className="opacity-70">
                          <TableCell>
                            <Link href={`/company/${pc.registrationNumber}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              {pc.name}
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                            </Link>
                            <div className="text-xs text-muted-foreground">{pc.registrationNumber}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {pc.roles.includes('owner') && (
                                <span className="inline-flex items-center gap-1 text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#FEC200]" />
                                  {t('legend.owner')}
                                </span>
                              )}
                              {pc.roles.includes('board') && (
                                <span className="inline-flex items-center gap-1 text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                  {t('legend.board')}
                                </span>
                              )}
                              {pc.roles.includes('beneficial') && (
                                <span className="inline-flex items-center gap-1 text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                                  {t('legend.beneficial')}
                                </span>
                              )}
                            </div>
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
