import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = query.trim();

    // For SQLite, fetch all companies and filter in memory for case-insensitive search
    const searchTermNormalized = normalizeString(searchTerm);

    const allCompanies = await prisma.company.findMany({
      include: {
        owners: {
          include: {
            owner: true,
          },
        },
      },
    });

    console.log('Total companies fetched:', allCompanies.length);
    console.log('Search term normalized:', searchTermNormalized);

    // Manual case-insensitive filtering with diacritic normalization for SQLite
    const filteredCompanies = allCompanies
      .filter(company =>
        normalizeString(company.name).includes(searchTermNormalized) ||
        normalizeString(company.registrationNumber).includes(searchTermNormalized) ||
        normalizeString(company.taxNumber).includes(searchTermNormalized) ||
        company.owners.some(o => normalizeString(o.owner.name).includes(searchTermNormalized))
      )
      .slice(0, 10); // Limit to 10 results

    console.log('Filtered companies:', filteredCompanies.length);

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
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}
