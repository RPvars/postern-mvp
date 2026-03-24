import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { captureException } from '@/lib/sentry';
import { prisma } from '@/lib/prisma';
import { normalizeName } from '@/lib/text-utils';
import { httpClient } from '@/lib/business-register/client/http';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // GDPR: personal data requires authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

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

    // Masked codes require name to disambiguate — without it, different people get merged
    if (isMasked && !nameHint) {
      return NextResponse.json(
        { error: 'Name parameter required for masked personal codes' },
        { status: 400 }
      );
    }

    // Build name variants for normalized matching (handles "Vārds Uzvārds" vs "Uzvārds Vārds")
    const nameVariants = nameHint ? (() => {
      const normalized = normalizeName(nameHint);
      const words = normalized.split(' ');
      const reversed = words.length === 2 ? `${words[1]} ${words[0]}` : normalized;
      return reversed !== normalized ? [normalized, reversed] : [normalized];
    })() : null;

    const companySelect = { select: { registrationNumber: true, name: true, status: true, legalForm: true, legalAddress: true, latitude: true, longitude: true } } as const;

    // Build where clauses based on code type
    let ownerWhere: Record<string, unknown>;
    let boardWhere: Record<string, unknown>;
    let beneficialWhere: Record<string, unknown>;

    if (isMasked && nameVariants) {
      // Masked code: filter by code + name to prevent cross-person merging
      ownerWhere = { owner: { personalCode: cleanCode, nameNormalized: { in: nameVariants } }, isHistorical: false };
      boardWhere = { personalCode: cleanCode, nameNormalized: { in: nameVariants }, isHistorical: false };
      beneficialWhere = { personalCode: cleanCode, nameNormalized: { in: nameVariants } };
    } else if (!isMasked) {
      // Full code: query BOTH full code AND masked version (with name filter) to catch CSV-imported records
      const maskedVersion = cleanCode.replace(/-?\d{5}$/, '-*****');
      const nameFilter = nameVariants ? { nameNormalized: { in: nameVariants } } : {};

      ownerWhere = {
        owner: { OR: [{ personalCode: cleanCode }, { personalCode: maskedVersion, ...nameFilter }] },
        isHistorical: false,
      };
      boardWhere = {
        OR: [
          { personalCode: cleanCode, isHistorical: false },
          { personalCode: maskedVersion, ...nameFilter, isHistorical: false },
        ],
      };
      beneficialWhere = {
        OR: [{ personalCode: cleanCode }, { personalCode: maskedVersion, ...nameFilter }],
      };
    } else {
      ownerWhere = { owner: { personalCode: cleanCode }, isHistorical: false };
      boardWhere = { personalCode: cleanCode, isHistorical: false };
      beneficialWhere = { personalCode: cleanCode };
    }

    let [ownerships, boardPositions, beneficialOwnerships] = await Promise.all([
      prisma.ownership.findMany({
        where: ownerWhere,
        include: { owner: true, company: companySelect },
        orderBy: { sharePercentage: 'desc' },
      }),
      prisma.boardMember.findMany({
        where: boardWhere,
        include: { company: companySelect },
        orderBy: { appointedDate: 'desc' },
      }),
      prisma.beneficialOwner.findMany({
        where: beneficialWhere,
        include: { company: companySelect },
        orderBy: { dateFrom: 'desc' },
      }),
    ]);

    // Uncertain matches — masked-code records where BR API couldn't confirm or deny
    let uncertainOwnerships: typeof ownerships = [];
    let uncertainBoardPositions: typeof boardPositions = [];
    let uncertainBeneficialOwnerships: typeof beneficialOwnerships = [];

    // For full codes: validate masked-code matches via BR API to confirm identity
    if (!isMasked) {
      const maskedVersion = cleanCode.replace(/-?\d{5}$/, '-*****');

      // Collect companies found only via masked code (need BR API verification)
      const maskedOwnerCompanies = new Set(
        ownerships.filter(o => o.owner.personalCode === maskedVersion).map(o => o.company.registrationNumber)
      );
      const maskedBoardCompanies = new Set(
        boardPositions.filter(b => b.personalCode === maskedVersion).map(b => b.company.registrationNumber)
      );
      const maskedBeneficialCompanies = new Set(
        beneficialOwnerships.filter(bo => bo.personalCode === maskedVersion).map(bo => bo.company.registrationNumber)
      );
      const allMaskedCompanies = new Set([...maskedOwnerCompanies, ...maskedBoardCompanies, ...maskedBeneficialCompanies]);

      if (allMaskedCompanies.size > 0) {
        // Verify via BR API (max 10 parallel calls, cached 5min)
        const companiesToVerify = [...allMaskedCompanies].slice(0, 10);
        type ValidationResult = { regNumber: string; status: 'verified' | 'rejected' | 'uncertain' };
        const validations = await Promise.allSettled(
          companiesToVerify.map(async (regNumber): Promise<ValidationResult> => {
            try {
              const entity = await httpClient.getLegalEntity(regNumber);
              const allPersonCodes = [
                ...(entity.officers || []).map(o => o.naturalPerson?.latvianIdentityNumber),
                ...(entity.members || []).map(m => m.naturalPerson?.latvianIdentityNumber),
                ...(entity.beneficialOwners || []).map(bo => bo.naturalPerson?.latvianIdentityNumber),
              ];
              return { regNumber, status: allPersonCodes.includes(cleanCode) ? 'verified' : 'rejected' };
            } catch {
              return { regNumber, status: 'uncertain' };
            }
          })
        );

        const fulfilled = validations
          .filter((v): v is PromiseFulfilledResult<ValidationResult> => v.status === 'fulfilled')
          .map(v => v.value);

        const verifiedCompanies = new Set(fulfilled.filter(v => v.status === 'verified').map(v => v.regNumber));
        const uncertainCompanies = new Set(fulfilled.filter(v => v.status === 'uncertain').map(v => v.regNumber));
        // Companies beyond the first 10 are also uncertain
        for (const regNumber of [...allMaskedCompanies].slice(10)) {
          uncertainCompanies.add(regNumber);
        }

        // Split masked-code matches into verified (keep) and uncertain (separate section)
        const keepMasked = (code: string | null, regNum: string) =>
          code !== maskedVersion || verifiedCompanies.has(regNum);
        const isUncertain = (code: string | null, regNum: string) =>
          code === maskedVersion && uncertainCompanies.has(regNum);

        uncertainOwnerships = ownerships.filter(o => isUncertain(o.owner.personalCode, o.company.registrationNumber));
        uncertainBoardPositions = boardPositions.filter(b => isUncertain(b.personalCode, b.company.registrationNumber));
        uncertainBeneficialOwnerships = beneficialOwnerships.filter(bo => isUncertain(bo.personalCode, bo.company.registrationNumber));

        // Remove rejected + uncertain from main results (uncertain goes to separate section)
        ownerships = ownerships.filter(o => keepMasked(o.owner.personalCode, o.company.registrationNumber));
        boardPositions = boardPositions.filter(b => keepMasked(b.personalCode, b.company.registrationNumber));
        beneficialOwnerships = beneficialOwnerships.filter(bo => keepMasked(bo.personalCode, bo.company.registrationNumber));

        // Fire-and-forget: upgrade verified masked codes to full codes in DB
        if (verifiedCompanies.size > 0) {
          upgradeVerifiedMaskedCodes(maskedVersion, cleanCode, nameVariants || [], verifiedCompanies).catch(() => {});
        }
      }
    }

    // Deduplicate by company
    const allOwnerships = deduplicateByCompany(ownerships, o => o.company.registrationNumber);
    const allBoardPositions = deduplicateByCompany(boardPositions, b => b.company.registrationNumber);
    const allBeneficialOwnerships = deduplicateByCompany(beneficialOwnerships, bo => bo.company.registrationNumber);

    // Build possible connections from uncertain matches
    const possibleCompanyMap = new Map<string, { registrationNumber: string; name: string; status: string; legalForm: string | null; roles: string[] }>();
    for (const o of uncertainOwnerships) {
      const key = o.company.registrationNumber;
      if (!possibleCompanyMap.has(key)) possibleCompanyMap.set(key, { registrationNumber: key, name: o.company.name, status: o.company.status, legalForm: o.company.legalForm, roles: [] });
      const entry = possibleCompanyMap.get(key)!;
      if (!entry.roles.includes('owner')) entry.roles.push('owner');
    }
    for (const b of uncertainBoardPositions) {
      const key = b.company.registrationNumber;
      if (!possibleCompanyMap.has(key)) possibleCompanyMap.set(key, { registrationNumber: key, name: b.company.name, status: b.company.status, legalForm: b.company.legalForm, roles: [] });
      const entry = possibleCompanyMap.get(key)!;
      if (!entry.roles.includes('board')) entry.roles.push('board');
    }
    for (const bo of uncertainBeneficialOwnerships) {
      const key = bo.company.registrationNumber;
      if (!possibleCompanyMap.has(key)) possibleCompanyMap.set(key, { registrationNumber: key, name: bo.company.name, status: bo.company.status, legalForm: bo.company.legalForm, roles: [] });
      const entry = possibleCompanyMap.get(key)!;
      if (!entry.roles.includes('beneficial')) entry.roles.push('beneficial');
    }
    const possibleConnections = [...possibleCompanyMap.values()];

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
        possibleConnections,
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

async function upgradeVerifiedMaskedCodes(
  maskedCode: string,
  fullCode: string,
  nameVariants: string[],
  verifiedCompanies: Set<string>,
) {
  const verifiedRegNumbers = [...verifiedCompanies];
  const nameFilter = nameVariants.length > 0
    ? { nameNormalized: { in: nameVariants } }
    : {};

  await Promise.allSettled([
    prisma.owner.updateMany({
      where: {
        personalCode: maskedCode,
        ...nameFilter,
        companies: { some: { company: { registrationNumber: { in: verifiedRegNumbers } } } },
      },
      data: { personalCode: fullCode },
    }),
    prisma.boardMember.updateMany({
      where: {
        personalCode: maskedCode,
        ...nameFilter,
        company: { registrationNumber: { in: verifiedRegNumbers } },
      },
      data: { personalCode: fullCode },
    }),
    prisma.beneficialOwner.updateMany({
      where: {
        personalCode: maskedCode,
        ...nameFilter,
        company: { registrationNumber: { in: verifiedRegNumbers } },
      },
      data: { personalCode: fullCode },
    }),
  ]);
}
