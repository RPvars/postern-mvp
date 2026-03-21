'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, UserCog, ShieldCheck, Building2, ExternalLink, MessageSquare, Globe, Landmark, Info, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { OwnershipChart } from '@/components/ownership-chart';
import { formatCurrency, formatPercent, formatDate } from '@/lib/format';
import { translateEnum } from '@/lib/i18n/translate-enum';
import type { Company, CompanyOwner } from '@/lib/types/company';

interface PeopleTabProps {
  company: Company;
  isResolvingNames?: boolean;
}

export function PeopleTab({ company, isResolvingNames }: PeopleTabProps) {
  const t = useTranslations('company');
  const tCommon = useTranslations('common');
  const [ownersLimit, setOwnersLimit] = useState(10);
  const [boardSort, setBoardSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [foreignEntityDetail, setForeignEntityDetail] = useState<CompanyOwner | null>(null);

  const te = (key: string, fallback: string) => translateEnum(tCommon, key, fallback);

  return (
    <TabsContent value="people">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Owners */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('ownership.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {company.owners && company.owners.length > 0 ? (
              <div className="space-y-6">
                {/* Summary + Pie Chart */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Summary Stats */}
                  <div className="flex flex-col justify-center space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">{t('ownership.totalOwners')}</div>
                        <div className="text-2xl font-bold">{company.owners.length}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">{t('ownership.totalShares')}</div>
                        <div className="text-2xl font-bold">
                          {company.owners.reduce((sum, o) => sum + (o.sharesCount ?? 0), 0).toLocaleString('lv-LV')}
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">{t('ownership.totalCapital')}</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(company.owners.reduce((sum, o) => sum + (o.totalValue ?? 0), 0))}
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">{t('ownership.personallyLiableCount')}</div>
                        <div className="text-2xl font-bold">
                          {company.owners.filter(o => o.isPersonallyLiable).length}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Pie Chart */}
                  <div className="flex items-center justify-center">
                    <OwnershipChart
                      owners={[...company.owners]
                        .sort((a, b) => b.sharePercentage - a.sharePercentage)
                        .map(o => ({
                          name: o.owner.name,
                          sharePercentage: o.sharePercentage
                        }))}
                      otherLabel={t('ownership.other')}
                    />
                  </div>
                </div>

                {/* Detailed Ownership Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('ownership.owner')}</TableHead>
                        <TableHead className="text-right">{t('ownership.sharePercent')}</TableHead>
                        <TableHead className="text-right">{t('ownership.sharesCount')}</TableHead>
                        <TableHead className="text-right">{t('ownership.totalValue')}</TableHead>
                        <TableHead className="text-right">{t('ownership.votingRights')}</TableHead>
                        <TableHead>{t('ownership.memberSince')}</TableHead>
                        <TableHead>{t('ownership.registeredOn')}</TableHead>
                        <TableHead>{t('ownership.personallyLiable')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...company.owners]
                        .sort((a, b) => b.sharePercentage - a.sharePercentage)
                        .slice(0, ownersLimit)
                        .map((ownership) => (
                          <TableRow key={ownership.id}>
                            <TableCell>
                              <div>
                                {ownership.owner.isLegalEntity && ownership.owner.personalCode && /^\d{11}$/.test(ownership.owner.personalCode) ? (
                                  <Link href={`/company/${ownership.owner.personalCode}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                                    {ownership.owner.name}
                                    <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                                  </Link>
                                ) : ownership.owner.isForeignEntity ? (
                                  <button
                                    onClick={() => setForeignEntityDetail(ownership)}
                                    className="font-medium text-primary hover:underline inline-flex items-center gap-1 text-left"
                                  >
                                    {ownership.owner.country === 'LV' ? (
                                      <Landmark className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                      <Globe className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    {ownership.owner.name}
                                    <Info className="h-3 w-3 shrink-0 opacity-50" />
                                  </button>
                                ) : ownership.owner.isLegalEntity ? (
                                  <div className="font-medium inline-flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    {ownership.owner.name}
                                  </div>
                                ) : ownership.owner.personalCode ? (
                                  <Link href={`/person/${ownership.owner.personalCode}?name=${encodeURIComponent(ownership.owner.name)}`} className="font-medium text-primary hover:underline">
                                    {ownership.owner.name}
                                  </Link>
                                ) : (
                                  <div className="font-medium">{ownership.owner.name}</div>
                                )}
                                {ownership.owner.personalCode && (
                                  <div className="text-xs text-muted-foreground">
                                    {ownership.owner.personalCode}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">
                                {ownership.sharePercentage}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {ownership.sharesCount ?? tCommon('notAvailable')}
                              {ownership.nominalValue && (
                                <div className="text-xs">
                                  ({formatCurrency(ownership.nominalValue)} {t('ownership.nominal')})
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {ownership.totalValue ? formatCurrency(ownership.totalValue) : tCommon('notAvailable')}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {ownership.votingRights ? formatPercent(ownership.votingRights) : tCommon('notAvailable')}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ownership.memberSince ? formatDate(ownership.memberSince) : tCommon('notAvailable')}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ownership.registeredOn ? formatDate(ownership.registeredOn) : tCommon('notAvailable')}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ownership.isPersonallyLiable ? tCommon('yes') : tCommon('no')}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
                {company.owners.length > 10 && (
                  <div className="border-t pt-4 mt-2 space-y-2">
                    <div className="text-center text-xs text-muted-foreground">
                      {t('ownership.showing', { count: Math.min(ownersLimit, company.owners.length), total: company.owners.length })}
                    </div>
                    {ownersLimit < company.owners.length ? (
                      <button
                        onClick={() => setOwnersLimit(prev => prev + 25)}
                        className="w-full rounded-md border bg-muted text-muted-foreground py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                      >
                        {t('ownership.showMore')} (+25)
                      </button>
                    ) : (
                      <button
                        onClick={() => setOwnersLimit(10)}
                        className="w-full rounded-md border bg-muted text-muted-foreground py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                      >
                        {t('ownership.showLess')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">{t('ownership.noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* Board Members */}
        {company.boardMembers.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                {t('boardMembers.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('boardMembers.name')}</TableHead>
                    <TableHead>{t('boardMembers.personalCode')}</TableHead>
                    <TableHead>
                      <button
                        onClick={() => setBoardSort(prev =>
                          prev?.key === 'institution' ? (prev.dir === 'asc' ? { key: 'institution', dir: 'desc' } : null) : { key: 'institution', dir: 'asc' }
                        )}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {t('boardMembers.institution')}
                        {boardSort?.key === 'institution' ? (boardSort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => setBoardSort(prev =>
                          prev?.key === 'position' ? (prev.dir === 'asc' ? { key: 'position', dir: 'desc' } : null) : { key: 'position', dir: 'asc' }
                        )}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {t('boardMembers.position')}
                        {boardSort?.key === 'position' ? (boardSort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => setBoardSort(prev =>
                          prev?.key === 'appointedDate' ? (prev.dir === 'asc' ? { key: 'appointedDate', dir: 'desc' } : null) : { key: 'appointedDate', dir: 'asc' }
                        )}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {t('boardMembers.appointedDate')}
                        {boardSort?.key === 'appointedDate' ? (boardSort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                    </TableHead>
                    <TableHead>{t('boardMembers.representationRights')}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...company.boardMembers].sort((a, b) => {
                    if (!boardSort) return 0;
                    const { key, dir } = boardSort;
                    const mul = dir === 'asc' ? 1 : -1;
                    if (key === 'institution') return mul * (a.institution || '').localeCompare(b.institution || '');
                    if (key === 'position') return mul * (a.position || '').localeCompare(b.position || '');
                    if (key === 'appointedDate') {
                      const da = a.appointedDate ? new Date(a.appointedDate).getTime() : 0;
                      const db = b.appointedDate ? new Date(b.appointedDate).getTime() : 0;
                      return mul * (da - db);
                    }
                    return 0;
                  }).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.personalCode ? (
                          <Link href={`/person/${member.personalCode}?name=${encodeURIComponent(member.name)}`} className="text-primary hover:underline">
                            {member.name}
                          </Link>
                        ) : member.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.personalCode || tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.institution ? te(`governingBody.${member.institution}`, member.institution) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.position ? te(`position.${member.position}`, member.position) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.appointedDate ? formatDate(member.appointedDate) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.representationRights ? (
                          member.representationRights.startsWith('WITH_AT_LEAST:')
                            ? tCommon('representationRights.WITH_AT_LEAST', { count: member.representationRights.split(':')[1] })
                            : te(`representationRights.${member.representationRights}`, member.representationRights)
                        ) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="relative">
                        {member.note && (
                          <>
                            <button
                              onClick={() => setExpandedNotes(prev => {
                                const next = new Set(prev);
                                if (next.has(member.id)) next.delete(member.id);
                                else next.add(member.id);
                                return next;
                              })}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            {expandedNotes.has(member.id) && (
                              <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md">
                                {member.note}
                              </div>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Beneficial Owners */}
        {company.beneficialOwners.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {t('beneficialOwners.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('beneficialOwners.name')}</TableHead>
                    <TableHead>{t('beneficialOwners.personalCode')}</TableHead>
                    <TableHead>{t('beneficialOwners.statusSince')}</TableHead>
                    <TableHead>{t('beneficialOwners.residenceCountry')}</TableHead>
                    <TableHead>{t('beneficialOwners.citizenship')}</TableHead>
                    <TableHead>{t('beneficialOwners.controlType')}</TableHead>
                    <TableHead>{t('beneficialOwners.birthDate')}</TableHead>
                    <TableHead>{t('beneficialOwners.registeredOn')}</TableHead>
                    <TableHead>{t('beneficialOwners.isMinor')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.beneficialOwners.map((owner) => (
                    <TableRow key={owner.id}>
                      <TableCell className="font-medium">
                        {owner.personalCode ? (
                          <Link href={`/person/${owner.personalCode}?name=${encodeURIComponent(owner.name)}`} className="text-primary hover:underline">
                            {owner.name}
                          </Link>
                        ) : owner.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {owner.personalCode || tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {owner.dateFrom ? formatDate(owner.dateFrom) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {owner.residenceCountry ? te(`country.${owner.residenceCountry}`, owner.residenceCountry) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {owner.citizenship ? te(`country.${owner.citizenship}`, owner.citizenship) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {owner.controlType ? te(`controlType.${owner.controlType}`, owner.controlType) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {owner.birthDate ? formatDate(owner.birthDate) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {owner.registeredOn ? formatDate(owner.registeredOn) : tCommon('notAvailable')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {owner.isMinor ? tCommon('yes') : tCommon('no')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Foreign entity info dialog */}
      <Dialog open={!!foreignEntityDetail} onOpenChange={(open) => !open && setForeignEntityDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {foreignEntityDetail?.owner.country === 'LV' ? (
                <Landmark className="h-5 w-5" />
              ) : (
                <Globe className="h-5 w-5" />
              )}
              {foreignEntityDetail?.owner.name}
            </DialogTitle>
          </DialogHeader>
          {foreignEntityDetail && (
            <div className="space-y-3">
              {foreignEntityDetail.owner.personalCode && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('foreignEntity.registrationNumber')}</span>
                  <span className="text-sm font-mono">{foreignEntityDetail.owner.personalCode}</span>
                </div>
              )}
              {foreignEntityDetail.owner.country && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('foreignEntity.country')}</span>
                  <span className="text-sm">{te(`country.${foreignEntityDetail.owner.country}`, foreignEntityDetail.owner.country)}</span>
                </div>
              )}
              {foreignEntityDetail.memberSince && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('foreignEntity.memberSince')}</span>
                  <span className="text-sm">{formatDate(foreignEntityDetail.memberSince)}</span>
                </div>
              )}
              {foreignEntityDetail.sharePercentage > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('ownership.sharePercent')}</span>
                  <Badge variant="secondary">{foreignEntityDetail.sharePercentage}%</Badge>
                </div>
              )}
              {foreignEntityDetail.sharesCount != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('ownership.sharesCount')}</span>
                  <span className="text-sm">{foreignEntityDetail.sharesCount}</span>
                </div>
              )}
              {foreignEntityDetail.totalValue != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('ownership.totalValue')}</span>
                  <span className="text-sm font-medium">{formatCurrency(foreignEntityDetail.totalValue)}</span>
                </div>
              )}
              {!foreignEntityDetail.owner.personalCode && !foreignEntityDetail.owner.country && (
                <p className="text-sm text-muted-foreground italic">{t('foreignEntity.noAdditionalInfo')}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
