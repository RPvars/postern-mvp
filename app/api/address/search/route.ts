import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { validateSearchQuery } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { captureException } from '@/lib/sentry';
import { prisma } from '@/lib/prisma';
import { normalizeAddress } from '@/lib/text-utils';

const MAX_RESULTS = 20;

export async function GET(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(
    `search:${identifier}`,
    APP_CONFIG.rateLimit.endpoints.search.maxRequests,
    APP_CONFIG.rateLimit.endpoints.search.windowMs
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetIn / 1000).toString() } }
    );
  }

  try {
    const query = request.nextUrl.searchParams.get('q');
    const validationResult = validateSearchQuery(query);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error, results: [] }, { status: 400 });
    }

    const searchTerm = validationResult.data;
    const normalizedTerm = normalizeAddress(searchTerm)
      .replace(/[%_]/g, '\\$&');  // Escape SQL LIKE metacharacters

    // Find unique addresses matching the search term, grouped with company count
    // Use raw query for GROUP BY which Prisma doesn't support well
    const results = await prisma.$queryRawUnsafe<
      { legalAddress: string; legalAddressNormalized: string; companyCount: number }[]
    >(
      `SELECT legalAddress, legalAddressNormalized, COUNT(*) as companyCount
       FROM Company
       WHERE legalAddressNormalized LIKE ? ESCAPE '\\'
       GROUP BY legalAddressNormalized
       ORDER BY COUNT(*) DESC
       LIMIT ?`,
      `%${normalizedTerm}%`,
      MAX_RESULTS
    );

    return NextResponse.json({
      results: results.map((r) => ({
        address: r.legalAddress,
        companyCount: Number(r.companyCount),
      })),
    });
  } catch (error) {
    captureException(error, { endpoint: 'address-search' });
    return NextResponse.json({ error: 'Failed to search addresses' }, { status: 500 });
  }
}
