import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { validateSearchQuery } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { captureException } from '@/lib/sentry';
import { httpClient } from '@/lib/business-register/client/http';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Rate limiting
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(
    `search:${identifier}`,
    APP_CONFIG.rateLimit.endpoints.search.maxRequests,
    APP_CONFIG.rateLimit.endpoints.search.windowMs
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
    const query = searchParams.get('q');

    // Validate and sanitize search query
    const validationResult = validateSearchQuery(query);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error, results: [] }, { status: 400 });
    }

    const searchTerm = validationResult.data;

    // If query is numeric, search by registration number
    const isNumericQuery = /^\d+$/.test(searchTerm) && searchTerm.length >= 2;

    if (isNumericQuery) {
      const results: { id: string; name: string; registrationNumber: string; taxNumber: string }[] = [];

      // Full 11-digit reg number → direct BR API lookup
      if (searchTerm.length === 11) {
        try {
          const entity = await httpClient.getLegalEntity(searchTerm);
          results.push({
            id: entity.registrationNumber || searchTerm,
            name: entity.legalName || searchTerm,
            registrationNumber: entity.registrationNumber || searchTerm,
            taxNumber: '',
          });
        } catch {
          // Not found, continue to local DB search
        }
      }

      // Partial or full → search local DB with startsWith
      if (results.length === 0) {
        const dbResults = await prisma.company.findMany({
          where: { registrationNumber: { startsWith: searchTerm } },
          take: APP_CONFIG.search.maxResults,
          select: { registrationNumber: true, name: true },
        });
        for (const c of dbResults) {
          results.push({
            id: c.registrationNumber,
            name: c.name,
            registrationNumber: c.registrationNumber,
            taxNumber: '',
          });
        }
      }

      if (results.length > 0) {
        return NextResponse.json({ results });
      }
      // Fall through to BR name search as last resort
    }

    // Search BR API and local DB in parallel
    const apiSearchTerm = searchTerm.replace(/\s+\S$/, '').trim() || searchTerm;
    const [brResults, dbResults] = await Promise.allSettled([
      httpClient.searchCompanies(apiSearchTerm),
      prisma.company.findMany({
        where: { name: { contains: searchTerm } },
        take: APP_CONFIG.search.maxResults,
        select: { registrationNumber: true, name: true },
      }),
    ]);

    // Merge: BR API results first (fresher data), then DB results for what BR API missed
    const seen = new Set<string>();
    const results: { id: string; name: string; registrationNumber: string; taxNumber: string }[] = [];

    if (brResults.status === 'fulfilled') {
      for (const item of brResults.value.filter(r => r.status === 'REGISTERED')) {
        if (!seen.has(item.registrationNumber)) {
          seen.add(item.registrationNumber);
          results.push({
            id: item.registrationNumber,
            name: item.currentName,
            registrationNumber: item.registrationNumber,
            taxNumber: '',
          });
        }
      }
    }

    if (dbResults.status === 'fulfilled') {
      for (const c of dbResults.value) {
        if (!seen.has(c.registrationNumber)) {
          seen.add(c.registrationNumber);
          results.push({
            id: c.registrationNumber,
            name: c.name,
            registrationNumber: c.registrationNumber,
            taxNumber: '',
          });
        }
      }
    }

    return NextResponse.json({ results: results.slice(0, APP_CONFIG.search.maxResults) });
  } catch (error) {
    captureException(error, { endpoint: 'search' });

    if (env.NODE_ENV === 'development') {
      console.error('Search error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}
