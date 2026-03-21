import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { captureException } from '@/lib/sentry';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(`person:${identifier}`, 30, 60000);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetIn / 1000).toString() } }
    );
  }

  try {
    const { code } = await params;
    const cleanCode = code.trim();
    if (!cleanCode || !/^[\d\-*]{6,15}$/.test(cleanCode)) {
      return NextResponse.json({ error: 'Invalid person code' }, { status: 400 });
    }

    // Name hint from query param — used to disambiguate when masked codes match multiple people
    const rawName = request.nextUrl.searchParams.get('name');
    const nameHint = rawName ? rawName.trim().slice(0, 150) : null;
    const isMasked = cleanCode.includes('*');

    const companySelect = { select: { registrationNumber: true, name: true, status: true, legalForm: true, legalAddress: true, latitude: true, longitude: true } } as const;

    // Step 1: Try exact personalCode match
    let [ownerships, boardPositions, beneficialOwnerships] = await Promise.all([
      prisma.ownership.findMany({
        where: { owner: { personalCode: cleanCode }, isHistorical: false },
        include: { owner: true, company: companySelect },
        orderBy: { sharePercentage: 'desc' },
      }),
      prisma.boardMember.findMany({
        where: { personalCode: cleanCode, isHistorical: false },
        include: { company: companySelect },
        orderBy: { appointedDate: 'desc' },
      }),
      prisma.beneficialOwner.findMany({
        where: { personalCode: cleanCode },
        include: { company: companySelect },
        orderBy: { dateFrom: 'desc' },
      }),
    ]);

    // Step 2: If no exact match and code is full, try masked version with name filter
    if (!isMasked && ownerships.length === 0 && boardPositions.length === 0 && beneficialOwnerships.length === 0) {
      const maskedVersion = cleanCode.replace(/-?\d{5}$/, '-*****');
      if (maskedVersion !== cleanCode) {
        // When searching by masked code, MUST filter by name to avoid wrong-person matches
        const codeFilter = nameHint ? { personalCode: maskedVersion, name: nameHint } : { personalCode: maskedVersion };

        [ownerships, boardPositions, beneficialOwnerships] = await Promise.all([
          prisma.ownership.findMany({
            where: { owner: codeFilter, isHistorical: false },
            include: { owner: true, company: companySelect },
            orderBy: { sharePercentage: 'desc' },
          }),
          prisma.boardMember.findMany({
            where: { ...codeFilter, isHistorical: false },
            include: { company: companySelect },
            orderBy: { appointedDate: 'desc' },
          }),
          prisma.beneficialOwner.findMany({
            where: codeFilter,
            include: { company: companySelect },
            orderBy: { dateFrom: 'desc' },
          }),
        ]);
      }
    }

    // Step 3: If masked code provided, also filter by name when available
    if (isMasked && ownerships.length === 0 && boardPositions.length === 0 && beneficialOwnerships.length === 0 && nameHint) {
      [ownerships, boardPositions, beneficialOwnerships] = await Promise.all([
        prisma.ownership.findMany({
          where: { owner: { personalCode: cleanCode, name: nameHint }, isHistorical: false },
          include: { owner: true, company: companySelect },
          orderBy: { sharePercentage: 'desc' },
        }),
        prisma.boardMember.findMany({
          where: { personalCode: cleanCode, name: nameHint, isHistorical: false },
          include: { company: companySelect },
          orderBy: { appointedDate: 'desc' },
        }),
        prisma.beneficialOwner.findMany({
          where: { personalCode: cleanCode, name: nameHint },
          include: { company: companySelect },
          orderBy: { dateFrom: 'desc' },
        }),
      ]);
    }

    // Deduplicate by company
    const allOwnerships = deduplicateByCompany(ownerships, o => o.company.registrationNumber);
    const allBoardPositions = deduplicateByCompany(boardPositions, b => b.company.registrationNumber);
    const allBeneficialOwnerships = deduplicateByCompany(beneficialOwnerships, bo => bo.company.registrationNumber);

    // Determine person name
    const name = nameHint
      || allOwnerships[0]?.owner?.name
      || allBoardPositions[0]?.name
      || allBeneficialOwnerships[0]?.name
      || null;

    if (!name && allOwnerships.length === 0 && allBoardPositions.length === 0 && allBeneficialOwnerships.length === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const boWithDetails = allBeneficialOwnerships.find(bo => bo.citizenship || bo.residenceCountry || bo.birthDate);

    return NextResponse.json({
      person: {
        name,
        personalCode: cleanCode,
        citizenship: boWithDetails?.citizenship || null,
        residenceCountry: boWithDetails?.residenceCountry || null,
        birthDate: boWithDetails?.birthDate || null,
        ownerships: allOwnerships.map(o => ({
          company: {
            registrationNumber: o.company.registrationNumber,
            name: o.company.name,
            status: o.company.status,
            legalForm: o.company.legalForm,
            legalAddress: o.company.legalAddress,
            latitude: o.company.latitude,
            longitude: o.company.longitude,
          },
          sharePercentage: o.sharePercentage,
          sharesCount: o.sharesCount ? Number(o.sharesCount) : null,
          totalValue: o.totalValue,
          votingRights: o.votingRights,
          memberSince: o.memberSince,
        })),
        boardPositions: allBoardPositions.map(b => ({
          company: {
            registrationNumber: b.company.registrationNumber,
            name: b.company.name,
            status: b.company.status,
            legalForm: b.company.legalForm,
            legalAddress: b.company.legalAddress,
            latitude: b.company.latitude,
            longitude: b.company.longitude,
          },
          position: b.position,
          institution: b.institution,
          appointedDate: b.appointedDate,
          representationRights: b.representationRights,
        })),
        beneficialOwnerships: allBeneficialOwnerships.map(bo => ({
          company: {
            registrationNumber: bo.company.registrationNumber,
            name: bo.company.name,
            status: bo.company.status,
            legalForm: bo.company.legalForm,
            legalAddress: bo.company.legalAddress,
            latitude: bo.company.latitude,
            longitude: bo.company.longitude,
          },
          controlType: bo.controlType,
          dateFrom: bo.dateFrom,
          residenceCountry: bo.residenceCountry,
          citizenship: bo.citizenship,
        })),
      },
    });
  } catch (error) {
    captureException(error, { endpoint: 'person' });
    return NextResponse.json({ error: 'Failed to fetch person data' }, { status: 500 });
  }
}

function deduplicateByCompany<T>(items: T[], getRegNumber: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = getRegNumber(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
