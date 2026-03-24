import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFinancialData } from '@/lib/data-gov/client';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { comparisonSchema } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { captureException } from '@/lib/sentry';
import { httpClient } from '@/lib/business-register/client/http';
import { formatCompanyDisplayName } from '@/lib/text-utils';

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
    const years = Math.min(Math.max(1, parseInt(body.years, 10) || 5), 20); // 1-20 years, default 5
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years;

    // Detect if IDs are registration numbers (all digits) or internal IDs (cuid)
    const isRegNumbers = companyIds.every((id) => /^\d+$/.test(id));

    // Fetch all companies with their financial data
    const companies = await prisma.company.findMany({
      where: isRegNumbers
        ? { registrationNumber: { in: companyIds } }
        : { id: { in: companyIds } },
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
      },
    });

    // Check if all companies were found
    if (companies.length !== companyIds.length) {
      const foundIds = companies.map((c) => isRegNumbers ? c.registrationNumber : c.id);
      const missingIds = companyIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        {
          error: 'Some companies were not found.',
          missingIds,
        },
        { status: 404 }
      );
    }

    // Fetch tax, VAT, financial data, and BR data all in parallel
    const regNumbers = companies.map((c) => c.registrationNumber);
    const vatNumbers = companies.map((c) => `LV${c.registrationNumber}`);

    const [taxPayments, vatPayers, financialDataResults, brResults] = await Promise.all([
      prisma.taxPayment.findMany({
        where: { registrationNumber: { in: regNumbers }, year: { gte: startYear } },
        orderBy: { year: 'desc' },
      }),
      prisma.vatPayer.findMany({
        where: { vatNumber: { in: vatNumbers } },
      }),
      Promise.allSettled(
        companies.map((c) => getFinancialData(c.registrationNumber))
      ),
      Promise.allSettled(
        companies.map(async (c) => {
          const data = await httpClient.getLegalEntity(c.registrationNumber);
          const equity = (data as any)?.commercialEntityDetails?.equityCapitals?.find(
            (ec: any) => ec.type === 'PAID_UP_EQUITY'
          );
          return {
            regNr: c.registrationNumber,
            shareCapital: equity?.amount ?? null,
            shareCapitalDate: equity?.registeredOn ?? null,
          };
        })
      ),
    ]);

    // Group tax payments by registration number
    const taxPaymentsByRegNr = new Map<string, typeof taxPayments>();
    for (const tp of taxPayments) {
      const list = taxPaymentsByRegNr.get(tp.registrationNumber) || [];
      list.push(tp);
      taxPaymentsByRegNr.set(tp.registrationNumber, list);
    }

    const vatPayerByRegNr = new Map<string, typeof vatPayers[number]>();
    for (const vp of vatPayers) {
      vatPayerByRegNr.set(vp.vatNumber.slice(2), vp);
    }

    const financialDataByRegNr = new Map<string, Awaited<ReturnType<typeof getFinancialData>>>();
    companies.forEach((c, i) => {
      const result = financialDataResults[i];
      financialDataByRegNr.set(
        c.registrationNumber,
        result.status === 'fulfilled' ? result.value : []
      );
    });

    // Map BR API results
    const brDataByRegNr = new Map<string, { shareCapital: number | null; shareCapitalDate: string | null }>();
    for (const result of brResults) {
      if (result.status === 'fulfilled' && result.value) {
        brDataByRegNr.set(result.value.regNr, result.value);
      }
    }

    // Return companies in the same order as requested, with tax payments and financial data attached
    const orderedCompanies = companyIds.map((id) => {
      const company = companies.find((c) => isRegNumbers ? c.registrationNumber === id : c.id === id);
      if (!company) return null;
      const brData = brDataByRegNr.get(company.registrationNumber);
      return {
        ...company,
        name: formatCompanyDisplayName(company.name),
        shareCapital: company.shareCapital ?? brData?.shareCapital ?? null,
        shareCapitalRegisteredDate: company.shareCapitalRegisteredDate ?? brData?.shareCapitalDate ?? null,
        taxPayments: taxPaymentsByRegNr.get(company.registrationNumber) || [],
        financialRatios: financialDataByRegNr.get(company.registrationNumber) || [],
        vatPayer: vatPayerByRegNr.get(company.registrationNumber) || null,
      };
    });

    // Convert BigInt fields to Number for JSON serialization
    const serializable = JSON.parse(JSON.stringify(orderedCompanies, (_, v) =>
      typeof v === 'bigint' ? Number(v) : v
    ));

    return NextResponse.json({ companies: serializable });
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
