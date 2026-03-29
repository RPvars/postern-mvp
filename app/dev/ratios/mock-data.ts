import { calculateRatios, type CkanRecord, type FinancialDataRecord } from '@/lib/data-gov/client';

function mockRow(year: number, data: {
  revenue: number;
  netIncome: number;
  totalAssets: number;
  equity: number;
  currentAssets?: number;
  currentLiabilities?: number;
  nonCurrentLiabilities?: number;
  cash?: number;
  inventories?: number;
  accountsReceivable?: number;
  cogs?: number;
  grossProfit?: number;
  depreciation?: number;
  interestExpenses?: number;
  ebt?: number;
  employees?: number;
}): CkanRecord {
  const ca = data.currentAssets ?? data.totalAssets * 0.4;
  const cl = data.currentLiabilities ?? (data.totalAssets - data.equity) * 0.5;
  const ncl = data.nonCurrentLiabilities ?? (data.totalAssets - data.equity) * 0.5;

  return {
    year,
    rounded_to_nearest: 'UNITS',
    currency: 'EUR',
    net_turnover: data.revenue,
    net_income: data.netIncome,
    total_assets: data.totalAssets,
    equity: data.equity,
    total_current_assets: ca,
    current_liabilities: cl,
    non_current_liabilities: ncl,
    cash: data.cash ?? ca * 0.2,
    inventories: data.inventories ?? ca * 0.3,
    accounts_receivable: data.accountsReceivable ?? ca * 0.4,
    by_function_cost_of_goods_sold: data.cogs ?? data.revenue * 0.6,
    by_function_gross_profit: data.grossProfit ?? data.revenue * 0.4,
    by_nature_depreciation_expenses: data.depreciation ?? data.totalAssets * 0.05,
    interest_expenses: data.interestExpenses ?? (data.totalAssets - data.equity) * 0.04,
    income_before_income_taxes: data.ebt ?? data.netIncome * 1.2,
    cfo_dm_net_operating_cash_flow: data.netIncome * 1.3,
    cfo_im_net_operating_cash_flow: 0,
    employees: data.employees ?? 25,
  };
}

function buildCompanyRatios(rows: CkanRecord[]): FinancialDataRecord[] {
  return rows.map(calculateRatios);
}

// ─── 1. SIA Stabils — Normāls uzņēmums ───
const stabilsRows: CkanRecord[] = [
  mockRow(2026, { revenue: 3_200_000, netIncome: 120_000, totalAssets: 2_000_000, equity: 800_000, employees: 55 }),
  mockRow(2025, { revenue: 3_000_000, netIncome: 110_000, totalAssets: 1_900_000, equity: 750_000, employees: 52 }),
  mockRow(2024, { revenue: 2_800_000, netIncome: 100_000, totalAssets: 1_800_000, equity: 700_000, employees: 50 }),
  mockRow(2023, { revenue: 2_600_000, netIncome: 95_000, totalAssets: 1_700_000, equity: 650_000, employees: 48 }),
  mockRow(2022, { revenue: 2_400_000, netIncome: 85_000, totalAssets: 1_600_000, equity: 600_000, employees: 45 }),
  mockRow(2021, { revenue: 2_200_000, netIncome: 80_000, totalAssets: 1_500_000, equity: 550_000, employees: 42 }),
];

// ─── 2. SIA Grīmste — Negatīvs equity + negatīva peļņa ───
// Uzņēmums lēnām slīd uz bankrotu. Pēdējos gados abi negatīvi → ROE pozitīvs!
const grimsteRows: CkanRecord[] = [
  mockRow(2026, { revenue: 300_000, netIncome: -50_000, totalAssets: 500_000, equity: -80_000, employees: 10 }),
  mockRow(2025, { revenue: 350_000, netIncome: -35_000, totalAssets: 520_000, equity: -30_000, employees: 12 }),
  mockRow(2024, { revenue: 400_000, netIncome: -20_000, totalAssets: 550_000, equity: 10_000, employees: 14 }),
  mockRow(2023, { revenue: 450_000, netIncome: -5_000, totalAssets: 580_000, equity: 30_000, employees: 15 }),
  mockRow(2022, { revenue: 500_000, netIncome: 10_000, totalAssets: 600_000, equity: 50_000, employees: 18 }),
  mockRow(2021, { revenue: 520_000, netIncome: 15_000, totalAssets: 620_000, equity: 60_000, employees: 20 }),
];

// ─── 3. SIA Atgūšanās — Negatīvs equity + pozitīva peļņa ───
// Vēsturiski uzkrāti zaudējumi, bet tagad pelna. Equity uzlabojas.
const atgusanasRows: CkanRecord[] = [
  mockRow(2026, { revenue: 1_200_000, netIncome: 80_000, totalAssets: 800_000, equity: -30_000, employees: 22 }),
  mockRow(2025, { revenue: 1_100_000, netIncome: 70_000, totalAssets: 780_000, equity: -50_000, employees: 20 }),
  mockRow(2024, { revenue: 1_000_000, netIncome: 60_000, totalAssets: 750_000, equity: -70_000, employees: 20 }),
  mockRow(2023, { revenue: 900_000, netIncome: 55_000, totalAssets: 720_000, equity: -85_000, employees: 18 }),
  mockRow(2022, { revenue: 850_000, netIncome: 50_000, totalAssets: 700_000, equity: -100_000, employees: 18 }),
  mockRow(2021, { revenue: 800_000, netIncome: 45_000, totalAssets: 680_000, equity: -110_000, employees: 16 }),
];

// ─── 4. SIA Sviras — Ļoti mazs equity (< 10% no aktīviem) ───
// Strādā gandrīz pilnībā ar aizņemtu naudu. ROE izskatās fantastisks.
const svirasRows: CkanRecord[] = [
  mockRow(2026, { revenue: 500_000, netIncome: 50_000, totalAssets: 400_000, equity: 12_000, employees: 15 }),
  mockRow(2025, { revenue: 480_000, netIncome: 55_000, totalAssets: 380_000, equity: 10_000, employees: 14 }),
  mockRow(2024, { revenue: 460_000, netIncome: 45_000, totalAssets: 350_000, equity: 9_000, employees: 14 }),
  mockRow(2023, { revenue: 440_000, netIncome: 48_000, totalAssets: 330_000, equity: 8_000, employees: 13 }),
  mockRow(2022, { revenue: 420_000, netIncome: 42_000, totalAssets: 300_000, equity: 10_000, employees: 12 }),
  mockRow(2021, { revenue: 400_000, netIncome: 40_000, totalAssets: 280_000, equity: 15_000, employees: 12 }),
];

// ─── 5. SIA Nulle — Equity ap 0 (robežgadījums) ───
// Svārstās starp pozitīvu, nulles un negatīvu equity
const nulleRows: CkanRecord[] = [
  mockRow(2026, { revenue: 600_000, netIncome: 30_000, totalAssets: 300_000, equity: 0, employees: 8 }),
  mockRow(2025, { revenue: 580_000, netIncome: 25_000, totalAssets: 290_000, equity: 1_000, employees: 8 }),
  mockRow(2024, { revenue: 560_000, netIncome: -5_000, totalAssets: 280_000, equity: -1_000, employees: 9 }),
  mockRow(2023, { revenue: 540_000, netIncome: 15_000, totalAssets: 270_000, equity: 500, employees: 9 }),
  mockRow(2022, { revenue: 520_000, netIncome: -10_000, totalAssets: 260_000, equity: -2_000, employees: 10 }),
  mockRow(2021, { revenue: 500_000, netIncome: 20_000, totalAssets: 250_000, equity: 3_000, employees: 10 }),
];

export interface MockCompany {
  name: string;
  description: string;
  expectedWarning: string;
  ratios: FinancialDataRecord[];
}

export const MOCK_COMPANIES: MockCompany[] = [
  {
    name: 'SIA Stabils',
    description: 'Normāls, veselīgs uzņēmums. ROE ~15%, equity 35-40% no aktīviem. Nav brīdinājumu.',
    expectedWarning: 'Nav',
    ratios: buildCompanyRatios(stabilsRows),
  },
  {
    name: 'SIA Grīmste',
    description: 'Slīd uz bankrotu. Pēdējos gados equity un peļņa abi negatīvi — ROE iznāk pozitīvs (matemātisks artefakts).',
    expectedWarning: 'negativeEquityNegativeIncome',
    ratios: buildCompanyRatios(grimsteRows),
  },
  {
    name: 'SIA Atgūšanās',
    description: 'Vēsturiski uzkrāti zaudējumi (negatīvs equity), bet tagad pelna. ROE negatīvs, lai gan uzņēmums uzlabojas.',
    expectedWarning: 'negativeEquity',
    ratios: buildCompanyRatios(atgusanasRows),
  },
  {
    name: 'SIA Sviras',
    description: 'Strādā gandrīz pilnībā ar aizņemtu naudu. Equity tikai 3-5% no aktīviem. ROE 400-500% — maldinoši augsts.',
    expectedWarning: 'lowEquityRatio',
    ratios: buildCompanyRatios(svirasRows),
  },
  {
    name: 'SIA Nulle',
    description: 'Equity svārstās ap nulli. Dažos gados 0 (N/A), dažos negatīvs, dažos minimāli pozitīvs.',
    expectedWarning: 'Dažādi pa gadiem',
    ratios: buildCompanyRatios(nulleRows),
  },
];
