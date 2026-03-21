import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine, normalizeName } from '@/lib/import-utils';

const CSV_URL = 'https://dati.ur.gov.lv/officers/officers.csv';
const BATCH_SIZE = 500;

type OfficerRecord = {
  externalId: number;
  companyRegcode: string;
  name: string;
  maskedCode: string | null;
  birthDate: string | null;
  position: string | null;
  governingBody: string | null;
  representationType: string | null;
  representationWithAtLeast: string | null;
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

async function importOfficers(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: OfficerRecord[] = [];
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

    const companyRegcode = getField(fields, 'at_legal_entity_registration_number');
    if (!companyRegcode) { skipped++; continue; }

    const name = getField(fields, 'name');
    if (!name) { skipped++; continue; }

    const maskedCode = getField(fields, 'latvian_identity_number_masked') || null;
    const birthDate = getField(fields, 'birth_date') || null;
    const position = getField(fields, 'position') || null;
    const governingBody = getField(fields, 'governing_body') || null;
    const representationType = getField(fields, 'rights_of_representation_type') || null;
    const representationWithAtLeast = getField(fields, 'representation_with_at_least') || null;

    total++;
    batch.push({
      externalId,
      companyRegcode,
      name,
      maskedCode,
      birthDate,
      position,
      governingBody,
      representationType,
      representationWithAtLeast,
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

async function processBatch(records: OfficerRecord[]): Promise<number> {
  // Group by company for efficiency
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

    const representationRights = r.representationType
      ? r.representationWithAtLeast
        ? `${r.representationType} (${r.representationWithAtLeast})`
        : r.representationType
      : null;

    upserts.push(
      prisma.boardMember.upsert({
        where: { externalId: r.externalId },
        update: {
          companyId,
          name: r.name,
          nameNormalized: normalizeName(r.name),
          personalCode: r.maskedCode,
          birthDate: r.birthDate,
          institution: r.governingBody,
          position: r.position,
          representationRights: representationRights,
          isHistorical: false,
        },
        create: {
          externalId: r.externalId,
          companyId,
          name: r.name,
          nameNormalized: normalizeName(r.name),
          personalCode: r.maskedCode,
          birthDate: r.birthDate,
          institution: r.governingBody,
          position: r.position,
          representationRights: representationRights,
          isHistorical: false,
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
  console.log('=== Officers (Board Members) Import ===\n');

  console.log('Downloading officers data...');
  const csvPath = await downloadCSV(CSV_URL, 'officers.csv');
  console.log(`Downloaded to ${csvPath}\n`);

  await importOfficers(csvPath);

  const count = await prisma.boardMember.count();
  console.log(`\nDatabase summary: ${count} total board member records`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
