import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine } from '@/lib/import-utils';

const CSV_URL = 'https://dati.ur.gov.lv/register/register.csv';
const BATCH_SIZE = 500;

type RegisterRecord = {
  registrationNumber: string;
  name: string;
  legalAddress: string;
  registrationDate: Date;
  status: string;
  legalForm: string | null;
  registryName: string | null;
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

async function importRegister(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: RegisterRecord[] = [];
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
    const regcode = getField(fields, 'regcode');
    if (!regcode || regcode.length < 5) { skipped++; continue; }

    const name = getField(fields, 'name');
    if (!name) { skipped++; continue; }

    const registeredStr = getField(fields, 'registered');
    const registrationDate = registeredStr ? new Date(registeredStr) : null;
    if (!registrationDate || isNaN(registrationDate.getTime())) { skipped++; continue; }

    const terminated = getField(fields, 'terminated');
    const closed = getField(fields, 'closed');
    let status = 'REGISTERED';
    if (closed) status = 'CLOSED';
    else if (terminated) status = 'TERMINATED';

    const address = getField(fields, 'address') || '';
    const typeText = getField(fields, 'type_text') || getField(fields, 'type');
    const regtypeText = getField(fields, 'regtype_text') || getField(fields, 'regtype');

    total++;
    batch.push({
      registrationNumber: regcode,
      name,
      legalAddress: address,
      registrationDate,
      status,
      legalForm: typeText || null,
      registryName: regtypeText || null,
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await upsertBatch(batch);
      batch = [];
      if (total % 50000 === 0) console.log(`  ... ${total} processed`);
    }
  }

  if (batch.length > 0) imported += await upsertBatch(batch);
  console.log(`  ${total} records processed, ${imported} upserted, ${skipped} skipped`);
  return imported;
}

async function upsertBatch(records: RegisterRecord[]): Promise<number> {
  await prisma.$transaction(
    records.map((r) =>
      prisma.company.upsert({
        where: { registrationNumber: r.registrationNumber },
        update: {
          name: r.name,
          legalAddress: r.legalAddress,
          status: r.status,
          legalForm: r.legalForm,
          registryName: r.registryName,
        },
        create: {
          registrationNumber: r.registrationNumber,
          name: r.name,
          nameNormalized: r.name.toLowerCase(),
          taxNumber: r.registrationNumber,
          taxNumberNormalized: r.registrationNumber,
          registrationNumberNormalized: r.registrationNumber,
          legalAddress: r.legalAddress,
          registrationDate: r.registrationDate,
          status: r.status,
          legalForm: r.legalForm,
          registryName: r.registryName,
        },
      })
    )
  );
  return records.length;
}

async function main() {
  console.log('=== Company Register Import ===\n');

  console.log('Downloading register data...');
  const csvPath = await downloadCSV(CSV_URL, 'register.csv');
  console.log(`Downloaded to ${csvPath}\n`);

  await importRegister(csvPath);

  const count = await prisma.company.count();
  console.log(`\nDatabase summary: ${count} total company records`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
