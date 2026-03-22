import { prisma } from '@/lib/prisma';

/**
 * Bulk import financial data (revenue, net income, assets, equity, employees)
 * from data.gov.lv CKAN Datastore API into FinancialData table.
 *
 * Source: Annual report data (same as lib/data-gov/client.ts but bulk query).
 */

const CKAN_SQL_URL = 'https://data.gov.lv/dati/api/3/action/datastore_search_sql';
const LVL_TO_EUR = 1.42287;

const RESOURCES = {
  statements: '27fcc5ec-c63b-4bfd-bb08-01f073a52d04',
  balanceSheets: '50ef4f26-f410-4007-b296-22043ca3dc43',
  incomeStatements: 'd5fd17ef-d32e-40cb-8399-82b780095af0',
};

const PAGE_SIZE = 32000;
const BATCH_SIZE = 500;

interface CkanRecord {
  [key: string]: string | number | null;
}

interface FinancialRecord {
  registrationNumber: string;
  year: number;
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  equity: number | null;
  employees: number | null;
}

function num(val: string | number | null | undefined): number {
  if (val == null || val === '') return 0;
  return typeof val === 'number' ? val : parseFloat(val) || 0;
}

function nullIfZero(val: number): number | null {
  return val === 0 ? null : val;
}

function parseRecord(row: CkanRecord): FinancialRecord | null {
  const regNum = String(row.legal_entity_registration_number || '').trim();
  if (!regNum) return null;

  const year = num(row.year);
  if (year < 2000 || year > 2030) return null;

  const rounded = row.rounded_to_nearest === 'THOUSANDS' ? 1000 : 1;
  const currencyMul = row.currency === 'LVL' ? LVL_TO_EUR : 1;
  const m = rounded * currencyMul;

  return {
    registrationNumber: regNum,
    year,
    revenue: nullIfZero(num(row.net_turnover) * m),
    netIncome: nullIfZero(num(row.net_income) * m),
    totalAssets: nullIfZero(num(row.total_assets) * m),
    equity: nullIfZero(num(row.equity) * m),
    employees: num(row.employees) > 0 ? Math.round(num(row.employees)) : null,
  };
}

async function queryCkan(sql: string): Promise<CkanRecord[]> {
  const url = `${CKAN_SQL_URL}?sql=${encodeURIComponent(sql)}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`CKAN API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`CKAN query failed: ${JSON.stringify(data.error)}`);
  }

  return data.result.records;
}

async function upsertBatch(records: FinancialRecord[]): Promise<number> {
  let upserted = 0;
  // Use smaller transaction batches to avoid SQLite limits
  const txBatchSize = 50;
  for (let i = 0; i < records.length; i += txBatchSize) {
    const slice = records.slice(i, i + txBatchSize);
    await prisma.$transaction(
      slice.map((r) =>
        prisma.financialData.upsert({
          where: {
            registrationNumber_year: {
              registrationNumber: r.registrationNumber,
              year: r.year,
            },
          },
          update: {
            revenue: r.revenue,
            netIncome: r.netIncome,
            totalAssets: r.totalAssets,
            equity: r.equity,
            employees: r.employees,
          },
          create: r,
        })
      )
    );
    upserted += slice.length;
  }
  return upserted;
}

async function main() {
  console.log('=== Financial Data Import (CKAN Bulk) ===\n');

  let offset = 0;
  let totalRecords = 0;
  let totalImported = 0;
  let batch: FinancialRecord[] = [];

  while (true) {
    console.log(`Fetching page at offset ${offset}...`);

    const sql = `
      SELECT fs.legal_entity_registration_number, fs.year, fs.employees,
             fs.rounded_to_nearest, fs.currency,
             bs.total_assets, bs.equity,
             inc.net_turnover, inc.net_income
      FROM "${RESOURCES.statements}" fs
      LEFT JOIN "${RESOURCES.balanceSheets}" bs ON fs.id = bs.statement_id
      LEFT JOIN "${RESOURCES.incomeStatements}" inc ON fs.id = inc.statement_id
      WHERE fs.source_type = 'UGP'
      ORDER BY fs.legal_entity_registration_number, fs.year
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `.trim();

    let records: CkanRecord[];
    try {
      records = await queryCkan(sql);
    } catch (err) {
      console.error(`  Error fetching page at offset ${offset}:`, err);
      break;
    }

    if (records.length === 0) break;

    for (const row of records) {
      const parsed = parseRecord(row);
      if (parsed) {
        batch.push(parsed);
        totalRecords++;
      }

      if (batch.length >= BATCH_SIZE) {
        totalImported += await upsertBatch(batch);
        batch = [];
        if (totalImported % 5000 === 0) {
          console.log(`  Imported ${totalImported} records...`);
        }
      }
    }

    console.log(`  Fetched ${records.length} rows (total parsed: ${totalRecords})`);

    if (records.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;

    // Small delay between pages to be polite to the API
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (batch.length > 0) {
    totalImported += await upsertBatch(batch);
  }

  const dbCount = await prisma.financialData.count();
  console.log(`\nImport complete: ${totalRecords} records parsed, ${totalImported} upserted`);
  console.log(`Database summary: ${dbCount} total FinancialData records`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
