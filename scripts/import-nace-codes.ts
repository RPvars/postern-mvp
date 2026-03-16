import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine } from '@/lib/import-utils';

// NACE 2.0 (current)
const NACE2_CSV_URL =
  'https://data.gov.lv/dati/lv/dataset/10a1c1ad-a195-4361-bac6-43c5d849755f/resource/1f5cb6ed-2703-4a34-b755-4fbd844feeb2/download/nace_2.csv';

// NACE 2.1 (effective 01.01.2025, new codes used by VID)
const NACE21_CSV_URL =
  'https://data.gov.lv/dati/lv/dataset/955fc5d0-408b-4242-8f41-d74ac0b26c79/resource/2ee9a054-6cce-4919-9921-41b269494da3/download/nace_21.csv';

const BATCH_SIZE = 200;

type NaceRecord = { code: string; nameLv: string; nameEn: string };

function addAliases(code: string, nameLv: string, batch: NaceRecord[]) {
  // Division codes like "41" → add "41.00" alias
  if (/^\d{2}$/.test(code)) {
    batch.push({ code: code + '.00', nameLv, nameEn: nameLv });
  }
  // Group codes like "41.1" → add "41.10" alias
  if (/^\d{2}\.\d$/.test(code)) {
    batch.push({ code: code + '0', nameLv, nameEn: nameLv });
  }
}

/**
 * Import NACE 2.0 CSV (columns: nosaukums, kods, vecaka_kods, limenis, apraksts)
 */
async function importNace2(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: NaceRecord[] = [];
  let total = 0;
  let imported = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (isHeader) { isHeader = false; continue; }

    const fields = parseCSVLine(line);
    if (fields.length < 4) continue;

    const level = parseInt(fields[3], 10);
    if (level < 2) continue; // Skip sections (A, B) and top-level

    const rawCode = fields[1].trim();
    const nameLv = fields[0].trim();
    if (!rawCode || !nameLv) continue;

    total++;
    batch.push({ code: rawCode, nameLv, nameEn: nameLv });
    addAliases(rawCode, nameLv, batch);

    if (batch.length >= BATCH_SIZE) {
      imported += await upsertBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0) imported += await upsertBatch(batch);
  console.log(`  NACE 2.0: ${total} codes processed, ${imported} records upserted`);
  return imported;
}

/**
 * Import NACE 2.1 CSV (columns: Code, Name, ParentCode, ValidFrom, ValidTo)
 */
async function importNace21(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: NaceRecord[] = [];
  let total = 0;
  let imported = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (isHeader) { isHeader = false; continue; }

    const fields = parseCSVLine(line);
    if (fields.length < 2) continue;

    const rawCode = fields[0].trim();
    const nameLv = fields[1].trim();
    if (!rawCode || !nameLv) continue;

    // Skip letter section codes (A, B, C...)
    if (/^[A-Z]/.test(rawCode)) continue;

    total++;
    batch.push({ code: rawCode, nameLv, nameEn: nameLv });
    addAliases(rawCode, nameLv, batch);

    if (batch.length >= BATCH_SIZE) {
      imported += await upsertBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0) imported += await upsertBatch(batch);
  console.log(`  NACE 2.1: ${total} codes processed, ${imported} records upserted`);
  return imported;
}

async function upsertBatch(records: NaceRecord[]): Promise<number> {
  await prisma.$transaction(
    records.map((r) =>
      prisma.naceCode.upsert({
        where: { code: r.code },
        update: { nameLv: r.nameLv, nameEn: r.nameEn },
        create: r,
      })
    )
  );
  return records.length;
}

async function main() {
  console.log('=== NACE Classification Import ===\n');

  // Import NACE 2.0
  console.log('Downloading NACE 2.0 classifier...');
  const nace2Path = await downloadCSV(NACE2_CSV_URL, 'nace-2.csv');
  await importNace2(nace2Path);

  // Import NACE 2.1 (upserts override 2.0 where codes overlap)
  console.log('\nDownloading NACE 2.1 classifier...');
  const nace21Path = await downloadCSV(NACE21_CSV_URL, 'nace-21.csv');
  await importNace21(nace21Path);

  const count = await prisma.naceCode.count();
  console.log(`\nDatabase summary: ${count} total NACE codes`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
