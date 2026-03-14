import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { validateSearchQuery } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { captureException } from '@/lib/sentry';
import { httpClient } from '@/lib/business-register/client/http';

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

    const searchResults = await httpClient.searchCompanies(searchTerm);

    const results = searchResults
      .filter(r => r.status === 'REGISTERED')
      .slice(0, APP_CONFIG.search.maxResults)
      .map((item) => ({
        id: item.registrationNumber,
        name: item.currentName,
        registrationNumber: item.registrationNumber,
        taxNumber: '',
      }));

    return NextResponse.json({ results });
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
