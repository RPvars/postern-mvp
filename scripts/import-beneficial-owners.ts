import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine } from '@/lib/import-utils';

const CSV_URL = 'https://dati.ur.gov.lv/beneficial_owners/beneficial_owners.csv';
const BATCH_SIZE = 500;

type BeneficialOwnerRecord = {
  externalId: number;
  companyRegcode: string;
  name: string;
  maskedCode: string | null;
  birthDate: string | null;
  nationality: string | null;
  residence: string | null;
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

async function importBeneficialOwners(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: BeneficialOwnerRecord[] = [];
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
    const idStr = getField(fields, 'id');
    const externalId = parseInt(idStr, 10);
    if (isNaN(externalId)) { skipped++; continue; }

    const companyRegcode = getField(fields, 'legal_entity_registration_number');
    if (!companyRegcode) { skipped++; continue; }

    const forename = getField(fields, 'forename');
    const surname = getField(fields, 'surname');
    const name = `${forename} ${surname}`.trim();
    if (!name) { skipped++; continue; }

    const maskedCode = getField(fields, 'latvian_identity_number_masked') || null;
    const birthDate = getField(fields, 'birth_date') || null;
    const nationality = getField(fields, 'nationality') || null;
    const residence = getField(fields, 'residence') || null;

    total++;
    batch.push({
      externalId,
      companyRegcode,
      name,
      maskedCode,
      birthDate,
      nationality,
      residence,
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

async function processBatch(records: BeneficialOwnerRecord[]): Promise<number> {
  const companyRegcodes = [...new Set(records.map(r => r.companyRegcode))];
  const companies = await prisma.company.findMany({
    where: { registrationNumber: { in: companyRegcodes } },
    select: { id: true, registrationNumber: true },
  });
  const companyMap = new Map(companies.map(c => [c.registrationNumber, c.id]));

  const upserts = [];
  for (const r of records) {
    const companyId = companyMap.get(r.companyRegcode);
    if (!companyId) continue;

    const birthDateParsed = r.birthDate ? new Date(r.birthDate) : null;
    const validBirthDate = birthDateParsed && !isNaN(birthDateParsed.getTime()) ? birthDateParsed : null;

    upserts.push(
      prisma.beneficialOwner.upsert({
        where: { externalId: r.externalId },
        update: {
          companyId,
          name: r.name,
          personalCode: r.maskedCode,
          birthDate: validBirthDate,
          citizenship: r.nationality,
          residenceCountry: r.residence,
        },
        create: {
          externalId: r.externalId,
          companyId,
          name: r.name,
          personalCode: r.maskedCode,
          birthDate: validBirthDate,
          citizenship: r.nationality,
          residenceCountry: r.residence,
        },
      })
    );
  }

  if (upserts.length > 0) {
    await prisma.$transaction(upserts);
  }

  return upserts.length;
}

async function main() {
  console.log('=== Beneficial Owners Import ===\n');

  console.log('Downloading beneficial owners data...');
  const csvPath = await downloadCSV(CSV_URL, 'beneficial_owners.csv');
  console.log(`Downloaded to ${csvPath}\n`);

  await importBeneficialOwners(csvPath);

  const count = await prisma.beneficialOwner.count();
  console.log(`\nDatabase summary: ${count} total beneficial owner records`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
