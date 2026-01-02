import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { companyIdSchema } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
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

    // Validate company ID format
    const validationResult = companyIdSchema.safeParse(id);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id },
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

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ company });
  } catch (error) {
    // Log error in development only
    if (env.NODE_ENV === 'development') {
      console.error('Company fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch company details' },
      { status: 500 }
    );
  }
}
