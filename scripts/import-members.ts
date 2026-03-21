import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine, normalizeName } from '@/lib/import-utils';

const CSV_URL = 'https://dati.ur.gov.lv/members/members.csv';
const BATCH_SIZE = 500;

type MemberRecord = {
  companyRegcode: string;
  entityType: string;
  name: string;
  maskedCode: string | null;
  birthDate: string | null;
  legalEntityRegcode: string | null;
  numberOfShares: number | null;
  shareNominalValue: number | null;
  shareCurrency: string | null;
  dateFrom: string | null;
};

let headerMap: Record<string, number> = {};

function parseHeader(line: string): void {
  const fields = parseCSVLine(line, ';');
  fields.forEach((f, i) => {
    headerMap[f.trim().toLowerCase()] = i;
  });
}

function getField(fields: string[], name: string): string {
  const idx = headerMap[name];
  return idx !== undefined && idx < fields.length ? fields[idx].trim() : '';
}

async function importMembers(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: MemberRecord[] = [];
  let total = 0;
  let imported = 0;
  let skipped = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (isHeader) {
      parseHeader(line);
      isHeader = false;
      continue;
    }

    const fields = parseCSVLine(line, ';');
    const companyRegcode = getField(fields, 'at_legal_entity_registration_number');
    if (!companyRegcode) { skipped++; continue; }

    const name = getField(fields, 'name');
    if (!name) { skipped++; continue; }

    const entityType = getField(fields, 'entity_type');
    const maskedCode = getField(fields, 'latvian_identity_number_masked') || null;
    const birthDateStr = getField(fields, 'birth_date') || null;
    const legalEntityRegcode = getField(fields, 'legal_entity_registration_number') || null;
    const sharesStr = getField(fields, 'number_of_shares');
    const nominalStr = getField(fields, 'share_nominal_value');
    const currency = getField(fields, 'share_currency') || null;
    const dateFrom = getField(fields, 'date_from') || null;

    total++;
    batch.push({
      companyRegcode,
      entityType,
      name,
      maskedCode,
      birthDate: birthDateStr,
      legalEntityRegcode,
      numberOfShares: sharesStr ? parseFloat(sharesStr) : null,
      shareNominalValue: nominalStr ? parseFloat(nominalStr) : null,
      shareCurrency: currency,
      dateFrom,
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await processBatch(batch);
      batch = [];
      if (total % 50000 === 0) console.log(`  ... ${total} processed`);
    }
  }

  if (batch.length > 0) imported += await processBatch(batch);
  console.log(`  ${total} records processed, ${imported} upserted, ${skipped} skipped`);
  return imported;
}

async function processBatch(records: MemberRecord[]): Promise<number> {
  // Batch lookup: companies
  const regcodes = [...new Set(records.map(r => r.companyRegcode))];
  const companies = await prisma.company.findMany({
    where: { registrationNumber: { in: regcodes } },
    select: { id: true, registrationNumber: true },
  });
  const companyMap = new Map(companies.map(c => [c.registrationNumber, c.id]));

  // Batch lookup: owners by personalCode
  const allCodes = records.map(r => r.maskedCode || r.legalEntityRegcode).filter((c): c is string => !!c);
  const uniqueCodes = [...new Set(allCodes)];
  const existingOwners = uniqueCodes.length > 0
    ? await prisma.owner.findMany({ where: { personalCode: { in: uniqueCodes } } })
    : [];
  // Key: "personalCode" for full codes, "personalCode::name" for masked codes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerByCode = new Map<string, any>();
  for (const o of existingOwners) {
    if (o.personalCode) {
      ownerByCode.set(o.personalCode, o);
      // Also index by code+name for masked code lookups
      ownerByCode.set(`${o.personalCode}::${o.name}`, o);
    }
  }

  let processed = 0;

  for (const r of records) {
    try {
      const companyId = companyMap.get(r.companyRegcode);
      if (!companyId) continue;

      const personalCode = r.maskedCode || r.legalEntityRegcode || null;
      const isMaskedCode = personalCode?.includes('*') ?? false;

      // Find owner from pre-fetched map
      let owner: { id: string; personalCode: string | null; birthDate: string | null } | null = null;

      if (personalCode && !isMaskedCode) {
        owner = ownerByCode.get(personalCode) ?? null;
      } else if (personalCode && isMaskedCode) {
        owner = ownerByCode.get(`${personalCode}::${r.name}`) ?? null;
      }

      if (owner) {
        await prisma.owner.update({
          where: { id: owner.id },
          data: { name: r.name, nameNormalized: normalizeName(r.name), birthDate: r.birthDate || owner.birthDate },
        });
      } else {
        owner = await prisma.owner.create({
          data: { name: r.name, nameNormalized: normalizeName(r.name), personalCode, birthDate: r.birthDate || null },
        });
        // Add to map for dedup within same batch
        if (personalCode) {
          ownerByCode.set(isMaskedCode ? `${personalCode}::${r.name}` : personalCode, owner);
        }
      }

      const shares = r.numberOfShares;
      const nominal = r.shareNominalValue;
      const totalValue = shares && nominal ? shares * nominal : null;

      await prisma.ownership.upsert({
        where: { companyId_ownerId: { companyId, ownerId: owner.id } },
        update: {
          sharePercentage: 0,
          sharesCount: shares ? BigInt(Math.round(shares)) : null,
          nominalValue: nominal,
          totalValue,
          memberSince: r.dateFrom ? new Date(r.dateFrom) : null,
          isHistorical: false,
        },
        create: {
          companyId,
          ownerId: owner.id,
          sharePercentage: 0,
          sharesCount: shares ? BigInt(Math.round(shares)) : null,
          nominalValue: nominal,
          totalValue,
          memberSince: r.dateFrom ? new Date(r.dateFrom) : null,
          isHistorical: false,
        },
      });

      processed++;
    } catch {
      continue;
    }
  }

  return processed;
}

async function main() {
  console.log('=== Members (Owners) Import ===\n');

  console.log('Downloading members data...');
  const csvPath = await downloadCSV(CSV_URL, 'members.csv');
  console.log(`Downloaded to ${csvPath}\n`);

  await importMembers(csvPath);

  const [ownerCount, ownershipCount] = await Promise.all([
    prisma.owner.count(),
    prisma.ownership.count(),
  ]);
  console.log(`\nDatabase summary: ${ownerCount} owners, ${ownershipCount} ownership records`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
