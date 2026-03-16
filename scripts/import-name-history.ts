import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine } from '@/lib/import-utils';

const CSV_URL = 'https://dati.ur.gov.lv/register/register_name_history.csv';
const BATCH_SIZE = 1000;

type NameHistoryRecord = {
  registrationNumber: string;
  name: string;
  dateTo: Date;
};

async function importNameHistory(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: NameHistoryRecord[] = [];
  let total = 0;
  let imported = 0;
  let skipped = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (isHeader) { isHeader = false; continue; }

    const fields = parseCSVLine(line, ';');
    if (fields.length < 3) continue;

    const regcode = fields[0].trim();
    if (!regcode) { skipped++; continue; }

    const dateStr = fields[1].trim();
    const dateTo = dateStr ? new Date(dateStr) : null;
    if (!dateTo || isNaN(dateTo.getTime())) { skipped++; continue; }

    const name = fields[2].trim();
    if (!name) { skipped++; continue; }

    total++;
    batch.push({ registrationNumber: regcode, name, dateTo });

    if (batch.length >= BATCH_SIZE) {
      imported += await upsertBatch(batch);
      batch = [];
      if (total % 10000 === 0) console.log(`  ... ${total} processed`);
    }
  }

  if (batch.length > 0) imported += await upsertBatch(batch);
  console.log(`  ${total} records processed, ${imported} upserted, ${skipped} skipped`);
  return imported;
}

async function upsertBatch(records: NameHistoryRecord[]): Promise<number> {
  await prisma.$transaction(
    records.map((r) =>
      prisma.companyNameHistory.upsert({
        where: {
          registrationNumber_name_dateTo: {
            registrationNumber: r.registrationNumber,
            name: r.name,
            dateTo: r.dateTo,
          },
        },
        update: {},
        create: r,
      })
    )
  );
  return records.length;
}

async function main() {
  console.log('=== Company Name History Import ===\n');

  console.log('Downloading name history data...');
  const csvPath = await downloadCSV(CSV_URL, 'register_name_history.csv');
  console.log(`Downloaded to ${csvPath}\n`);

  await importNameHistory(csvPath);

  const count = await prisma.companyNameHistory.count();
  console.log(`\nDatabase summary: ${count} total name history records`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
