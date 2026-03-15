/**
 * data.gov.lv CKAN Datastore API client
 * Fetches annual report financial data (balance sheets, income statements)
 * via SQL JOIN across CKAN resources. No authentication required (CC0 license).
 */

const CKAN_SQL_URL = 'https://data.gov.lv/dati/api/3/action/datastore_search_sql';
const LVL_TO_EUR = 1.42287;

// CKAN resource IDs for annual report data
const RESOURCES = {
  statements: '27fcc5ec-c63b-4bfd-bb08-01f073a52d04',
  balanceSheets: '50ef4f26-f410-4007-b296-22043ca3dc43',
  incomeStatements: 'd5fd17ef-d32e-40cb-8399-82b780095af0',
  cashFlows: '1a11fc29-ba7c-4e5a-8edc-7a28cea24988',
};

// Simple in-memory cache (same pattern as business-register httpClient)
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// --- Types ---

export interface FinancialDataRecord {
  year: number;
  // Raw financial figures (EUR)
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  equity: number | null;
  totalDebt: number | null;
  employees: number | null;
  // Profitability
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  roce: number | null;
  netProfitMargin: number | null;
  grossProfitMargin: number | null;
  operatingProfitMargin: number | null;
  ebitdaMargin: number | null;
  cashFlowMargin: number | null;
  revenuePerEmployee: number | null;
  profitPerEmployee: number | null;
  // Liquidity
  currentRatio: number | null;
  quickRatio: number | null;
  cashRatio: number | null;
  workingCapitalRatio: number | null;
  // Leverage
  debtToEquity: number | null;
  debtRatio: number | null;
  interestCoverageRatio: number | null;
  equityMultiplier: number | null;
  // Efficiency
  assetTurnover: number | null;
  inventoryTurnover: number | null;
  receivablesTurnover: number | null;
  payablesTurnover: number | null;
  dso: number | null;
  dpo: number | null;
  cashConversionCycle: number | null;
}

// --- API ---

interface CkanRecord {
  [key: string]: string | number | null;
}

async function queryCkan(sql: string): Promise<CkanRecord[]> {
  const url = `${CKAN_SQL_URL}?sql=${encodeURIComponent(sql)}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`CKAN API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`CKAN query failed: ${JSON.stringify(data.error)}`);
  }

  return data.result.records;
}

function safeDiv(a: number, b: number): number | null {
  if (b === 0 || isNaN(a) || isNaN(b)) return null;
  const result = a / b;
  if (!isFinite(result)) return null;
  return Math.round(result * 10000) / 10000;
}

function num(val: string | number | null | undefined): number {
  if (val == null || val === '') return 0;
  return typeof val === 'number' ? val : parseFloat(val) || 0;
}

function calculateRatios(row: CkanRecord): FinancialDataRecord {
  const rounded = row.rounded_to_nearest === 'THOUSANDS' ? 1000 : 1;
  const currencyMul = row.currency === 'LVL' ? LVL_TO_EUR : 1;
  const m = rounded * currencyMul;

  const revenue = num(row.net_turnover) * m;
  const netIncome = num(row.net_income) * m;
  const totalAssets = num(row.total_assets) * m;
  const equity_ = num(row.equity) * m;
  const currentAssets = num(row.total_current_assets) * m;
  const currentLiabilities = num(row.current_liabilities) * m;
  const nonCurrentLiabilities = num(row.non_current_liabilities) * m;
  const totalDebt = currentLiabilities + nonCurrentLiabilities;
  const cash = num(row.cash) * m;
  const inventory = num(row.inventories) * m;
  const receivables = num(row.accounts_receivable) * m;
  const cogs = num(row.by_function_cost_of_goods_sold) * m;
  const grossProfit = num(row.by_function_gross_profit) * m;
  const depreciation = num(row.by_nature_depreciation_expenses) * m;
  const interestExpense = num(row.interest_expenses) * m;
  const ebt = num(row.income_before_income_taxes) * m;
  const operatingCashFlow = (num(row.cfo_dm_net_operating_cash_flow) || num(row.cfo_im_net_operating_cash_flow)) * m;
  const employees = num(row.employees);

  const ebit = ebt + interestExpense;
  const ebitda = ebit + depreciation;

  const receivablesTurnover = safeDiv(revenue, receivables);
  const payablesTurnover = safeDiv(cogs, currentLiabilities);
  const inventoryTurnover = safeDiv(cogs, inventory);

  return {
    year: num(row.year),
    revenue: revenue || null,
    netIncome: netIncome || null,
    totalAssets: totalAssets || null,
    equity: equity_ || null,
    totalDebt: totalDebt || null,
    employees: employees || null,
    // Profitability
    returnOnEquity: safeDiv(netIncome, equity_),
    returnOnAssets: safeDiv(netIncome, totalAssets),
    roce: safeDiv(ebit, totalAssets - currentLiabilities),
    netProfitMargin: safeDiv(netIncome, revenue),
    grossProfitMargin: safeDiv(grossProfit, revenue),
    operatingProfitMargin: safeDiv(ebit, revenue),
    ebitdaMargin: safeDiv(ebitda, revenue),
    cashFlowMargin: operatingCashFlow ? safeDiv(operatingCashFlow, revenue) : null,
    revenuePerEmployee: employees > 0 ? safeDiv(revenue, employees) : null,
    profitPerEmployee: employees > 0 ? safeDiv(netIncome, employees) : null,
    // Liquidity
    currentRatio: safeDiv(currentAssets, currentLiabilities),
    quickRatio: safeDiv(currentAssets - inventory, currentLiabilities),
    cashRatio: safeDiv(cash, currentLiabilities),
    workingCapitalRatio: safeDiv(currentAssets - currentLiabilities, totalAssets),
    // Leverage
    debtToEquity: safeDiv(totalDebt, equity_),
    debtRatio: safeDiv(totalDebt, totalAssets),
    interestCoverageRatio: safeDiv(ebit, interestExpense),
    equityMultiplier: safeDiv(totalAssets, equity_),
    // Efficiency
    assetTurnover: safeDiv(revenue, totalAssets),
    inventoryTurnover,
    receivablesTurnover,
    payablesTurnover,
    dso: receivablesTurnover ? Math.round(365 / receivablesTurnover) : null,
    dpo: payablesTurnover ? Math.round(365 / payablesTurnover) : null,
    cashConversionCycle: (() => {
      const invDays = inventoryTurnover ? 365 / inventoryTurnover : null;
      const recDays = receivablesTurnover ? 365 / receivablesTurnover : null;
      const payDays = payablesTurnover ? 365 / payablesTurnover : null;
      if (invDays != null && recDays != null && payDays != null) {
        return Math.round(invDays + recDays - payDays);
      }
      return null;
    })(),
  };
}

/**
 * Fetch financial data for a company from data.gov.lv CKAN API.
 * Returns calculated financial ratios + raw figures for all available years.
 */
export async function getFinancialData(regcode: string): Promise<FinancialDataRecord[]> {
  const cacheKey = `financial:${regcode}`;
  const cached = getCached<FinancialDataRecord[]>(cacheKey);
  if (cached) return cached;

  const sql = `
    SELECT fs.id, fs.year, fs.employees, fs.rounded_to_nearest, fs.currency,
      bs.total_assets, bs.equity, bs.total_current_assets, bs.current_liabilities,
      bs.cash, bs.inventories, bs.accounts_receivable, bs.non_current_liabilities,
      inc.net_turnover, inc.net_income, inc.by_function_gross_profit,
      inc.by_function_cost_of_goods_sold, inc.by_nature_depreciation_expenses,
      inc.interest_expenses, inc.income_before_income_taxes,
      cf.cfo_dm_net_operating_cash_flow, cf.cfo_im_net_operating_cash_flow
    FROM "${RESOURCES.statements}" fs
    LEFT JOIN "${RESOURCES.balanceSheets}" bs ON fs.id = bs.statement_id
    LEFT JOIN "${RESOURCES.incomeStatements}" inc ON fs.id = inc.statement_id
    LEFT JOIN "${RESOURCES.cashFlows}" cf ON fs.id = cf.statement_id
    WHERE fs.legal_entity_registration_number = '${regcode.replace(/'/g, "''")}'
      AND fs.source_type = 'UGP'
    ORDER BY fs.year DESC
  `.trim();

  const records = await queryCkan(sql);
  const results = records.map(calculateRatios);

  setCache(cacheKey, results);
  return results;
}
