// Business Register API Response Types (matches real API responses)

// GET /searchlegalentities/search/legal-entities?q=...
export interface SearchApiResponse {
  _embedded: {
    legalEntityList: SearchResultItem[];
  };
}

export interface SearchResultItem {
  registrationNumber: string;
  currentName: string;
  address: string;
  status: string;
  register: string;
  type: string;
  previousName?: string;
  matches?: {
    currentName?: number[];
    previousName?: number[];
  };
  links: {
    self: string;
  };
}

// GET /legalentity/legal-entity/{regcode}
export interface LegalEntityApiResponse {
  registrationNumber: string;
  registrationNumberAssignedOn?: string;
  status: string;
  sepaCreditorId?: string;
  register: string;
  type: string;
  legalName: string;
  cleanedShortName?: string;
  registeredOn?: string;
  lastModifiedAt?: string;
  isAnnulled: boolean;
  address: {
    addressRegisterCode?: number;
    postalCode?: string;
    addressComplete: string;
    city?: string;
    street?: string;
    houseNumber?: string;
  };
  atvkCode?: string;
  links: Record<string, string>;
  officers?: OfficerApiResponse[];
  specialStatuses?: Array<{
    id: string;
    type: string;
    dateFrom: string;
    registeredOn?: string;
    isAnnulled: boolean;
  }>;
  formationDetails?: {
    objects?: string;
    durationIndefinite?: boolean;
    dateOfEffectiveArticlesOfAssociation?: string;
  };
  liquidations?: Array<{
    type: string;
    dateFrom?: string;
    registeredOn?: string;
  }>;
  members?: MemberApiResponse[];
  beneficialOwners?: BeneficialOwnerApiResponse[];
  commercialEntityDetails?: {
    equityCapitals?: Array<{
      id: number;
      type: string;
      amount: number;
      currency: string;
      registeredOn?: string;
    }>;
  };
  securingMeasures?: Array<Record<string, unknown>>;
  sanctionsRisk?: boolean;
}

export interface OfficerApiResponse {
  id: number;
  naturalPerson?: {
    name: string;
    latvianIdentityNumber?: string;
    country?: string;
  };
  legalEntity?: {
    registrationNumber: string;
    legalName: string;
  };
  position: string;
  appointedOn?: string;
  removedOn?: string;
  governingBody?: string;
  rightsOfRepresentation?: Array<{
    type: string;
    withAtLeast?: number;
  }>;
  note?: string;
  registeredOn?: string;
  isAnnulled: boolean;
}

export interface MemberApiResponse {
  id: number;
  dateFrom?: string;
  isPersonallyLiable?: boolean;
  naturalPerson?: {
    latvianIdentityNumber?: string;
    name: string;
    country?: string;
  };
  legalEntity?: {
    registrationNumber: string;
    legalName: string;
  };
  shareHolderDetails?: {
    numberOfShares: number;
    shareNominalValue: number;
    shareCurrency: string;
    inPercent: number;
    votes: number;
  };
  registeredOn?: string;
  isAnnulled: boolean;
}

export interface BeneficialOwnerApiResponse {
  id: number;
  dateFrom?: string;
  isMinor?: boolean;
  naturalPerson?: {
    latvianIdentityNumber?: string;
    forename?: string;
    surname?: string;
    birthDate?: string;
    country?: string;
    countryOfResidence?: string;
  };
  meansOfControl?: Array<{
    id: number;
    natureOfControl: string;
  }>;
  registeredOn?: string;
  isAnnulled: boolean;
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
  institution: string | null;
  position: string;
  appointedDate: Date | null;
  endDate: Date | null;
  representationRights: string | null;
  note: string | null;
  isHistorical: boolean;
}
