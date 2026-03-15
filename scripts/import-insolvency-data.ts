import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine } from '@/lib/import-utils';

const CSV_URL =
  'https://data.gov.lv/dati/dataset/bb54838d-9365-4f76-8513-804f4efa8ab6/resource/8065ad80-1a4d-4afb-b1d1-d93b9a62b1cc/download/insolvency_legal_person_proceeding.csv';

const BATCH_SIZE = 1000;

function parseDate(value: string): Date | null {
  if (!value || value.trim() === '') return null;
  const d = new Date(value.trim());
  return isNaN(d.getTime()) ? null : d;
}

async function importData(csvPath: string): Promise<void> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let headerMap: Map<string, number> = new Map();
  let batch: {
    registrationNumber: string;
    proceedingId: string;
    proceedingForm: string | null;
    proceedingType: string | null;
    status: string | null;
    dateFrom: Date | null;
    dateTo: Date | null;
    court: string | null;
  }[] = [];
  let total = 0;
  let imported = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');

    if (isHeader) {
      const headers = parseCSVLine(line, ';');
      headers.forEach((h, i) => headerMap.set(h, i));
      isHeader = false;
      continue;
    }

    const fields = parseCSVLine(line, ';');
    const regNr = fields[headerMap.get('debtor_registration_number') ?? 2];
    const proceedingId = fields[headerMap.get('proceeding_id') ?? 0];

    if (!regNr || !proceedingId) continue;

    total++;
    batch.push({
      registrationNumber: regNr,
      proceedingId,
      proceedingForm: fields[headerMap.get('proceeding_form') ?? 7] || null,
      proceedingType: fields[headerMap.get('proceeding_type') ?? 8] || null,
      status: fields[headerMap.get('proceeding_resolution_name') ?? 11] || null,
      dateFrom: parseDate(fields[headerMap.get('proceeding_started_on') ?? 5]),
      dateTo: parseDate(fields[headerMap.get('proceeding_ended_on') ?? 6]),
      court: fields[headerMap.get('court_name') ?? 15] || null,
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await upsertBatch(batch);
      if (imported % 10000 === 0) {
        console.log(`  Processed ${total} rows, imported ${imported}...`);
      }
      batch = [];
    }
  }

  if (batch.length > 0) {
    imported += await upsertBatch(batch);
  }

  console.log(`Done! Processed ${total} rows, imported ${imported} insolvency records.`);
}

async function upsertBatch(
  records: {
    registrationNumber: string;
    proceedingId: string;
    proceedingForm: string | null;
    proceedingType: string | null;
    status: string | null;
    dateFrom: Date | null;
    dateTo: Date | null;
    court: string | null;
  }[]
): Promise<number> {
  await prisma.$transaction(
    records.map((r) =>
      prisma.insolvencyProceeding.upsert({
        where: {
          registrationNumber_proceedingId: {
            registrationNumber: r.registrationNumber,
            proceedingId: r.proceedingId,
          },
        },
        update: {
          proceedingForm: r.proceedingForm,
          proceedingType: r.proceedingType,
          status: r.status,
          dateFrom: r.dateFrom,
          dateTo: r.dateTo,
          court: r.court,
        },
        create: r,
      })
    )
  );
  return records.length;
}

async function main() {
  console.log('=== Insolvency Proceedings Data Import ===\n');

  console.log('Downloading insolvency proceedings data...');
  const csvPath = await downloadCSV(CSV_URL, 'insolvency-proceedings.csv');
  console.log(`CSV saved to ${csvPath}\n`);

  console.log('Importing into database...');
  await importData(csvPath);

  const count = await prisma.insolvencyProceeding.count();
  const active = await prisma.insolvencyProceeding.count({
    where: { dateTo: null },
  });
  console.log(`\nDatabase summary: ${count} total records (${active} active/ongoing)`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
