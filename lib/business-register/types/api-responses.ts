// Business Register API Response Types

export interface CompanyApiResponse {
  regcode: string;
  name: string;
  address: string;
  legalForm: string;
  status: string;
  registrationDate: string;
  taxNumber?: string;
}

export interface BoardMemberApiResponse {
  name: string;
  personalCode?: string;
  position: string;
  appointedDate: string;
  endDate?: string;
  isHistorical: boolean;
}

export interface SearchApiResponse {
  companies: CompanyApiResponse[];
  totalResults: number;
}

// Internal Schema Types (Prisma-compatible)

export interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
  address: string;
  legalForm: string | null;
  status: string;
  registrationDate: Date | null;
  // Additional fields from Prisma schema
  closedDate: Date | null;
  sepaId: string | null;
  liquidationType: string | null;
  liquidationDate: Date | null;
  insolvencyDate: Date | null;
  vatNumber: string | null;
  seatAddress: string | null;
  postalAddress: string | null;
}

export interface BoardMember {
  id: string;
  companyId: string;
  name: string;
  personalCode: string | null;
  position: string;
  appointedDate: Date | null;
  endDate: Date | null;
  isHistorical: boolean;
}
