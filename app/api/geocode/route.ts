import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { captureException } from '@/lib/sentry';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const geocodeBodySchema = z.object({
  registrationNumbers: z.array(z.string().regex(/^\d{9,11}$/)).min(1).max(10),
});

// Nominatim requires max 1 req/sec and a valid User-Agent
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'PosternsMVP/1.0 (business-intelligence-platform)';

function cleanAddress(address: string): string {
  return address
    .replace(/[""\u201C\u201D]/g, '') // Remove quotes
    .replace(/\s*nov\.\s*/gi, ' ') // Remove "nov."
    .replace(/\s*pag\.\s*/gi, ' ') // Remove "pag."
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLocality(address: string): string | null {
  // Extract the first meaningful part (city/town name)
  const parts = address.split(',').map(p => p.trim());
  // Try the first part that looks like a place name (not a house name)
  for (const part of parts) {
    const cleaned = part.replace(/[""\u201C\u201D]/g, '').trim();
    if (cleaned && !cleaned.match(/^[\d\-\/]+$/) && cleaned.length > 2) {
      return cleaned;
    }
  }
  return null;
}

async function nominatimSearch(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&countrycodes=lv&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // Try 1: Clean address
  const cleaned = cleanAddress(address);
  const result = await nominatimSearch(cleaned);
  if (result) return result;

  // Try 2: Just the locality/municipality name
  const locality = extractLocality(address);
  if (locality && locality !== cleaned) {
    await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit
    const localityResult = await nominatimSearch(locality + ', Latvia');
    if (localityResult) return localityResult;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(`geocode:${identifier}`, 10, 60000);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = geocodeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const regNumbers = parsed.data.registrationNumbers;

    // Fetch companies with addresses
    const companies = await prisma.company.findMany({
      where: { registrationNumber: { in: regNumbers } },
      select: { registrationNumber: true, legalAddress: true, latitude: true, longitude: true },
    });

    const results: Record<string, { lat: number; lng: number } | null> = {};
    const toGeocode: { registrationNumber: string; address: string }[] = [];

    for (const c of companies) {
      if (c.latitude && c.longitude) {
        results[c.registrationNumber] = { lat: c.latitude, lng: c.longitude };
      } else if (c.legalAddress) {
        toGeocode.push({ registrationNumber: c.registrationNumber, address: c.legalAddress });
      }
    }

    // Geocode missing addresses sequentially (Nominatim rate limit: 1/sec)
    for (let i = 0; i < toGeocode.length; i++) {
      const item = toGeocode[i];
      const coords = await geocodeAddress(item.address);
      results[item.registrationNumber] = coords;

      if (coords) {
        await prisma.company.update({
          where: { registrationNumber: item.registrationNumber },
          data: { latitude: coords.lat, longitude: coords.lng },
        }).catch(() => {});
      }

      if (i < toGeocode.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }

    return NextResponse.json({ coordinates: results });
  } catch (error) {
    captureException(error, { endpoint: 'geocode' });
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
