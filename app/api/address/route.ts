import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { captureException } from '@/lib/sentry';
import { prisma } from '@/lib/prisma';
import { normalizeAddress } from '@/lib/text-utils';

const MAX_RESULTS = 100;

export async function GET(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(`address:${identifier}`, 30, 60000);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetIn / 1000).toString() } }
    );
  }

  try {
    const query = request.nextUrl.searchParams.get('q');
    if (!query || query.trim().length < 3) {
      return NextResponse.json({ error: 'Address query too short' }, { status: 400 });
    }

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10));
    const limit = Math.min(MAX_RESULTS, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const normalizedQuery = normalizeAddress(query);

    const [companies, totalCount] = await Promise.all([
      prisma.company.findMany({
        where: { legalAddressNormalized: normalizedQuery },
        select: {
          registrationNumber: true,
          name: true,
          status: true,
          legalForm: true,
          legalAddress: true,
          registrationDate: true,
          latitude: true,
          longitude: true,
        },
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      prisma.company.count({
        where: { legalAddressNormalized: normalizedQuery },
      }),
    ]);

    return NextResponse.json({
      address: query.trim(),
      companies,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    captureException(error, { endpoint: 'address-detail' });
    return NextResponse.json({ error: 'Failed to fetch address data' }, { status: 500 });
  }
}
