import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine } from '@/lib/import-utils';

const CSV_URL = 'https://dati.ur.gov.lv/reorganizations/reorganizations.csv';
const BATCH_SIZE = 200;

type ReorganizationRecord = {
  externalId: number;
  reorganizationType: string;
  reorganizationTypeText: string;
  sourceEntityRegcode: string;
  finalEntityRegcode: string;
  registered: Date;
};

async function importReorganizations(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: ReorganizationRecord[] = [];
  let total = 0;
  let imported = 0;
  let skipped = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (isHeader) { isHeader = false; continue; }

    const fields = parseCSVLine(line, ';');
    if (fields.length < 6) continue;

    const externalId = parseInt(fields[0].trim(), 10);
    if (isNaN(externalId)) { skipped++; continue; }

    const reorganizationType = fields[1].trim();
    const reorganizationTypeText = fields[2].trim();
    const sourceEntityRegcode = fields[3].trim();
    const finalEntityRegcode = fields[4].trim();

    if (!reorganizationType || !sourceEntityRegcode || !finalEntityRegcode) {
      skipped++;
      continue;
    }

    const dateStr = fields[5].trim();
    const registered = dateStr ? new Date(dateStr) : null;
    if (!registered || isNaN(registered.getTime())) { skipped++; continue; }

    total++;
    batch.push({
      externalId,
      reorganizationType,
      reorganizationTypeText,
      sourceEntityRegcode,
      finalEntityRegcode,
      registered,
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await upsertBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0) imported += await upsertBatch(batch);
  console.log(`  ${total} records processed, ${imported} upserted, ${skipped} skipped`);
  return imported;
}

async function upsertBatch(records: ReorganizationRecord[]): Promise<number> {
  await prisma.$transaction(
    records.map((r) =>
      prisma.reorganization.upsert({
        where: { externalId: r.externalId },
        update: {
          reorganizationType: r.reorganizationType,
          reorganizationTypeText: r.reorganizationTypeText,
          sourceEntityRegcode: r.sourceEntityRegcode,
          finalEntityRegcode: r.finalEntityRegcode,
          registered: r.registered,
        },
        create: r,
      })
    )
  );
  return records.length;
}

async function main() {
  console.log('=== Reorganizations Import ===\n');

  console.log('Downloading reorganizations data...');
  const csvPath = await downloadCSV(CSV_URL, 'reorganizations.csv');
  console.log(`Downloaded to ${csvPath}\n`);

  await importReorganizations(csvPath);

  const count = await prisma.reorganization.count();
  console.log(`\nDatabase summary: ${count} total reorganization records`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
