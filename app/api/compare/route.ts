import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
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
    console.error('Comparison fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies for comparison' },
      { status: 500 }
    );
  }
}
