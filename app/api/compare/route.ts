import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limiting: 15 requests per minute per IP
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(`compare:${identifier}`, 15, 60000);

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
    const body = await request.json();
    const { companyIds } = body;

    // Validate companyIds
    if (!companyIds || !Array.isArray(companyIds)) {
      return NextResponse.json(
        { error: 'Invalid request. companyIds must be an array.' },
        { status: 400 }
      );
    }

    if (companyIds.length < 2 || companyIds.length > 5) {
      return NextResponse.json(
        { error: 'You must select between 2 and 5 companies to compare.' },
        { status: 400 }
      );
    }

    // Validate UUID format for all IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = companyIds.filter((id: string) => !uuidRegex.test(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid company ID format', invalidIds },
        { status: 400 }
      );
    }

    // Fetch all companies with their financial data
    const companies = await prisma.company.findMany({
      where: {
        id: {
          in: companyIds,
        },
      },
      include: {
        owners: {
          include: {
            owner: true,
          },
          where: {
            isHistorical: false,
          },
          orderBy: {
            sharePercentage: 'desc',
          },
        },
        boardMembers: {
          where: {
            isHistorical: false,
          },
          orderBy: {
            appointedDate: 'desc',
          },
        },
        beneficialOwners: {
          orderBy: {
            dateFrom: 'desc',
          },
        },
        taxPayments: {
          orderBy: {
            year: 'desc',
          },
        },
        financialRatios: {
          orderBy: {
            year: 'desc',
          },
        },
      },
    });

    // Check if all companies were found
    if (companies.length !== companyIds.length) {
      const foundIds = companies.map((c) => c.id);
      const missingIds = companyIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        {
          error: 'Some companies were not found.',
          missingIds,
        },
        { status: 404 }
      );
    }

    // Return companies in the same order as requested
    const orderedCompanies = companyIds.map((id) =>
      companies.find((c) => c.id === id)
    );

    return NextResponse.json({ companies: orderedCompanies });
  } catch (error) {
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Comparison fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch companies for comparison' },
      { status: 500 }
    );
  }
}
