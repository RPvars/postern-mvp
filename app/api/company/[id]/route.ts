import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    console.error('Company fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company details' },
      { status: 500 }
    );
  }
}
