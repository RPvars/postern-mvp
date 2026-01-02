import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
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
    console.error('Batch fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
