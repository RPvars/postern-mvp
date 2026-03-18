import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { companyIdSchema } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { captureException } from '@/lib/sentry';
import { httpClient } from '@/lib/business-register/client/http';
import { companyMapper, boardMemberMapper, memberMapper, beneficialOwnerMapper } from '@/lib/business-register/mappers/company';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const validationResult = companyIdSchema.safeParse(id);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    const [legalEntity, taxPaymentRecords, insolvencyRecords, taxpayerRatingRecord, vatPayerRecord, stateAidRecords, nameHistoryRecords, reorganizationRecords] = await Promise.all([
      httpClient.getLegalEntity(id),
      prisma.taxPayment.findMany({
        where: { registrationNumber: id },
        orderBy: { year: 'desc' },
      }),
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

    // Extract NACE code from latest tax payment year
    const latestNaceRaw = taxPaymentRecords.length > 0
      ? taxPaymentRecords[0]?.naceCode
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
      id,
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
      shareCapital: paidUpEquity?.amount ?? null,
      shareCapitalRegisteredDate: paidUpEquity?.registeredOn ?? null,
      inLiquidation: (legalEntity.liquidations?.length ?? 0) > 0,
      inInsolvencyRegister: insolvencyRecords.some(r => r.dateTo === null),
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: (legalEntity.securingMeasures?.length ?? 0) > 0,
      hasEncumbrances: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: null,
      sanctionsRisk: legalEntity.sanctionsRisk ?? false,
      specialStatuses: (legalEntity.specialStatuses || []).filter(s => !s.isAnnulled),
      securingMeasures: legalEntity.securingMeasures || [],
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
      financialRatios: [],
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
      annualReports: [],
    };

    // Cache person data in DB for cross-company person lookup (fire-and-forget)
    cachePersonData(id, legalEntity).catch((err) => {
      captureException(err, { endpoint: 'company-basic-cache' });
    });

    return NextResponse.json({ company });
  } catch (error) {
    captureException(error, { endpoint: 'company-basic' });

    if (env.NODE_ENV === 'development') {
      console.error('Company basic fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch company details' },
      { status: 500 }
    );
  }
}

async function cachePersonData(
  regNumber: string,
  legalEntity: import('@/lib/business-register/types/api-responses').LegalEntityApiResponse
) {
  // Ensure Company record exists
  await prisma.company.upsert({
    where: { registrationNumber: regNumber },
    update: { name: legalEntity.legalName, status: legalEntity.status || 'unknown' },
    create: {
      registrationNumber: regNumber,
      name: legalEntity.legalName,
      taxNumber: regNumber,
      legalAddress: legalEntity.address.addressComplete,
      registrationDate: legalEntity.registeredOn ? new Date(legalEntity.registeredOn) : new Date('1900-01-01'),
      status: legalEntity.status || 'unknown',
      legalForm: legalEntity.type || null,
    },
  });

  const company = await prisma.company.findUnique({ where: { registrationNumber: regNumber } });
  if (!company) return;

  // Cache owners (members) — find or create Owner, then upsert Ownership
  const activeMembers = (legalEntity.members || []).filter(m => !m.isAnnulled);
  for (const m of activeMembers) {
    const name = m.naturalPerson?.name?.trim() || m.legalEntity?.legalName?.trim() || m.legalEntity?.name?.trim() || null;
    const personalCode = m.naturalPerson?.latvianIdentityNumber || m.legalEntity?.registrationNumber || null;
    if (!name) continue;

    let owner = personalCode
      ? await prisma.owner.findFirst({ where: { personalCode } })
      : await prisma.owner.findFirst({ where: { name, personalCode: null } });

    if (owner) {
      await prisma.owner.update({ where: { id: owner.id }, data: { name } });
    } else {
      owner = await prisma.owner.create({ data: { name, personalCode } });
    }

    const details = m.shareHolderDetails;
    await prisma.ownership.upsert({
      where: { companyId_ownerId: { companyId: company.id, ownerId: owner.id } },
      update: {
        sharePercentage: details?.inPercent ?? 0,
        sharesCount: details?.numberOfShares ?? null,
        nominalValue: details?.shareNominalValue ?? null,
        totalValue: details ? details.numberOfShares * details.shareNominalValue : null,
        votingRights: details?.votes ?? null,
        memberSince: m.dateFrom ? new Date(m.dateFrom) : null,
        isHistorical: false,
      },
      create: {
        companyId: company.id,
        ownerId: owner.id,
        sharePercentage: details?.inPercent ?? 0,
        sharesCount: details?.numberOfShares ?? null,
        nominalValue: details?.shareNominalValue ?? null,
        totalValue: details ? details.numberOfShares * details.shareNominalValue : null,
        votingRights: details?.votes ?? null,
        memberSince: m.dateFrom ? new Date(m.dateFrom) : null,
        isHistorical: false,
      },
    });
  }

  // Cache board members and beneficial owners in transactions to prevent race conditions
  const activeOfficers = (legalEntity.officers || []).filter(o => !o.isAnnulled);
  const officerData = activeOfficers.map(o => ({
    companyId: company.id,
    name: o.naturalPerson?.name?.trim() || o.legalEntity?.legalName?.trim() || 'Unknown',
    personalCode: o.naturalPerson?.latvianIdentityNumber || o.legalEntity?.registrationNumber || null,
    institution: o.governingBody || null,
    position: o.position || null,
    appointedDate: o.appointedOn ? new Date(o.appointedOn) : null,
    representationRights: o.rightsOfRepresentation?.[0]?.type || null,
    notes: o.note || null,
    isHistorical: false,
  }));

  await prisma.$transaction([
    prisma.boardMember.deleteMany({ where: { companyId: company.id } }),
    ...(officerData.length > 0 ? [prisma.boardMember.createMany({ data: officerData })] : []),
  ]);

  const activeBOs = (legalEntity.beneficialOwners || []).filter(bo => !bo.isAnnulled);
  const boData = activeBOs.map(bo => {
    const np = bo.naturalPerson;
    return {
      companyId: company.id,
      name: np ? `${np.forename || ''} ${np.surname || ''}`.trim() : 'Unknown',
      personalCode: np?.latvianIdentityNumber || null,
      dateFrom: bo.dateFrom ? new Date(bo.dateFrom) : null,
      residenceCountry: np?.countryOfResidence || np?.country || null,
      citizenship: np?.country || null,
      birthDate: np?.birthDate ? new Date(np.birthDate) : null,
      controlType: bo.meansOfControl?.[0]?.natureOfControl || null,
    };
  });

  await prisma.$transaction([
    prisma.beneficialOwner.deleteMany({ where: { companyId: company.id } }),
    ...(boData.length > 0 ? [prisma.beneficialOwner.createMany({ data: boData })] : []),
  ]);
}
