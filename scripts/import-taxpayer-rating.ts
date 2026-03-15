import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { downloadCSV, parseCSVLine, parseLvDate } from '@/lib/import-utils';

const CSV_URL =
  'https://data.gov.lv/dati/dataset/41481e3e-630f-4b73-b02e-a415d27896db/resource/acd4c6f9-5123-46a5-80f6-1f44b4517f58/download/reitings_uznemumi.csv';

const BATCH_SIZE = 1000;

async function importData(csvPath: string): Promise<void> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: {
    registrationNumber: string;
    rating: string;
    ratingDescription: string | null;
    ratingDate: Date | null;
  }[] = [];
  let total = 0;
  let imported = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');

    if (isHeader) {
      isHeader = false;
      continue;
    }

    const fields = parseCSVLine(line);
    if (fields.length < 5) continue;

    const registrationNumber = fields[0];
    const rating = fields[2];

    if (!registrationNumber || !rating) continue;

    total++;
    batch.push({
      registrationNumber,
      rating,
      ratingDescription: fields[3] || null,
      ratingDate: parseLvDate(fields[4]),
    });

    if (batch.length >= BATCH_SIZE) {
      imported += await upsertBatch(batch);
      if (imported % 50000 === 0) {
        console.log(`  Processed ${total} rows, imported ${imported}...`);
      }
      batch = [];
    }
  }

  if (batch.length > 0) {
    imported += await upsertBatch(batch);
  }

  console.log(`Done! Processed ${total} rows, imported ${imported} taxpayer rating records.`);
}

async function upsertBatch(
  records: {
    registrationNumber: string;
    rating: string;
    ratingDescription: string | null;
    ratingDate: Date | null;
  }[]
): Promise<number> {
  await prisma.$transaction(
    records.map((r) =>
      prisma.taxpayerRating.upsert({
        where: { registrationNumber: r.registrationNumber },
        update: {
          rating: r.rating,
          ratingDescription: r.ratingDescription,
          ratingDate: r.ratingDate,
        },
        create: r,
      })
    )
  );
  return records.length;
}

async function main() {
  console.log('=== VID Taxpayer Rating Import ===\n');

  console.log('Downloading VID taxpayer rating data...');
  const csvPath = await downloadCSV(CSV_URL, 'taxpayer-ratings.csv');
  console.log(`CSV saved to ${csvPath}\n`);

  console.log('Importing into database...');
  await importData(csvPath);

  const count = await prisma.taxpayerRating.count();
  const ratings = await prisma.taxpayerRating.groupBy({
    by: ['rating'],
    _count: true,
    orderBy: { rating: 'asc' },
  });
  console.log(`\nDatabase summary: ${count} total records`);
  for (const r of ratings) {
    console.log(`  Rating ${r.rating}: ${r._count} companies`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
