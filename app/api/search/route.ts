import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

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
  // Rate limiting: 20 requests per minute per IP
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(`search:${identifier}`, 20, 60000);

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

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = query.trim();
    const searchTermNormalized = normalizeString(searchTerm);

    // Use database-level filtering for better performance
    // Note: SQLite doesn't support case-insensitive search with mode parameter
    // We fetch a limited set matching basic criteria, then apply normalization
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchTerm,
            },
          },
          {
            registrationNumber: {
              contains: searchTerm,
            },
          },
          {
            taxNumber: {
              contains: searchTerm,
            },
          },
        ],
      },
      include: {
        owners: {
          include: {
            owner: true,
          },
        },
      },
      take: 50, // Limit to 50 companies for diacritic normalization filtering
    });

    // Apply diacritic normalization filtering on the limited result set
    const filteredCompanies = companies
      .filter(company =>
        normalizeString(company.name).includes(searchTermNormalized) ||
        normalizeString(company.registrationNumber).includes(searchTermNormalized) ||
        normalizeString(company.taxNumber).includes(searchTermNormalized) ||
        company.owners.some(o => normalizeString(o.owner.name).includes(searchTermNormalized))
      )
      .slice(0, 10); // Limit to 10 results

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
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Search error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}
