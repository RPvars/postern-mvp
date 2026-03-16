import { prisma } from '@/lib/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { parseCSVLine } from '@/lib/import-utils';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import https from 'https';
import path from 'path';

const CSV_URL = 'https://deminimis.fm.gov.lv/public/mekletajs/export_csv';
const BATCH_SIZE = 200;

type StateAidRecord = {
  registrationNumber: string;
  assignDate: Date;
  projectTitle: string;
  assignerTitle: string;
  programTitle: string | null;
  amount: number;
  instrumentTitle: string | null;
};

/**
 * Download CSV with SSL verification disabled (deminimis.fm.gov.lv has cert issues).
 */
async function downloadStateAidCSV(): Promise<string> {
  const localPath = path.join(process.cwd(), 'data', 'state-aid.csv');
  const dir = path.dirname(localPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  return new Promise((resolve, reject) => {
    const follow = (href: string, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const url = new URL(href);
      https.get(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          rejectUnauthorized: false,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return follow(res.headers.location, redirects + 1);
          }
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
          const file = createWriteStream(localPath);
          pipeline(res, file).then(() => resolve(localPath)).catch(reject);
        }
      ).on('error', reject);
    };
    follow(CSV_URL);
  });
}

/**
 * CSV columns: assign_date, person_reg_nr, person_title, project_title,
 *              assigner_title, program_title, assigned_amount, regul_title, instrument_title
 */
async function importStateAid(csvPath: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(csvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch: StateAidRecord[] = [];
  let total = 0;
  let imported = 0;
  let skipped = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (isHeader) { isHeader = false; continue; }

    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;

    const regNr = fields[1].trim();
    // Only legal entities (11-digit registration numbers)
    if (!/^\d{11}$/.test(regNr)) { skipped++; continue; }

    // Date format: YYYY-MM-DD
    const dateStr = fields[0].trim();
    const assignDate = dateStr ? new Date(dateStr) : null;
    if (!assignDate || isNaN(assignDate.getTime())) { skipped++; continue; }

    const amountStr = fields[6].trim().replace(/\s/g, '').replace(',', '.');
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) { skipped++; continue; }

    const projectTitle = fields[3].trim();
    const assignerTitle = fields[4].trim();
    if (!projectTitle || !assignerTitle) { skipped++; continue; }

    total++;
    batch.push({
      registrationNumber: regNr,
      assignDate,
      projectTitle,
      assignerTitle,
      programTitle: fields[5].trim() || null,
      amount,
      instrumentTitle: fields[8]?.trim() || null,
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

async function upsertBatch(records: StateAidRecord[]): Promise<number> {
  await prisma.$transaction(
    records.map((r) =>
      prisma.stateAid.upsert({
        where: {
          registrationNumber_assignDate_assignerTitle_amount: {
            registrationNumber: r.registrationNumber,
            assignDate: r.assignDate,
            assignerTitle: r.assignerTitle,
            amount: r.amount,
          },
        },
        update: {
          projectTitle: r.projectTitle,
          programTitle: r.programTitle,
          instrumentTitle: r.instrumentTitle,
        },
        create: r,
      })
    )
  );
  return records.length;
}

async function main() {
  console.log('=== De Minimis State Aid Import ===\n');

  console.log('Downloading state aid data...');
  const csvPath = await downloadStateAidCSV();
  console.log(`Downloaded to ${csvPath}\n`);

  await importStateAid(csvPath);

  const count = await prisma.stateAid.count();
  console.log(`\nDatabase summary: ${count} total state aid records`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
