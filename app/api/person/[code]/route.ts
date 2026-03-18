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

    // Latvian personal code or company reg number: 11 digits (with optional dash)
    if (!code || !/^\d{6}-?\d{5}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid person code' }, { status: 400 });
    }

    // Search across all person tables by personalCode
    const [ownerships, boardPositions, beneficialOwnerships] = await Promise.all([
      prisma.ownership.findMany({
        where: { owner: { personalCode: code }, isHistorical: false },
        include: {
          owner: true,
          company: { select: { registrationNumber: true, name: true, status: true, legalForm: true } },
        },
        orderBy: { sharePercentage: 'desc' },
      }),
      prisma.boardMember.findMany({
        where: { personalCode: code, isHistorical: false },
        include: {
          company: { select: { registrationNumber: true, name: true, status: true, legalForm: true } },
        },
        orderBy: { appointedDate: 'desc' },
      }),
      prisma.beneficialOwner.findMany({
        where: { personalCode: code },
        include: {
          company: { select: { registrationNumber: true, name: true, status: true, legalForm: true } },
        },
        orderBy: { dateFrom: 'desc' },
      }),
    ]);

    // Determine person name from any available record
    const name = ownerships[0]?.owner?.name
      || boardPositions[0]?.name
      || beneficialOwnerships[0]?.name
      || null;

    if (!name && ownerships.length === 0 && boardPositions.length === 0 && beneficialOwnerships.length === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Extract personal details from beneficial ownership records (most detailed source)
    const boWithDetails = beneficialOwnerships.find(bo => bo.citizenship || bo.residenceCountry || bo.birthDate);

    return NextResponse.json({
      person: {
        name,
        personalCode: code,
        citizenship: boWithDetails?.citizenship || null,
        residenceCountry: boWithDetails?.residenceCountry || null,
        birthDate: boWithDetails?.birthDate || null,
        ownerships: ownerships.map(o => ({
          company: {
            registrationNumber: o.company.registrationNumber,
            name: o.company.name,
            status: o.company.status,
            legalForm: o.company.legalForm,
          },
          sharePercentage: o.sharePercentage,
          sharesCount: o.sharesCount,
          totalValue: o.totalValue,
          votingRights: o.votingRights,
          memberSince: o.memberSince,
        })),
        boardPositions: boardPositions.map(b => ({
          company: {
            registrationNumber: b.company.registrationNumber,
            name: b.company.name,
            status: b.company.status,
            legalForm: b.company.legalForm,
          },
          position: b.position,
          institution: b.institution,
          appointedDate: b.appointedDate,
          representationRights: b.representationRights,
        })),
        beneficialOwnerships: beneficialOwnerships.map(bo => ({
          company: {
            registrationNumber: bo.company.registrationNumber,
            name: bo.company.name,
            status: bo.company.status,
            legalForm: bo.company.legalForm,
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
