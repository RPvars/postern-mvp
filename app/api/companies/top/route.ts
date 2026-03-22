import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { formatCompanyDisplayName } from '@/lib/text-utils';

type Metric = 'revenue' | 'profit';

const CACHE_TTL = 5 * 60 * 1000;
const responseCache = new Map<string, { data: unknown; expiry: number }>();

export async function GET(request: Request) {
  const clientId = getClientIdentifier(request);
  const { success } = rateLimit(`companies-top:${clientId}`, 20, 60000);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100);
  const metric: Metric = searchParams.get('metric') === 'profit' ? 'profit' : 'revenue';

  const cacheKey = `top:${limit}:${metric}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    // Find latest year with substantial data (50K+ records)
    const yearResult = await prisma.$queryRawUnsafe<{ year: number }[]>(
      `SELECT year FROM FinancialData
       WHERE revenue IS NOT NULL AND revenue > 0
       GROUP BY year HAVING COUNT(*) >= 50000
       ORDER BY year DESC LIMIT 1`
    );
    const year = Number(yearResult[0]?.year);
    if (!year) {
      return NextResponse.json({ companies: [], year: null });
    }

    const companies = await getTopCompanies(year, limit, metric);
    const companiesWithHistory = await addRankHistory(companies, year, Math.max(limit, 50), metric);

    const result = { companies: companiesWithHistory, year };
    responseCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });

    // Evict old cache entries
    if (responseCache.size > 10) {
      const oldest = [...responseCache.entries()].sort((a, b) => a[1].expiry - b[1].expiry)[0];
      if (oldest) responseCache.delete(oldest[0]);
    }

    return NextResponse.json(result);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch top companies:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getTopCompanies(year: number, limit: number, metric: Metric) {
  const orderCol = metric === 'profit' ? 'fd.netIncome' : 'fd.revenue';
  const whereCol = metric === 'profit' ? 'fd.netIncome' : 'fd.revenue';

  const rows = await prisma.$queryRawUnsafe<{
    registrationNumber: string;
    name: string | null;
    revenue: number | null;
    netIncome: number | null;
  }[]>(
    `SELECT fd.registrationNumber, c.name, fd.revenue, fd.netIncome
     FROM FinancialData fd
     LEFT JOIN Company c ON c.registrationNumber = fd.registrationNumber
     WHERE fd.year = ? AND ${whereCol} IS NOT NULL AND ${whereCol} > 0
     ORDER BY ${orderCol} DESC
     LIMIT ?`,
    year, limit
  );

  return rows.map((r, i) => ({
    rank: i + 1,
    registrationNumber: r.registrationNumber,
    name: r.name ? formatCompanyDisplayName(r.name) : r.registrationNumber,
    revenue: Number(r.revenue),
    netIncome: r.netIncome != null ? Number(r.netIncome) : null,
  }));
}

async function addRankHistory(
  companies: Awaited<ReturnType<typeof getTopCompanies>>,
  currentYear: number,
  historyLimit: number,
  metric: Metric
) {
  if (companies.length === 0) return companies;

  const historyYears = [currentYear - 1, currentYear - 2, currentYear - 3];

  const yearRanks = await Promise.all(
    historyYears.map(async (y) => {
      const prevTop = await getTopCompanies(y, historyLimit, metric);
      const rankMap = new Map<string, number>();
      prevTop.forEach((c) => rankMap.set(c.registrationNumber, c.rank));
      return { year: y, ranks: rankMap };
    })
  );

  return companies.map((company) => {
    const rankHistory: Record<number, number | null> = {};
    rankHistory[currentYear] = company.rank;

    for (const { year: y, ranks } of yearRanks) {
      rankHistory[y] = ranks.get(company.registrationNumber) ?? null;
    }

    const prevRank = rankHistory[currentYear - 1];
    const rankChange = prevRank != null ? prevRank - company.rank : null;

    return { ...company, rankHistory, rankChange };
  });
}
