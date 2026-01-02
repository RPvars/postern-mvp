import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { validateSearchQuery } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { captureException } from '@/lib/sentry';

// Normalize string by removing Latvian diacritics for better search matching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[āĀ]/g, 'a')
    .replace(/[čČ]/g, 'c')
    .replace(/[ēĒ]/g, 'e')
    .replace(/[ģĢ]/g, 'g')
    .replace(/[īĪ]/g, 'i')
    .replace(/[ķĶ]/g, 'k')
    .replace(/[ļĻ]/g, 'l')
    .replace(/[ņŅ]/g, 'n')
    .replace(/[šŠ]/g, 's')
    .replace(/[ūŪ]/g, 'u')
    .replace(/[žŽ]/g, 'z');
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(
    `search:${identifier}`,
    APP_CONFIG.rateLimit.endpoints.search.maxRequests,
    APP_CONFIG.rateLimit.endpoints.search.windowMs
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
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    // Validate and sanitize search query
    const validationResult = validateSearchQuery(query);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error, results: [] }, { status: 400 });
    }

    const searchTerm = validationResult.data;
    const searchTermNormalized = normalizeString(searchTerm);

    // Use normalized fields for fast database-level filtering
    // First, get matching company IDs without the heavy owner JOIN
    const matchingCompanies = await prisma.company.findMany({
      where: {
        OR: [
          {
            nameNormalized: {
              contains: searchTermNormalized,
            },
          },
          {
            registrationNumberNormalized: {
              contains: searchTermNormalized,
            },
          },
          {
            taxNumberNormalized: {
              contains: searchTermNormalized,
            },
          },
        ],
      },
      select: {
        id: true,
      },
      take: APP_CONFIG.search.maxResults, // Only fetch what we need
    });

    // Now fetch full data with owners only for matching companies
    const companies = await prisma.company.findMany({
      where: {
        id: {
          in: matchingCompanies.map(c => c.id),
        },
      },
      include: {
        owners: {
          include: {
            owner: true,
          },
        },
      },
    });

    const filteredCompanies = companies;

    const results = filteredCompanies.map((company) => ({
      id: company.id,
      name: company.name,
      registrationNumber: company.registrationNumber,
      taxNumber: company.taxNumber,
      owners: company.owners.map((o) => ({
        name: o.owner.name,
        share: o.sharePercentage,
      })),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    // Capture error with Sentry
    captureException(error, { endpoint: 'search' });

    // Log error in development only
    if (env.NODE_ENV === 'development') {
      console.error('Search error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}
