export interface CompareCompany {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
  legalAddress: string;
  registrationDate: string;
  status: string;
  legalForm: string | null;
  shareCapital: number | null;
  registeredVehiclesCount: number | null;
  taxPayments: {
    year: number;
    amount: number;
    iinAmount: number | null;
    vsaoiAmount: number | null;
    employeeCount: number | null;
  }[];
  financialRatios: {
    year: number;
    revenue: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    equity: number | null;
    totalDebt: number | null;
    employees: number | null;
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
    currentRatio: number | null;
    quickRatio: number | null;
    cashRatio: number | null;
    workingCapitalRatio: number | null;
    debtToEquity: number | null;
    debtRatio: number | null;
    interestCoverageRatio: number | null;
    equityMultiplier: number | null;
    assetTurnover: number | null;
    inventoryTurnover: number | null;
    receivablesTurnover: number | null;
    payablesTurnover: number | null;
    dso: number | null;
    dpo: number | null;
    cashConversionCycle: number | null;
  }[];
  owners: {
    id: string;
    owner: { name: string; isLegalEntity: boolean };
    sharePercentage: number;
  }[];
  vatPayer: {
    vatNumber: string;
    isActive: boolean;
    registeredDate: string | null;
  } | null;
}

// Warm + cool accent color palette
export const COMPANY_COLORS = [
  '#FEC200', // Posterns Yellow (main brand)
  '#F97316', // Vibrant Orange
  '#14B8A6', // Teal
  '#DC2626', // Red
  '#0EA5E9', // Sky Blue
];

export const getCompanyColor = (index: number): string => {
  return COMPANY_COLORS[index % COMPANY_COLORS.length];
};

export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  color: 'var(--popover-foreground)',
};
