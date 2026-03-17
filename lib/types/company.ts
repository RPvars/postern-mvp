export interface CompanyOwner {
  id: string;
  owner: {
    name: string;
    isLegalEntity: boolean;
    personalCode: string | null;
    country: string | null;
    isForeignEntity: boolean;
  };
  sharePercentage: number;
  sharesCount: number | null;
  nominalValue: number | null;
  totalValue: number | null;
  votingRights: number | null;
  memberSince: string | null;
  registeredOn: string | null;
  isPersonallyLiable: boolean;
  notes: string | null;
}

export interface CompanyBoardMember {
  id: string;
  name: string;
  personalCode: string | null;
  institution: string | null;
  position: string | null;
  appointedDate: string | null;
  endDate: string | null;
  representationRights: string | null;
  note: string | null;
}

export interface CompanyBeneficialOwner {
  id: string;
  name: string;
  personalCode: string | null;
  dateFrom: string | null;
  registeredOn: string | null;
  residenceCountry: string | null;
  citizenship: string | null;
  controlType: string | null;
  birthDate: string | null;
  isMinor: boolean;
}

export interface CompanyTaxPayment {
  id: string;
  year: number;
  amount: number;
  iinAmount: number | null;
  vsaoiAmount: number | null;
  employeeCount: number | null;
}

export interface CompanyFinancialRatio {
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
}

export interface CompanyStateAid {
  assignDate: string;
  projectTitle: string;
  assignerTitle: string;
  programTitle: string | null;
  amount: number;
  instrumentTitle: string | null;
}

export interface CompanySpecialStatus {
  id: string;
  type: string;
  dateFrom: string;
  registeredOn?: string;
  isAnnulled: boolean;
}

export interface CompanyInsolvency {
  proceedingForm: string | null;
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  court: string | null;
}

export interface CompanyPreviousName {
  name: string;
  dateTo: string;
}

export interface CompanyReorganization {
  type: string;
  typeText: string;
  sourceRegcode: string;
  finalRegcode: string;
  registered: string;
}

export interface CompanyVatPayer {
  vatNumber: string;
  isActive: boolean;
  registeredDate: string | null;
  deregisteredDate: string | null;
}

export interface CompanyAnnualReport {
  fileId: number;
  year: number;
  periodFrom: string | null;
  periodTo: string | null;
  type: string | null;
  registeredOn: string | null;
  isAnnulled: boolean;
  fileExtension: string | null;
}

export interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
  legalAddress: string;
  postalCode: string | null;
  city: string | null;
  street: string | null;
  houseNumber: string | null;
  addressRegisterCode: number | null;
  atvkCode: string | null;
  registrationDate: string;
  phone: string | null;
  email: string | null;
  isAnnulled: boolean;

  status: string;
  legalForm: string | null;
  registryName: string | null;
  register: string | null;
  cleanedShortName: string | null;
  lastModifiedAt: string | null;
  sepaCreditorId: string | null;
  vatPayer: CompanyVatPayer | null;
  naceCode: string | null;
  naceDescription: string | null;
  stateAid: CompanyStateAid[];
  previousNames: CompanyPreviousName[];
  reorganizations: CompanyReorganization[];
  businessPurpose: string | null;
  durationIndefinite: boolean | null;
  articlesDate: string | null;
  shareCapital: number | null;
  shareCapitalRegisteredDate: string | null;
  registeredVehiclesCount: number | null;
  sanctionsRisk: boolean;

  hasEncumbrances: boolean;
  inLiquidation: boolean;
  inInsolvencyRegister: boolean;
  hasPaymentClaims: boolean;
  hasCommercialPledges: boolean;
  hasSecurities: boolean;
  hasTaxDebts: boolean;
  taxDebtsCheckedDate: string | null;
  specialStatuses: CompanySpecialStatus[];
  securingMeasures: Array<Record<string, unknown>>;
  taxpayerRating: string | null;
  taxpayerRatingDescription: string | null;
  insolvencyProceedings: CompanyInsolvency[];

  owners: CompanyOwner[];
  boardMembers: CompanyBoardMember[];
  beneficialOwners: CompanyBeneficialOwner[];
  taxPayments: CompanyTaxPayment[];
  financialRatios: CompanyFinancialRatio[];
  annualReports: CompanyAnnualReport[];
}
