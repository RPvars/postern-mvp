import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { formatCompanyDisplayName } from '@/lib/text-utils';

// Cache for rank history queries (expensive: 3 extra queries per page)
const RANK_CACHE_TTL = 5 * 60 * 1000;
const rankCache = new Map<string, { data: Map<string, number>; expiry: number }>();

type Metric = 'revenue' | 'employees' | 'taxes' | 'profit';

/**
 * GET /api/industries/[code]?metric=revenue&limit=20&year=2024
 * Returns industry detail: breadcrumb, children, stats, and top companies.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const clientId = getClientIdentifier(request);
  const { success } = rateLimit(`industries:${clientId}`, 20, 60000);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { code } = await params;

  // Validate code against strict NACE pattern to prevent SQL injection
  if (!/^[A-U]$|^\d{2}(\.\d{1,2})?$/.test(code)) {
    return NextResponse.json({ error: 'Invalid industry code' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const VALID_METRICS: Metric[] = ['revenue', 'employees', 'taxes', 'profit'];
  const metric = VALID_METRICS.includes(searchParams.get('metric') as Metric)
    ? (searchParams.get('metric') as Metric)
    : 'profit';
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20), 100);
  const requestedYear = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : null;

  const industry = await prisma.naceCode.findUnique({ where: { code } });
  if (!industry) {
    return NextResponse.json({ error: 'Industry not found' }, { status: 404 });
  }

  const breadcrumb = await buildBreadcrumb(code);

  const children = await prisma.naceCode.findMany({
    where: { parentCode: code },
    orderBy: { code: 'asc' },
    select: { code: true, nameLv: true, nameEn: true, level: true },
  });

  const availableYears = await getAvailableYears();
  const year = requestedYear && availableYears.includes(requestedYear)
    ? requestedYear
    : availableYears[0] ?? new Date().getFullYear() - 1;

  const prefixes = await getNacePrefixes(code, industry.level);

  const [stats, childCountMap, topCompaniesRaw] = await Promise.all([
    getStats(prefixes, year),
    getChildrenCounts(children, year),
    getTopCompanies(prefixes, year, metric, limit),
  ]);
  const childrenWithCounts = children.map((child) => ({
    ...child,
    companyCount: childCountMap.get(child.code) ?? 0,
  }));

  // Add rank history (previous 3 years)
  const topCompanies = await addRankHistory(topCompaniesRaw, prefixes, year, metric);

  return NextResponse.json({
    industry: {
      code: industry.code,
      nameLv: industry.nameLv,
      nameEn: industry.nameEn,
      level: industry.level,
      parentCode: industry.parentCode,
    },
    breadcrumb,
    children: childrenWithCounts,
    stats,
    topCompanies,
    year,
    availableYears,
  });
}

async function buildBreadcrumb(code: string) {
  const crumbs: { code: string; nameLv: string; nameEn: string }[] = [];
  let current = code;

  while (current) {
    const nace = await prisma.naceCode.findUnique({
      where: { code: current },
      select: { code: true, nameLv: true, nameEn: true, parentCode: true },
    });
    if (!nace) break;
    crumbs.unshift({ code: nace.code, nameLv: nace.nameLv, nameEn: nace.nameEn });
    current = nace.parentCode ?? '';
  }

  return crumbs;
}

async function getAvailableYears(): Promise<number[]> {
  const years = await prisma.taxPayment.findMany({
    select: { year: true },
    distinct: ['year'],
    orderBy: { year: 'desc' },
  });
  return years.map((y) => y.year);
}

async function getNacePrefixes(code: string, level: number): Promise<string[]> {
  if (level === 1) {
    const divisions = await prisma.naceCode.findMany({
      where: { parentCode: code, level: 2 },
      select: { code: true },
    });
    return divisions.map((d) => d.code);
  }
  return [code.replace('.', '')];
}

/**
 * Build SQL LIKE clause for NACE prefix matching.
 * SAFETY: Prefixes are strictly validated as 1-2 digit numbers before interpolation.
 * Using $queryRawUnsafe because Prisma.sql doesn't support dynamic LIKE OR chains with aliases.
 */
function buildNaceLikeClause(prefixes: string[], alias = 'tp'): string {
  const safe = prefixes.filter((p) => /^\d{1,2}$/.test(p));
  if (safe.length === 0) return '1=0';
  return safe.map((p) => `${alias}.naceCode LIKE '${p}%'`).join(' OR ');
}

/**
 * Batch count companies for all children in ONE query using SUBSTR grouping.
 * Replaces N+1 pattern (one query per child).
 */
async function getChildrenCounts(
  children: { code: string; level: number }[],
  year: number
): Promise<Map<string, number>> {
  if (children.length === 0) return new Map();

  // For divisions (level 2), group by first 2 digits of naceCode
  // For groups (level 3), group by first 3 digits (without dot)
  const prefixLen = children[0].level === 2 ? 2 : children[0].level === 3 ? 3 : 4;

  // Build one LIKE clause covering all children
  const allPrefixes: string[] = [];
  for (const child of children) {
    const p = child.code.replace('.', '');
    if (/^\d{1,4}$/.test(p)) allPrefixes.push(p);
  }
  if (allPrefixes.length === 0) return new Map();

  const naceFilter = allPrefixes.map((p) => `tp.naceCode LIKE '${p}%'`).join(' OR ');

  const rows = await prisma.$queryRawUnsafe<{ prefix: string; cnt: number }[]>(`
    SELECT SUBSTR(tp.naceCode, 1, ${prefixLen}) as prefix, COUNT(tp.registrationNumber) as cnt
    FROM TaxPayment tp
    WHERE tp.year = ${year} AND (${naceFilter})
    GROUP BY SUBSTR(tp.naceCode, 1, ${prefixLen})
  `);

  const countMap = new Map<string, number>();
  for (const row of rows) {
    // Map prefix back to child code (e.g. "41" → "41", "411" → "41.1")
    for (const child of children) {
      const childPrefix = child.code.replace('.', '');
      if (row.prefix === childPrefix || row.prefix.startsWith(childPrefix)) {
        countMap.set(child.code, (countMap.get(child.code) ?? 0) + Number(row.cnt));
      }
    }
  }

  return countMap;
}

async function getCompanyCount(prefixes: string[], year: number): Promise<number> {
  if (prefixes.length === 0) return 0;
  const naceFilter = buildNaceLikeClause(prefixes);
  const result = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
    `SELECT COUNT(registrationNumber) as cnt FROM TaxPayment tp WHERE tp.year = ${year} AND (${naceFilter})`
  );
  return Number(result[0]?.cnt ?? 0);
}

async function getStats(prefixes: string[], year: number) {
  if (prefixes.length === 0) {
    return { totalCompanies: 0, totalRevenue: 0, totalEmployees: 0, totalTaxes: 0, avgRevenue: 0 };
  }

  const naceFilter = buildNaceLikeClause(prefixes);

  const taxStats = await prisma.$queryRawUnsafe<
    { totalCompanies: number; totalEmployees: number; totalTaxes: number }[]
  >(`
    SELECT COUNT(DISTINCT registrationNumber) as totalCompanies,
           COALESCE(SUM(employeeCount), 0) as totalEmployees,
           COALESCE(SUM(amount), 0) as totalTaxes
    FROM TaxPayment tp
    WHERE tp.year = ${year} AND (${naceFilter})
  `);

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

  const totalCompanies = Number(taxStats[0]?.totalCompanies ?? 0);
  const totalRevenue = Number(revenueStats[0]?.totalRevenue ?? 0);

  return {
    totalCompanies,
    totalRevenue: Math.round(totalRevenue),
    totalEmployees: Number(taxStats[0]?.totalEmployees ?? 0),
    totalTaxes: Math.round(Number(taxStats[0]?.totalTaxes ?? 0)),
    avgRevenue: totalCompanies > 0 ? Math.round(totalRevenue / totalCompanies) : 0,
  };
}

interface RawTopCompany {
  registrationNumber: string;
  name: string | null;
  legalAddress: string | null;
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  fdEmployees: number | null;
  taxAmount: number | null;
  tpEmployees: number | null;
  naceCode: string | null;
}

async function getTopCompanies(
  prefixes: string[],
  year: number,
  metric: Metric,
  limit: number
) {
  if (prefixes.length === 0) return [];

  const naceFilter = buildNaceLikeClause(prefixes);

  if (metric === 'revenue' || metric === 'profit') {
    const orderCol = metric === 'revenue' ? 'fd.revenue' : 'fd.netIncome';

    const rows = await prisma.$queryRawUnsafe<RawTopCompany[]>(`
      SELECT fd.registrationNumber, fd.revenue, fd.netIncome, fd.totalAssets,
             fd.employees as fdEmployees,
             c.name, c.legalAddress,
             tp.naceCode, tp.amount as taxAmount, tp.employeeCount as tpEmployees
      FROM FinancialData fd
      LEFT JOIN Company c ON c.registrationNumber = fd.registrationNumber
      LEFT JOIN TaxPayment tp ON tp.registrationNumber = fd.registrationNumber AND tp.year = fd.year
      WHERE fd.year = ${year}
        AND ${orderCol} IS NOT NULL
        AND fd.registrationNumber IN (
          SELECT DISTINCT tp2.registrationNumber FROM TaxPayment tp2
          WHERE tp2.year = ${year} AND (${buildNaceLikeClause(prefixes, 'tp2')})
        )
      ORDER BY ${orderCol} DESC
      LIMIT ${limit}
    `);

    return rows.map(formatRow);
  }

  // Taxes or employees — query from TaxPayment, join FinancialData
  const orderCol = metric === 'taxes' ? 'tp.amount' : 'tp.employeeCount';

  const rows = await prisma.$queryRawUnsafe<RawTopCompany[]>(`
    SELECT tp.registrationNumber, tp.amount as taxAmount, tp.employeeCount as tpEmployees,
           tp.naceCode,
           c.name, c.legalAddress,
           fd.revenue, fd.netIncome, fd.totalAssets, fd.employees as fdEmployees
    FROM TaxPayment tp
    LEFT JOIN Company c ON c.registrationNumber = tp.registrationNumber
    LEFT JOIN FinancialData fd ON fd.registrationNumber = tp.registrationNumber AND fd.year = tp.year
    WHERE tp.year = ${year}
      AND ${orderCol} IS NOT NULL
      AND (${naceFilter})
    ORDER BY ${orderCol} DESC
    LIMIT ${limit}
  `);

  return rows.map(formatRow);
}

function formatRow(r: RawTopCompany) {
  const naceFormatted = r.naceCode ? formatNaceCode(r.naceCode) : null;
  return {
    registrationNumber: r.registrationNumber,
    name: formatCompanyDisplayName(r.name ?? r.registrationNumber),
    legalAddress: r.legalAddress ?? '',
    revenue: r.revenue,
    netIncome: r.netIncome,
    totalAssets: r.totalAssets,
    employees: r.fdEmployees ?? r.tpEmployees ?? null,
    taxAmount: r.taxAmount,
    naceCode: naceFormatted,
    naceDescription: null, // Skip NACE description lookup for performance
  };
}

/**
 * For each top company, find their rank in previous years (up to 3 years back).
 * Fetches top 50 per previous year to find rank positions.
 */
async function addRankHistory(
  companies: ReturnType<typeof formatRow>[],
  prefixes: string[],
  currentYear: number,
  metric: Metric
) {
  if (companies.length === 0) return companies;

  const regNums = new Set(companies.map(c => c.registrationNumber));
  const historyYears = [currentYear - 1, currentYear - 2, currentYear - 3];

  // Fetch top 50 for each previous year (cached)
  const yearRanks = await Promise.all(
    historyYears.map(async (y) => {
      const cacheKey = `${prefixes.join(',')}_${y}_${metric}`;
      const cached = rankCache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        return { year: y, ranks: cached.data };
      }

      const prevTop = await getTopCompanies(prefixes, y, metric, 50);
      const rankMap = new Map<string, number>();
      prevTop.forEach((c, i) => rankMap.set(c.registrationNumber, i + 1));

      rankCache.set(cacheKey, { data: rankMap, expiry: Date.now() + RANK_CACHE_TTL });
      if (rankCache.size > 100) {
        const oldest = rankCache.keys().next().value;
        if (oldest) rankCache.delete(oldest);
      }

      return { year: y, ranks: rankMap };
    })
  );

  return companies.map((company, currentRank) => {
    const rankHistory: Record<number, number | null> = {};
    rankHistory[currentYear] = currentRank + 1;

    for (const { year: y, ranks } of yearRanks) {
      rankHistory[y] = ranks.get(company.registrationNumber) ?? null;
    }

    const prevRank = rankHistory[currentYear - 1];
    const rankChange = prevRank != null ? prevRank - (currentRank + 1) : null;

    return { ...company, rankHistory, rankChange };
  });
}

function formatNaceCode(code: string): string {
  if (code.includes('.')) return code;
  return code.slice(0, 2) + '.' + code.slice(2);
}
