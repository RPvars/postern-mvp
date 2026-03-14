import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { companyIdsSchema } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { httpClient } from '@/lib/business-register/client/http';

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

    const companies = await Promise.all(
      validatedIds.map(async (regcode) => {
        try {
          const entity = await httpClient.getLegalEntity(regcode);
          return {
            id: entity.registrationNumber,
            name: entity.legalName,
            registrationNumber: entity.registrationNumber,
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      companies: companies.filter(Boolean),
    });
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      console.error('Batch fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
