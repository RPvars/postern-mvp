import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { companyIdsSchema } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  // Rate limiting
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(
    `batch:${identifier}`,
    APP_CONFIG.rateLimit.endpoints.batch.maxRequests,
    APP_CONFIG.rateLimit.endpoints.batch.windowMs
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
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ companies: [] });
    }

    const ids = idsParam.split(',').filter(id => id.trim().length > 0);

    if (ids.length === 0) {
      return NextResponse.json({ companies: [] });
    }

    // Validate company IDs with schema
    const validationResult = companyIdsSchema.safeParse(ids);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Invalid company IDs' },
        { status: 400 }
      );
    }

    const validatedIds = validationResult.data;

    const companies = await prisma.company.findMany({
      where: {
        id: {
          in: validatedIds,
        },
      },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
      },
    });

    return NextResponse.json({ companies });
  } catch (error) {
    // Log error in development only
    if (env.NODE_ENV === 'development') {
      console.error('Batch fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
