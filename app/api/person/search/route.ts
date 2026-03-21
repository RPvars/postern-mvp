import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { validateSearchQuery } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { captureException } from '@/lib/sentry';
import { prisma } from '@/lib/prisma';

const MAX_RESULTS = 20;

function abbreviateLegalForm(name: string): string {
  return name
    .replace(/^Sabiedrība ar ierobežotu atbildību\s*/i, 'SIA ')
    .replace(/^Akciju sabiedrība\s*/i, 'AS ')
    .replace(/^Individuālais komersants\s*/i, 'IK ')
    .replace(/^Zemnieku saimniecība\s*/i, 'ZS ')
    .replace(/^Kooperatīvā sabiedrība\s*/i, 'KS ');
}

export async function GET(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(
    `search:${identifier}`,
    APP_CONFIG.rateLimit.endpoints.search.maxRequests,
    APP_CONFIG.rateLimit.endpoints.search.windowMs
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetIn / 1000).toString() } }
    );
  }

  try {
    const query = request.nextUrl.searchParams.get('q');
    const validationResult = validateSearchQuery(query);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error, results: [] }, { status: 400 });
    }

    const searchTerm = validationResult.data;

    // If query has multiple words, also search with reversed order
    // DB stores "Uzvārds Vārds" but user may type "Vārds Uzvārds"
    const words = searchTerm.trim().split(/\s+/);
    const reversedTerm = words.length >= 2 ? words.reverse().join(' ') : null;

    // Build name filter: match original OR reversed word order
    const nameFilter = reversedTerm
      ? { OR: [{ name: { contains: searchTerm } }, { name: { contains: reversedTerm } }] }
      : { name: { contains: searchTerm } };

    // Search across all 3 person tables in parallel
    const [boardMembers, beneficialOwners, owners] = await Promise.all([
      prisma.boardMember.findMany({
        where: { ...nameFilter, isHistorical: false },
        include: { company: { select: { registrationNumber: true, name: true } } },
        take: MAX_RESULTS,
        orderBy: { name: 'asc' },
      }),
      prisma.beneficialOwner.findMany({
        where: nameFilter,
        include: { company: { select: { registrationNumber: true, name: true } } },
        take: MAX_RESULTS,
        orderBy: { name: 'asc' },
      }),
      // Only search natural persons in Owner table (personalCode contains dash = person format)
      prisma.owner.findMany({
        where: {
          ...nameFilter,
          personalCode: { contains: '-' },
        },
        include: {
          companies: {
            where: { isHistorical: false },
            include: { company: { select: { registrationNumber: true, name: true } } },
            take: 5,
          },
        },
        take: MAX_RESULTS,
        orderBy: { name: 'asc' },
      }),
    ]);

    // Aggregate into unique persons by name+personalCode
    const personMap = new Map<string, {
      name: string;
      personalCode: string | null;
      birthDate: string | null;
      roles: string[];
      companies: { registrationNumber: string; name: string }[];
    }>();

    // Dedup by normalized name — "Maksims Tišins" and "Tišins Maksims" are the same person
    // Sort words alphabetically so word order doesn't matter
    const getKey = (name: string) => name.trim().split(/\s+/).sort().join(' ').toLowerCase();

    for (const bm of boardMembers) {
      const key = getKey(bm.name);
      const existing = personMap.get(key);
      if (existing) {
        if (!existing.roles.includes('board')) existing.roles.push('board');
        // Prefer full code over masked
        if (bm.personalCode && !bm.personalCode.includes('*')) existing.personalCode = bm.personalCode;
        if (!existing.companies.find(c => c.registrationNumber === bm.company.registrationNumber)) {
          existing.companies.push(bm.company);
        }
      } else {
        personMap.set(key, {
          name: bm.name,
          personalCode: bm.personalCode,
          birthDate: bm.birthDate || null,
          roles: ['board'],
          companies: [bm.company],
        });
      }
    }

    for (const bo of beneficialOwners) {
      const key = getKey(bo.name);
      const existing = personMap.get(key);
      if (existing) {
        if (!existing.roles.includes('beneficial')) existing.roles.push('beneficial');
        if (bo.personalCode && !bo.personalCode.includes('*')) existing.personalCode = bo.personalCode;
        if (!existing.companies.find(c => c.registrationNumber === bo.company.registrationNumber)) {
          existing.companies.push(bo.company);
        }
      } else {
        personMap.set(key, {
          name: bo.name,
          personalCode: bo.personalCode,
          birthDate: bo.birthDate ? bo.birthDate.toISOString().split('T')[0] : null,
          roles: ['beneficial'],
          companies: [bo.company],
        });
      }
    }

    for (const owner of owners) {
      const key = getKey(owner.name);
      const existing = personMap.get(key);
      const ownerCompanies = owner.companies.map(oc => oc.company);
      if (existing) {
        if (!existing.roles.includes('owner')) existing.roles.push('owner');
        if (owner.personalCode && !owner.personalCode.includes('*')) existing.personalCode = owner.personalCode;
        for (const c of ownerCompanies) {
          if (!existing.companies.find(ec => ec.registrationNumber === c.registrationNumber)) {
            existing.companies.push(c);
          }
        }
      } else {
        personMap.set(key, {
          name: owner.name,
          personalCode: owner.personalCode,
          birthDate: owner.birthDate || null,
          roles: ['owner'],
          companies: ownerCompanies,
        });
      }
    }

    // Convert to array, sort by relevance (more companies = more relevant), limit results
    const results = Array.from(personMap.values())
      .sort((a, b) => b.companies.length - a.companies.length || a.name.localeCompare(b.name, 'lv'))
      .slice(0, MAX_RESULTS)
      .map(p => ({
        name: p.name,
        personalCode: p.personalCode,
        roles: p.roles,
        companyCount: p.companies.length,
        companies: p.companies.slice(0, 3).map(c => ({ ...c, name: abbreviateLegalForm(c.name) })),
      }));

    return NextResponse.json({ results });
  } catch (error) {
    captureException(error, { endpoint: 'person-search' });
    return NextResponse.json({ error: 'Failed to search persons' }, { status: 500 });
  }
}
