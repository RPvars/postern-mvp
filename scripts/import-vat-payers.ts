import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine, parseLvDate } from '@/lib/import-utils';

const CSV_URL =
  'https://data.gov.lv/dati/dataset/9a5eae1c-2438-48cf-854b-6a2c170f918f/resource/610910e9-e086-4c5b-a7ea-0a896a697672/download/pdb_pvnmaksataji_odata.csv';

const BATCH_SIZE = 1000;

async function importData(csvPath: string): Promise<void> {
  // CSV is ISO-8859-1 encoded
  const rl = createInterface({
    input: createReadStream(csvPath, 'latin1'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: {
    vatNumber: string;
    name: string | null;
    isActive: boolean;
    registeredDate: Date | null;
    deregisteredDate: Date | null;
  }[] = [];
  let total = 0;
  let imported = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');

    if (isHeader) {
      isHeader = false;
      continue;
    }

    // Columns: Numurs, Nosaukums, Aktivs, Registrets, Buvniecibas_pazime, PVN139_2_pazime, Izslegts
    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;

    const vatNumber = fields[0];
    if (!vatNumber) continue;

    total++;
    batch.push({
      vatNumber,
      name: fields[1] || null,
      isActive: fields[2] === 'ir',
      registeredDate: parseLvDate(fields[3]),
      deregisteredDate: parseLvDate(fields[6]),
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await upsertBatch(batch);
      if (total % 50000 === 0) {
        console.log(`  Processed ${total} rows, imported ${imported}...`);
      }
      batch = [];
    }
  }

  if (batch.length > 0) {
    imported += await upsertBatch(batch);
  }

  console.log(`Done! Processed ${total} rows, imported ${imported} VAT payer records.`);
}

async function upsertBatch(
  records: {
    vatNumber: string;
    name: string | null;
    isActive: boolean;
    registeredDate: Date | null;
    deregisteredDate: Date | null;
  }[]
): Promise<number> {
  await prisma.$transaction(
    records.map((r) =>
      prisma.vatPayer.upsert({
        where: { vatNumber: r.vatNumber },
        update: {
          name: r.name,
          isActive: r.isActive,
          registeredDate: r.registeredDate,
          deregisteredDate: r.deregisteredDate,
        },
        create: r,
      })
    )
  );
  return records.length;
}

async function main() {
  console.log('=== VID VAT Payers Import ===\n');

  console.log('Downloading VID VAT payers data...');
  const csvPath = await downloadCSV(CSV_URL, 'vat-payers.csv');
  console.log(`CSV saved to ${csvPath}\n`);

  console.log('Importing into database...');
  await importData(csvPath);

  const total = await prisma.vatPayer.count();
  const active = await prisma.vatPayer.count({ where: { isActive: true } });
  console.log(`\nDatabase summary: ${total} total records`);
  console.log(`  Active: ${active}`);
  console.log(`  Inactive: ${total - active}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
