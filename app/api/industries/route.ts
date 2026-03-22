import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

// In-memory cache for industry listings (expensive ~63 queries per request)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const responseCache = new Map<string, { data: unknown; expiry: number }>();

/**
 * GET /api/industries?parent=F
 * Lists NACE sections (no parent) or children of a given code.
 * Returns company counts and aggregate stats per category.
 */
export async function GET(request: Request) {
  const clientId = getClientIdentifier(request);
  const { success } = rateLimit(`industries:${clientId}`, 20, 60000);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parent = searchParams.get('parent');

  // Validate parent param against NACE code pattern
  if (parent && !/^[A-U]$|^\d{2}(\.\d{1,2})?$/.test(parent)) {
    return NextResponse.json({ error: 'Invalid parent code' }, { status: 400 });
  }

  // Check cache
  const cacheKey = `industries:${parent || 'root'}`;
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json(cached.data);
  }

  // Get NACE codes — either sections (level 1) or children of parent
  const codes = await prisma.naceCode.findMany({
    where: parent ? { parentCode: parent } : { level: 1 },
    orderBy: { code: 'asc' },
  });

  if (codes.length === 0) {
    return NextResponse.json([]);
  }

  // For each code, count companies using TaxPayment NACE data (latest year)
  const latestYear = await getLatestTaxYear();
  const results = await Promise.all(
    codes.map(async (nace) => {
      const prefixes = await getNacePrefixes(nace.code, nace.level);
      const stats = await getIndustryStats(prefixes, latestYear);
      return {
        code: nace.code,
        nameLv: nace.nameLv,
        nameEn: nace.nameEn,
        level: nace.level,
        companyCount: stats.companyCount,
        totalRevenue: stats.totalRevenue,
        totalEmployees: stats.totalEmployees,
      };
    })
  );

  // Cache result
  responseCache.set(cacheKey, { data: results, expiry: Date.now() + CACHE_TTL });
  // Evict old entries
  if (responseCache.size > 50) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }

  return NextResponse.json(results);
}

async function getLatestTaxYear(): Promise<number> {
  const result = await prisma.taxPayment.findFirst({
    orderBy: { year: 'desc' },
    select: { year: true },
  });
  return result?.year ?? new Date().getFullYear() - 1;
}

/**
 * Get raw NACE code prefixes (without dots) for matching TaxPayment.naceCode.
 * Sections (A-U) expand to their division codes; others use direct prefix.
 */
async function getNacePrefixes(code: string, level: number): Promise<string[]> {
  if (level === 1) {
    // Section → find all division children
    const divisions = await prisma.naceCode.findMany({
      where: { parentCode: code, level: 2 },
      select: { code: true },
    });
    return divisions.map((d) => d.code); // "41", "42", "43"
  }
  // Division/Group/Class — use direct prefix (remove dots for TaxPayment match)
  return [code.replace('.', '')];
}

function buildNaceLikeClause(prefixes: string[]): string {
  return prefixes
    .filter((p) => /^\d{1,2}$/.test(p)) // Only allow 1-2 digit numeric prefixes
    .map((p) => `tp.naceCode LIKE '${p}%'`)
    .join(' OR ') || '1=0';
}

async function getIndustryStats(prefixes: string[], year: number) {
  if (prefixes.length === 0) {
    return { companyCount: 0, totalRevenue: 0, totalEmployees: 0 };
  }

  const naceFilter = buildNaceLikeClause(prefixes);

  // Single raw query for tax stats
  const taxStats = await prisma.$queryRawUnsafe<
    { companyCount: number; totalEmployees: number }[]
  >(`
    SELECT COUNT(registrationNumber) as companyCount,
           COALESCE(SUM(employeeCount), 0) as totalEmployees
    FROM TaxPayment tp
    WHERE tp.year = ${year} AND (${naceFilter})
  `);

  // Subquery for revenue — avoids SQLite parameter limit
  const revenueStats = await prisma.$queryRawUnsafe<{ totalRevenue: number }[]>(`
    SELECT COALESCE(SUM(fd.revenue), 0) as totalRevenue
    FROM FinancialData fd
    WHERE fd.year = ${year}
      AND fd.revenue IS NOT NULL
      AND fd.registrationNumber IN (
        SELECT DISTINCT tp.registrationNumber FROM TaxPayment tp
        WHERE tp.year = ${year} AND (${naceFilter})
      )
  `);

  return {
    companyCount: Number(taxStats[0]?.companyCount ?? 0),
    totalRevenue: Math.round(Number(revenueStats[0]?.totalRevenue ?? 0)),
    totalEmployees: Number(taxStats[0]?.totalEmployees ?? 0),
  };
}
