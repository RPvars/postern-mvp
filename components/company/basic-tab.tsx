'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Calendar, TrendingUp, FileText, AlertCircle, CheckCircle2, XCircle, ExternalLink, Landmark, History, ArrowRightLeft } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { translateEnum } from '@/lib/i18n/translate-enum';
import type { Company } from '@/lib/types/company';

interface BasicTabProps {
  company: Company;
}

export function BasicTab({ company }: BasicTabProps) {
  const t = useTranslations('company');
  const tCommon = useTranslations('common');
  const [stateAidLimit, setStateAidLimit] = useState(3);

  const te = (key: string, fallback: string) => translateEnum(tCommon, key, fallback);

  return (
    <TabsContent value="basic">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pamatdati */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {t('companyInfo.basicData')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.cleanedShortName && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.shortName')}</div>
                <div className="text-sm">{company.cleanedShortName}</div>
              </div>
            )}
            {company.legalForm && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.legalForm')}</div>
                <div className="text-sm">{te(`legalForm.${company.legalForm}`, company.legalForm)}</div>
              </div>
            )}
            {company.register && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.register')}</div>
                <div className="text-sm">{te(`register.${company.register}`, company.register)}</div>
              </div>
            )}
            {company.legalAddress && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.legalAddress')}</div>
                <div className="text-sm">{company.legalAddress}</div>
              </div>
            )}
            {company.phone && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.phone')}</div>
                <div className="text-sm">{company.phone}</div>
              </div>
            )}
            {company.email && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.email')}</div>
                <div className="text-sm">{company.email}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reģistrācija */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              {t('companyInfo.registrationSection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.registrationNumberDate')}</div>
              <div className="text-sm">{company.registrationNumber}, {formatDate(company.registrationDate)}</div>
            </div>
            {company.articlesDate && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.articlesDate')}</div>
                <div className="text-sm">{formatDate(company.articlesDate)}</div>
              </div>
            )}
            {company.lastModifiedAt && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.lastModified')}</div>
                <div className="text-sm">{formatDate(company.lastModifiedAt)}</div>
              </div>
            )}
            {company.sepaCreditorId && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.sepaId')}</div>
                <div className="text-sm font-mono">{company.sepaCreditorId}</div>
              </div>
            )}
            {/* PVN maksātāju reģistrs */}
            <div className="border-t pt-3 mt-1">
              <div className="text-xs font-medium text-muted-foreground">{t('vatRegistry.title')}</div>
              {company.vatPayer ? (
                <div>
                  <div className="text-sm flex items-center gap-1 flex-wrap">
                    <span className="font-medium">{company.vatPayer.vatNumber}</span>
                    <span className="text-muted-foreground">·</span>
                    {company.vatPayer.isActive ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('vatRegistry.active')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="h-3.5 w-3.5" />
                        {t('vatRegistry.inactive')}
                      </span>
                    )}
                    {company.vatPayer.registeredDate && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{t('vatRegistry.registered')} {formatDate(company.vatPayer.registeredDate)}</span>
                      </>
                    )}
                    {company.vatPayer.deregisteredDate && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{t('vatRegistry.deregistered')} {formatDate(company.vatPayer.deregisteredDate)}</span>
                      </>
                    )}
                  </div>
                  <a
                    href="https://ec.europa.eu/taxation_customs/vies/#/vat-validation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1"
                  >
                    {t('vatRegistry.viewEuRegistry')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t('vatRegistry.notRegistered')}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kapitāls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              {t('companyInfo.capital')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.shareCapital ? (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.shareCapital')}</div>
                <div className="text-sm">
                  {formatCurrency(company.shareCapital)}
                  {company.shareCapitalRegisteredDate && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({t('companyInfo.registered')} {formatDate(company.shareCapitalRegisteredDate)})
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{tCommon('notAvailable')}</div>
            )}
            {company.registeredVehiclesCount != null && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.vehicles')}</div>
                <div className="text-sm">{company.registeredVehiclesCount}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Darbība */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {t('companyInfo.operations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.naceCode && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.naceCode')}</div>
                <div className="text-sm">
                  <a
                    href={`/industries/${company.naceCode.replace('.', '').slice(0, 2)}`}
                    className="hover:text-[#FEC200] transition-colors"
                  >
                    {company.naceDescription || company.naceCode}
                    <span className="text-muted-foreground ml-1">({company.naceCode})</span>
                  </a>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{t('companyInfo.naceSource')}</div>
              </div>
            )}
            {company.durationIndefinite != null && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.duration')}</div>
                <div className="text-sm">
                  {company.durationIndefinite ? t('companyInfo.durationIndefinite') : t('companyInfo.durationDefinite')}
                </div>
              </div>
            )}
            {company.businessPurpose && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">{t('companyInfo.businessPurpose')}</div>
                <div className="text-sm">{company.businessPurpose}</div>
              </div>
            )}
            {!company.naceCode && !company.durationIndefinite && company.durationIndefinite == null && !company.businessPurpose && (
              <div className="text-sm text-muted-foreground">{tCommon('notAvailable')}</div>
            )}
          </CardContent>
        </Card>

        {/* Valsts atbalsts (de minimis) */}
        {company.stateAid && company.stateAid.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4" />
                {t('stateAid.title')}
              </CardTitle>
              <CardDescription>
                {t('stateAid.totalAmount')}: {company.stateAid.reduce((sum, sa) => sum + sa.amount, 0).toLocaleString('lv-LV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {company.stateAid.slice(0, stateAidLimit).map((sa, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-4 mb-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(sa.assignDate)}</span>
                      <span className="text-sm font-mono font-medium whitespace-nowrap">
                        {sa.amount.toLocaleString('lv-LV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                      </span>
                    </div>
                    <div className="text-sm">{sa.projectTitle}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {sa.assignerTitle}
                      {sa.programTitle && <> · {sa.programTitle}</>}
                    </div>
                  </div>
                ))}
              </div>
              {company.stateAid.length > 3 && (
                <div className="border-t pt-4 mt-2 space-y-2">
                  <div className="text-center text-xs text-muted-foreground">
                    {t('ownership.showing', { count: Math.min(stateAidLimit, company.stateAid.length), total: company.stateAid.length })}
                  </div>
                  {stateAidLimit < company.stateAid.length ? (
                    <button
                      onClick={() => setStateAidLimit(company.stateAid.length)}
                      className="w-full rounded-md border bg-muted text-muted-foreground py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                    >
                      {t('ownership.showMore')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setStateAidLimit(3)}
                      className="w-full rounded-md border bg-muted text-muted-foreground py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                    >
                      {t('ownership.showLess')}
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Risk & Compliance Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {t('risk.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{t('risk.liquidation')}</TableCell>
                  <TableCell className={company.inLiquidation ? 'text-[#FF8042] font-semibold' : ''}>
                    {company.inLiquidation ? t('risk.hasValue') : t('risk.noValue')}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t('risk.insolvency')}</TableCell>
                  <TableCell className={company.inInsolvencyRegister ? 'text-red-600 font-semibold' : ''}>
                    {company.inInsolvencyRegister ? t('risk.hasValue') : t('risk.noValue')}
                  </TableCell>
                </TableRow>
                <TableRow className="opacity-50">
                  <TableCell className="font-medium">{t('risk.paymentClaims')}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground italic">{t('risk.noDataSource')}</span>
                  </TableCell>
                </TableRow>
                <TableRow className="opacity-50">
                  <TableCell className="font-medium">{t('risk.commercialPledges')}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground italic">{t('risk.noDataSource')}</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t('risk.securities')}</TableCell>
                  <TableCell className={company.hasSecurities ? 'text-[#FF8042] font-semibold' : ''}>
                    {company.hasSecurities
                      ? `${t('risk.hasValue')} (${company.securingMeasures.length})`
                      : t('risk.noValue')}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t('risk.sanctionsRisk')}</TableCell>
                  <TableCell className={company.sanctionsRisk ? 'text-red-600 font-semibold' : ''}>
                    {company.sanctionsRisk ? t('risk.hasValue') : t('risk.noValue')}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t('risk.taxpayerRating')}</TableCell>
                  <TableCell>
                    {company.taxpayerRating ? (
                      <span className={`font-semibold ${
                        company.taxpayerRating === 'A' ? 'text-green-600' :
                        company.taxpayerRating === 'B' ? 'text-yellow-600' :
                        company.taxpayerRating === 'C' ? 'text-red-600' :
                        'text-muted-foreground'
                      }`}>
                        {company.taxpayerRating}
                        {company.taxpayerRatingDescription && (
                          <span className="font-normal text-muted-foreground text-sm ml-2">
                            ({company.taxpayerRatingDescription})
                          </span>
                        )}
                      </span>
                    ) : t('risk.noValue')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {company.specialStatuses.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {t('companyInfo.specialStatuses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('companyInfo.specialStatusType')}</TableHead>
                    <TableHead>{t('companyInfo.specialStatusDateFrom')}</TableHead>
                    <TableHead>{t('companyInfo.specialStatusRegisteredOn')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.specialStatuses.map((ss) => (
                    <TableRow key={ss.id}>
                      <TableCell className="font-medium">{te(`specialStatus.${ss.type}`, ss.type)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(ss.dateFrom)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {ss.registeredOn ? formatDate(ss.registeredOn) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {company.previousNames.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                {t('previousNames.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {company.previousNames.map((pn, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b last:border-0">
                    <span className="text-sm font-medium">{pn.name}</span>
                    <span className="text-sm text-muted-foreground">{t('previousNames.validUntil')} {formatDate(pn.dateTo)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {company.reorganizations.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowRightLeft className="h-4 w-4" />
                {t('reorganizations.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {company.reorganizations.map((reorg, i) => (
                  <div key={i} className="py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{te(`reorganizationType.${reorg.type}`, reorg.typeText)}</Badge>
                      <span className="text-sm text-muted-foreground">{formatDate(reorg.registered)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {/^\d{11}$/.test(reorg.sourceRegcode) ? (
                        <Link href={`/company/${reorg.sourceRegcode}`} className="text-primary hover:underline">
                          {reorg.sourceRegcode}
                        </Link>
                      ) : (
                        <span>{reorg.sourceRegcode}</span>
                      )}
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                      {/^\d{11}$/.test(reorg.finalRegcode) ? (
                        <Link href={`/company/${reorg.finalRegcode}`} className="text-primary hover:underline">
                          {reorg.finalRegcode}
                        </Link>
                      ) : (
                        <span>{reorg.finalRegcode}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TabsContent>
  );
}
