import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { companyIdSchema } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { captureException } from '@/lib/sentry';
import { httpClient } from '@/lib/business-register/client/http';
import { companyMapper, boardMemberMapper, memberMapper, beneficialOwnerMapper } from '@/lib/business-register/mappers/company';
import { prisma } from '@/lib/prisma';
import { getFinancialData } from '@/lib/data-gov/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(
    `company:${identifier}`,
    APP_CONFIG.rateLimit.endpoints.companyDetail.maxRequests,
    APP_CONFIG.rateLimit.endpoints.companyDetail.windowMs
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetIn / 1000).toString(),
        },
      }
    );
  }

  try {
    const { id } = await params;

    // Validate company ID format
    const validationResult = companyIdSchema.safeParse(id);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    const [legalEntity, taxPaymentRecords, financialData, insolvencyRecords, taxpayerRatingRecord, vatPayerRecord, stateAidRecords, nameHistoryRecords, reorganizationRecords] = await Promise.all([
      httpClient.getLegalEntity(id),
      prisma.taxPayment.findMany({
        where: { registrationNumber: id },
        orderBy: { year: 'desc' },
      }),
      getFinancialData(id).catch(() => []),
      prisma.insolvencyProceeding.findMany({
        where: { registrationNumber: id },
      }),
      prisma.taxpayerRating.findUnique({
        where: { registrationNumber: id },
      }),
      prisma.vatPayer.findUnique({
        where: { vatNumber: `LV${id}` },
      }),
      prisma.stateAid.findMany({
        where: { registrationNumber: id },
        orderBy: { assignDate: 'desc' },
        take: 20,
      }),
      prisma.companyNameHistory.findMany({
        where: { registrationNumber: id },
        orderBy: { dateTo: 'desc' },
      }),
      prisma.reorganization.findMany({
        where: {
          OR: [
            { sourceEntityRegcode: id },
            { finalEntityRegcode: id },
          ],
        },
        orderBy: { registered: 'desc' },
      }),
    ]);

    // Resolve legal entity names for members/officers missing legalName (capped to avoid excessive API calls)
    const MAX_NAME_LOOKUPS = 10;
    const unresolvedRegNrs = new Set<string>();
    for (const m of legalEntity.members || []) {
      if (m.legalEntity?.registrationNumber && !m.legalEntity.legalName) {
        unresolvedRegNrs.add(m.legalEntity.registrationNumber);
      }
    }
    for (const o of legalEntity.officers || []) {
      if (o.legalEntity?.registrationNumber && !o.legalEntity.legalName) {
        unresolvedRegNrs.add(o.legalEntity.registrationNumber);
      }
    }

    if (unresolvedRegNrs.size > 0) {
      const results = await Promise.allSettled(
        [...unresolvedRegNrs].slice(0, MAX_NAME_LOOKUPS).map(async (regNr) => {
          const entity = await httpClient.getLegalEntity(regNr);
          return { regNr, name: entity.legalName?.trim() || '' };
        })
      );
      const nameMap = new Map<string, string>();
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.name) nameMap.set(r.value.regNr, r.value.name);
      }
      for (const m of legalEntity.members || []) {
        if (m.legalEntity?.registrationNumber && !m.legalEntity.legalName && nameMap.has(m.legalEntity.registrationNumber)) {
          m.legalEntity.legalName = nameMap.get(m.legalEntity.registrationNumber)!;
        }
      }
      for (const o of legalEntity.officers || []) {
        if (o.legalEntity?.registrationNumber && !o.legalEntity.legalName && nameMap.has(o.legalEntity.registrationNumber)) {
          o.legalEntity.legalName = nameMap.get(o.legalEntity.registrationNumber)!;
        }
      }
    }

    // Extract NACE code from latest tax payment year
    const latestNaceRaw = taxPaymentRecords.length > 0
      ? taxPaymentRecords[0]?.naceCode // already sorted desc by year
      : null;
    const formatNaceCode = (code: string) =>
      code.includes('.') ? code : code.slice(0, 2) + '.' + code.slice(2);
    const naceRecord = latestNaceRaw
      ? await prisma.naceCode.findUnique({
          where: { code: formatNaceCode(latestNaceRaw) },
        })
      : null;

    // Extract share capital from equity capitals
    const paidUpEquity = legalEntity.commercialEntityDetails?.equityCapitals?.find(
      ec => ec.type === 'PAID_UP_EQUITY'
    );

    const company = {
      ...companyMapper.fromLegalEntity(legalEntity),
      id, // Use registration number as ID
      legalAddress: legalEntity.address.addressComplete,
      postalCode: legalEntity.address.postalCode || null,
      city: legalEntity.address.city || null,
      street: legalEntity.address.street || null,
      houseNumber: legalEntity.address.houseNumber || null,
      addressRegisterCode: legalEntity.address.addressRegisterCode ?? null,
      atvkCode: legalEntity.atvkCode || null,
      isAnnulled: legalEntity.isAnnulled,
      register: legalEntity.register,
      cleanedShortName: legalEntity.cleanedShortName || null,
      lastModifiedAt: legalEntity.lastModifiedAt || null,
      sepaCreditorId: legalEntity.sepaCreditorId || null,
      businessPurpose: legalEntity.formationDetails?.objects || null,
      durationIndefinite: legalEntity.formationDetails?.durationIndefinite ?? null,
      articlesDate: legalEntity.formationDetails?.dateOfEffectiveArticlesOfAssociation || null,
      // Capital
      shareCapital: paidUpEquity?.amount ?? null,
      shareCapitalRegisteredDate: paidUpEquity?.registeredOn ?? null,
      // Risk flags derived from API data
      inLiquidation: (legalEntity.liquidations?.length ?? 0) > 0,
      inInsolvencyRegister: insolvencyRecords.some(r => r.dateTo === null),
      hasPaymentClaims: false, // Not available from this API
      hasCommercialPledges: false, // Requires separate API call
      hasSecurities: (legalEntity.securingMeasures?.length ?? 0) > 0,
      hasEncumbrances: false,
      hasTaxDebts: false, // VID data, not available
      taxDebtsCheckedDate: null,
      sanctionsRisk: legalEntity.sanctionsRisk ?? false,
      // Special statuses & securing measures
      specialStatuses: (legalEntity.specialStatuses || []).filter(s => !s.isAnnulled),
      securingMeasures: legalEntity.securingMeasures || [],
      // People
      owners: (legalEntity.members || [])
        .filter(m => !m.isAnnulled)
        .map(m => memberMapper.fromMember(m)),
      boardMembers: (legalEntity.officers || [])
        .filter(o => !o.isAnnulled)
        .map(o => boardMemberMapper.fromOfficer(o, id)),
      beneficialOwners: (legalEntity.beneficialOwners || [])
        .filter(bo => !bo.isAnnulled)
        .map(bo => beneficialOwnerMapper.fromApiResponse(bo)),
      taxPayments: taxPaymentRecords.map((tp) => ({
        id: tp.id,
        year: tp.year,
        amount: tp.amount,
        iinAmount: tp.iinAmount,
        vsaoiAmount: tp.vsaoiAmount,
        employeeCount: tp.employeeCount,
      })),
      financialRatios: financialData,
      taxpayerRating: taxpayerRatingRecord?.rating ?? null,
      taxpayerRatingDescription: taxpayerRatingRecord?.ratingDescription ?? null,
      insolvencyProceedings: insolvencyRecords.map((r) => ({
        proceedingForm: r.proceedingForm,
        status: r.status,
        dateFrom: r.dateFrom,
        dateTo: r.dateTo,
        court: r.court,
      })),
      naceCode: latestNaceRaw ? formatNaceCode(latestNaceRaw) : null,
      naceDescription: naceRecord?.nameLv ?? null,
      stateAid: stateAidRecords.map((sa) => ({
        assignDate: sa.assignDate,
        projectTitle: sa.projectTitle,
        assignerTitle: sa.assignerTitle,
        programTitle: sa.programTitle,
        amount: sa.amount,
        instrumentTitle: sa.instrumentTitle,
      })),
      vatPayer: vatPayerRecord ? {
        vatNumber: vatPayerRecord.vatNumber,
        isActive: vatPayerRecord.isActive,
        registeredDate: vatPayerRecord.registeredDate,
        deregisteredDate: vatPayerRecord.deregisteredDate,
      } : null,
      previousNames: nameHistoryRecords.map((r) => ({
        name: r.name,
        dateTo: r.dateTo,
      })),
      reorganizations: reorganizationRecords.map((r) => ({
        type: r.reorganizationType,
        typeText: r.reorganizationTypeText,
        sourceRegcode: r.sourceEntityRegcode,
        finalRegcode: r.finalEntityRegcode,
        registered: r.registered,
      })),
    };

    return NextResponse.json({ company });
  } catch (error) {
    captureException(error, { endpoint: 'company-detail' });

    if (env.NODE_ENV === 'development') {
      console.error('Company fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch company details' },
      { status: 500 }
    );
  }
}
