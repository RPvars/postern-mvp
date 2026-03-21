import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine } from '@/lib/import-utils';

const CSV_URL = 'https://dati.ur.gov.lv/stockholders/stockholders.csv';
const BATCH_SIZE = 500;

type StockholderRecord = {
  companyRegcode: string;
  name: string;
  maskedCode: string | null;
  birthDate: string | null;
  legalEntityRegcode: string | null;
  numberOfShares: number | null;
  shareNominalValue: number | null;
  votes: number | null;
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

async function importStockholders(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: StockholderRecord[] = [];
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

    const maskedCode = getField(fields, 'latvian_identity_number_masked') || null;
    const birthDate = getField(fields, 'birth_date') || null;
    const legalEntityRegcode = getField(fields, 'legal_entity_registration_number') || null;
    const sharesStr = getField(fields, 'number_of_shares');
    const nominalStr = getField(fields, 'share_nominal_value');
    const votesStr = getField(fields, 'votes');
    const dateFrom = getField(fields, 'date_from') || null;

    total++;
    batch.push({
      companyRegcode,
      name,
      maskedCode,
      birthDate,
      legalEntityRegcode,
      numberOfShares: sharesStr ? parseFloat(sharesStr) : null,
      shareNominalValue: nominalStr ? parseFloat(nominalStr) : null,
      votes: votesStr ? parseFloat(votesStr) : null,
      dateFrom,
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await processBatch(batch);
      batch = [];
      if (total % 10000 === 0) console.log(`  ... ${total} processed`);
    }
  }

  if (batch.length > 0) imported += await processBatch(batch);
  console.log(`  ${total} records processed, ${imported} upserted, ${skipped} skipped`);
  return imported;
}

async function processBatch(records: StockholderRecord[]): Promise<number> {
  let processed = 0;

  for (const r of records) {
    try {
      const company = await prisma.company.findUnique({
        where: { registrationNumber: r.companyRegcode },
        select: { id: true },
      });
      if (!company) continue;

      const personalCode = r.maskedCode || r.legalEntityRegcode || null;
      const isMaskedCode = personalCode?.includes('*') ?? false;

      // Masked codes are NOT unique — match by code AND name to avoid cross-person collisions
      let owner: { id: string; name: string; personalCode: string | null; birthDate: string | null } | null = null;

      if (personalCode && !isMaskedCode) {
        owner = await prisma.owner.findFirst({ where: { personalCode } });
      } else if (personalCode && isMaskedCode) {
        owner = await prisma.owner.findFirst({ where: { personalCode, name: r.name } });
      } else {
        owner = await prisma.owner.findFirst({ where: { name: r.name, personalCode: null } });
      }

      if (owner) {
        await prisma.owner.update({
          where: { id: owner.id },
          data: {
            name: r.name,
            birthDate: r.birthDate || owner.birthDate,
          },
        });
      } else {
        owner = await prisma.owner.create({
          data: {
            name: r.name,
            personalCode,
            birthDate: r.birthDate || null,
          },
        });
      }

      const shares = r.numberOfShares;
      const nominal = r.shareNominalValue;
      const totalValue = shares && nominal ? shares * nominal : null;

      await prisma.ownership.upsert({
        where: { companyId_ownerId: { companyId: company.id, ownerId: owner.id } },
        update: {
          sharePercentage: 0,
          sharesCount: shares ? BigInt(Math.round(shares)) : null,
          nominalValue: nominal,
          totalValue,
          votingRights: r.votes,
          memberSince: r.dateFrom ? new Date(r.dateFrom) : null,
          isHistorical: false,
        },
        create: {
          companyId: company.id,
          ownerId: owner.id,
          sharePercentage: 0,
          sharesCount: shares ? BigInt(Math.round(shares)) : null,
          nominalValue: nominal,
          totalValue,
          votingRights: r.votes,
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
  console.log('=== Stockholders Import ===\n');

  console.log('Downloading stockholders data...');
  const csvPath = await downloadCSV(CSV_URL, 'stockholders.csv');
  console.log(`Downloaded to ${csvPath}\n`);

  await importStockholders(csvPath);

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
