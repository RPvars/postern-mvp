import { prisma } from '@/lib/prisma';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createInterface } from 'readline';
import https from 'https';
import path from 'path';

const CSV_URL =
  'https://data.gov.lv/dati/dataset/9a5eae1c-2438-48cf-854b-6a2c170f918f/resource/610910e9-e086-4c5b-a7ea-0a896a697672/download/pdb_pvnmaksataji_odata.csv';

const LOCAL_CSV = path.join(process.cwd(), 'data', 'vat-payers.csv');
const BATCH_SIZE = 1000;

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
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Format: DD.MM.YYYY
  const parts = trimmed.split('.');
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return isNaN(d.getTime()) ? null : d;
}

async function downloadCSV(): Promise<void> {
  const { mkdirSync, existsSync } = await import('fs');
  const dir = path.dirname(LOCAL_CSV);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  console.log('Downloading VID VAT payers data...');

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
  // CSV is ISO-8859-1 encoded
  const rl = createInterface({
    input: createReadStream(LOCAL_CSV, 'latin1'),
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

  await downloadCSV();
  console.log(`CSV saved to ${LOCAL_CSV}\n`);

  console.log('Importing into database...');
  await importData();

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
