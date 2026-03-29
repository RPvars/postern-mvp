export type Metric = 'revenue' | 'employees' | 'taxes' | 'profit';

export interface BreadcrumbItem {
  code: string;
  nameLv: string;
  nameEn: string;
}

export interface IndustryChild {
  code: string;
  nameLv: string;
  nameEn: string;
  level: number;
  companyCount: number;
}

export interface TopCompany {
  registrationNumber: string;
  name: string;
  legalAddress: string;
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  employees: number | null;
  taxAmount: number | null;
  naceCode: string | null;
  naceDescription: string | null;
  rankChange: number | null;
  rankHistory: Record<number, number | null>;
}

export interface IndustryData {
  industry: { code: string; nameLv: string; nameEn: string; level: number; parentCode: string | null };
  breadcrumb: BreadcrumbItem[];
  ancestorHierarchy: { code: string; children: IndustryChild[] }[];
  children: IndustryChild[];
  stats: {
    totalCompanies: number;
    totalRevenue: number;
    totalEmployees: number;
    totalTaxes: number;
    avgRevenue: number;
  };
  topCompanies: TopCompany[];
  year: number;
  availableYears: number[];
}
