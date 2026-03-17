import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { companyIdSchema } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { captureException } from '@/lib/sentry';
import { httpClient } from '@/lib/business-register/client/http';
import { annualReportMapper } from '@/lib/business-register/mappers/company';
import { getFinancialData } from '@/lib/data-gov/client';
import type { AnnualReportItem } from '@/lib/business-register/types/api-responses';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(
    `company:${identifier}`,
    APP_CONFIG.rateLimit.endpoints.companyDetail.maxRequests,
    APP_CONFIG.rateLimit.endpoints.companyDetail.windowMs
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetIn / 1000).toString() } }
    );
  }

  try {
    const { id } = await params;

    const validationResult = companyIdSchema.safeParse(id);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    const [financialData, annualReportItems] = await Promise.all([
      getFinancialData(id).catch(() => []),
      httpClient.getAnnualReports(id).catch(() => []),
    ]);

    // Deduplicate annual reports by year+type, keeping best format (PDF > HTML > DUF)
    const FORMAT_PRIORITY: Record<string, number> = { PDF: 0, HTML: 1, DUF: 2 };
    const mapped = (annualReportItems as AnnualReportItem[])
      .filter((item) => !item.isAnnulled)
      .map((item) => annualReportMapper.fromApiResponse(item));
    const best = new Map<string, typeof mapped[number]>();
    for (const r of mapped) {
      const key = `${r.year}-${r.type}`;
      const existing = best.get(key);
      if (!existing) {
        best.set(key, r);
      } else {
        const existingPrio = FORMAT_PRIORITY[existing.fileExtension || ''] ?? 99;
        const newPrio = FORMAT_PRIORITY[r.fileExtension || ''] ?? 99;
        if (newPrio < existingPrio) {
          best.set(key, r);
        }
      }
    }
    const annualReports = [...best.values()].sort((a, b) => b.year - a.year);

    return NextResponse.json({
      financialRatios: financialData,
      annualReports,
    });
  } catch (error) {
    captureException(error, { endpoint: 'company-external' });

    if (env.NODE_ENV === 'development') {
      console.error('Company external fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch external company data' },
      { status: 500 }
    );
  }
}
