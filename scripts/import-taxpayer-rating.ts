import { prisma } from '@/lib/prisma';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createInterface } from 'readline';
import https from 'https';
import path from 'path';

const CSV_URL =
  'https://data.gov.lv/dati/dataset/41481e3e-630f-4b73-b02e-a415d27896db/resource/acd4c6f9-5123-46a5-80f6-1f44b4517f58/download/reitings_uznemumi.csv';

const LOCAL_CSV = path.join(process.cwd(), 'data', 'taxpayer-ratings.csv');
const BATCH_SIZE = 1000;

// Comma-separated CSV with quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseLvDate(value: string): Date | null {
  if (!value || value.trim() === '') return null;
  // Format: DD.MM.YYYY
  const parts = value.trim().split('.');
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return isNaN(d.getTime()) ? null : d;
}

async function downloadCSV(): Promise<void> {
  const { mkdirSync, existsSync } = await import('fs');
  const dir = path.dirname(LOCAL_CSV);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  console.log('Downloading VID taxpayer rating data...');

  return new Promise((resolve, reject) => {
    const follow = (url: string, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const file = createWriteStream(LOCAL_CSV);
        pipeline(res, file).then(resolve).catch(reject);
      }).on('error', reject);
    };
    follow(CSV_URL);
  });
}

async function importData(): Promise<void> {
  const rl = createInterface({
    input: createReadStream(LOCAL_CSV, 'utf-8'),
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

  await downloadCSV();
  console.log(`CSV saved to ${LOCAL_CSV}\n`);

  console.log('Importing into database...');
  await importData();

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
