import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { comparisonSchema } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { captureException } from '@/lib/sentry';

export async function POST(request: NextRequest) {
  // Rate limiting
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(
    `compare:${identifier}`,
    APP_CONFIG.rateLimit.endpoints.compare.maxRequests,
    APP_CONFIG.rateLimit.endpoints.compare.windowMs
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
    const body = await request.json();

    // Validate request body with schema
    const validationResult = comparisonSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Invalid request data' },
        { status: 400 }
      );
    }

    const { companyIds } = validationResult.data;

    // Parse query parameters for historical data pagination
    const years = body.years || 5; // Default to last 5 years
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years;

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
          where: {
            year: {
              gte: startYear,
            },
          },
          orderBy: {
            year: 'desc',
          },
          take: 10, // Max 10 records
        },
        financialRatios: {
          where: {
            year: {
              gte: startYear,
            },
          },
          orderBy: {
            year: 'desc',
          },
          take: 10, // Max 10 records
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
    // Capture error with Sentry
    captureException(error, { endpoint: 'compare' });

    // Log error in development only
    if (env.NODE_ENV === 'development') {
      console.error('Comparison fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch companies for comparison' },
      { status: 500 }
    );
  }
}
