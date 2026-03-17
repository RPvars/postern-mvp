import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { companyIdSchema } from '@/lib/validations/search';
import { APP_CONFIG } from '@/lib/config';
import { env } from '@/lib/env';
import { captureException } from '@/lib/sentry';
import { httpClient } from '@/lib/business-register/client/http';
import { boardMemberMapper, memberMapper, beneficialOwnerMapper } from '@/lib/business-register/mappers/company';

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

    // getLegalEntity will hit in-memory cache from the /basic endpoint
    const legalEntity = await httpClient.getLegalEntity(id);

    // Resolve legal entity names for members/officers missing legalName
    const MAX_NAME_LOOKUPS = 10;
    const unresolvedRegNrs = new Set<string>();
    for (const m of legalEntity.members || []) {
      if (m.legalEntity?.registrationNumber && !m.legalEntity.legalName) {
        unresolvedRegNrs.add(m.legalEntity.registrationNumber);
      }
    }
    for (const o of legalEntity.officers || []) {
      if (o.legalEntity?.registrationNumber && !o.legalEntity.legalName) {
        unresolvedRegNrs.add(o.legalEntity.registrationNumber);
      }
    }

    // Build name resolution map without mutating cached objects
    const nameMap = new Map<string, string>();
    if (unresolvedRegNrs.size > 0) {
      const results = await Promise.allSettled(
        [...unresolvedRegNrs].slice(0, MAX_NAME_LOOKUPS).map(async (regNr) => {
          const entity = await httpClient.getLegalEntity(regNr);
          return { regNr, name: entity.legalName?.trim() || '' };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.name) nameMap.set(r.value.regNr, r.value.name);
      }
    }

    // Apply name resolution during mapping (no mutation of cached legalEntity)
    return NextResponse.json({
      owners: (legalEntity.members || [])
        .filter(m => !m.isAnnulled)
        .map(m => {
          if (m.legalEntity?.registrationNumber && !m.legalEntity.legalName && nameMap.has(m.legalEntity.registrationNumber)) {
            return memberMapper.fromMember({ ...m, legalEntity: { ...m.legalEntity, legalName: nameMap.get(m.legalEntity.registrationNumber) } });
          }
          return memberMapper.fromMember(m);
        }),
      boardMembers: (legalEntity.officers || [])
        .filter(o => !o.isAnnulled)
        .map(o => {
          if (o.legalEntity?.registrationNumber && !o.legalEntity.legalName && nameMap.has(o.legalEntity.registrationNumber)) {
            return boardMemberMapper.fromOfficer({ ...o, legalEntity: { ...o.legalEntity, legalName: nameMap.get(o.legalEntity.registrationNumber)! } }, id);
          }
          return boardMemberMapper.fromOfficer(o, id);
        }),
      beneficialOwners: (legalEntity.beneficialOwners || [])
        .filter(bo => !bo.isAnnulled)
        .map(bo => beneficialOwnerMapper.fromApiResponse(bo)),
    });
  } catch (error) {
    captureException(error, { endpoint: 'company-people' });

    if (env.NODE_ENV === 'development') {
      console.error('Company people fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to resolve company people data' },
      { status: 500 }
    );
  }
}
