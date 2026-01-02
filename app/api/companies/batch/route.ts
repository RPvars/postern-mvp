import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Rate limiting: 20 requests per minute per IP
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(`batch:${identifier}`, 20, 60000);

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

    // Validate UUID format for all IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = ids.filter(id => !uuidRegex.test(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid company ID format', invalidIds },
        { status: 400 }
      );
    }

    // Limit to 10 companies max for safety
    const limitedIds = ids.slice(0, 10);

    const companies = await prisma.company.findMany({
      where: {
        id: {
          in: limitedIds,
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
    if (process.env.NODE_ENV === 'development') {
      console.error('Batch fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
