import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine } from '@/lib/import-utils';

const CSV_URL =
  'https://data.gov.lv/dati/dataset/5ed74664-b49d-4b28-aacb-040931646e9b/resource/a42d6e8c-1768-4939-ba9b-7700d4f1dd3a/download/pdb_nm_komersantu_samaksato_nodoklu_kopsumas_odata.csv';

const BATCH_SIZE = 1000;

function parseAmount(value: string): number {
  const cleaned = value.replace(/\u00a0/g, '').replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 1000 * 100) / 100; // tūkst EUR → EUR
}

function parseEmployeeCount(value: string): number | null {
  const cleaned = value.replace(/\u00a0/g, '').replace(/\s/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

async function importData(csvPath: string): Promise<void> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: {
    registrationNumber: string;
    year: number;
    amount: number;
    iinAmount: number | null;
    vsaoiAmount: number | null;
    employeeCount: number | null;
  }[] = [];
  let total = 0;
  let imported = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, ''); // strip BOM

    if (isHeader) {
      isHeader = false;
      continue;
    }

    const fields = parseCSVLine(line);
    if (fields.length < 11) continue;

    const registrationNumber = fields[0].trim();
    const year = parseInt(fields[2].trim(), 10);

    if (!registrationNumber || isNaN(year)) continue;

    total++;
    batch.push({
      registrationNumber,
      year,
      amount: parseAmount(fields[7]),
      iinAmount: parseAmount(fields[8]) || null,
      vsaoiAmount: parseAmount(fields[9]) || null,
      employeeCount: parseEmployeeCount(fields[10]),
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await upsertBatch(batch);
      if (imported % 10000 === 0 || imported === batch.length) {
        console.log(`  Processed ${total} rows, imported ${imported}...`);
      }
      batch = [];
    }
  }

  // Final batch
  if (batch.length > 0) {
    imported += await upsertBatch(batch);
  }

  console.log(`Done! Processed ${total} rows, imported ${imported} tax payment records.`);
}

async function upsertBatch(
  records: {
    registrationNumber: string;
    year: number;
    amount: number;
    iinAmount: number | null;
    vsaoiAmount: number | null;
    employeeCount: number | null;
  }[]
): Promise<number> {
  let count = 0;
  // Use transaction for batch performance
  await prisma.$transaction(
    records.map((r) =>
      prisma.taxPayment.upsert({
        where: {
          registrationNumber_year: {
            registrationNumber: r.registrationNumber,
            year: r.year,
          },
        },
        update: {
          amount: r.amount,
          iinAmount: r.iinAmount,
          vsaoiAmount: r.vsaoiAmount,
          employeeCount: r.employeeCount,
        },
        create: r,
      })
    )
  );
  return records.length;
}

async function main() {
  console.log('=== VID Tax Payment Data Import ===\n');

  console.log('Downloading VID tax payment data...');
  const csvPath = await downloadCSV(CSV_URL, 'vid-tax-payments.csv');
  console.log(`CSV saved to ${csvPath}\n`);

  console.log('Importing into database...');
  await importData(csvPath);

  // Summary
  const count = await prisma.taxPayment.count();
  const years = await prisma.taxPayment.groupBy({
    by: ['year'],
    _count: true,
    orderBy: { year: 'asc' },
  });
  console.log(`\nDatabase summary: ${count} total records`);
  for (const y of years) {
    console.log(`  ${y.year}: ${y._count} companies`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
