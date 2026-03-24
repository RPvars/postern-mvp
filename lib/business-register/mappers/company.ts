import { randomUUID } from 'crypto';
import type {
  LegalEntityApiResponse,
  SearchResultItem,
  OfficerApiResponse,
  MemberApiResponse,
  BeneficialOwnerApiResponse,
  AnnualReportItem,
  Company,
  BoardMember,
} from '../types/api-responses';
import type { CompanyAnnualReport } from '@/lib/types/company';

import { abbreviateLegalForm } from '@/lib/text-utils';

export class CompanyMapper {
  fromLegalEntity(api: LegalEntityApiResponse): Company {
    return {
      id: randomUUID(),
      name: abbreviateLegalForm(api.legalName),
      registrationNumber: api.registrationNumber,
      taxNumber: '',
      address: api.address.addressComplete,
      legalForm: api.type || null,
      status: api.status || 'unknown',
      registrationDate: api.registeredOn ? new Date(api.registeredOn) : null,
      closedDate: null,
      sepaId: api.sepaCreditorId || null,
      liquidationType: api.liquidations?.[0]?.type || null,
      liquidationDate: api.liquidations?.[0]?.dateFrom
        ? new Date(api.liquidations[0].dateFrom)
        : null,
      insolvencyDate: null,
      vatNumber: null,
      seatAddress: api.address.addressComplete,
      postalAddress: api.address.addressComplete,
    };
  }

  fromSearchResult(item: SearchResultItem): Company {
    return {
      id: randomUUID(),
      name: abbreviateLegalForm(item.currentName),
      registrationNumber: item.registrationNumber,
      taxNumber: '',
      address: item.address,
      legalForm: item.type || null,
      status: item.status || 'unknown',
      registrationDate: null,
      closedDate: null,
      sepaId: null,
      liquidationType: null,
      liquidationDate: null,
      insolvencyDate: null,
      vatNumber: null,
      seatAddress: item.address,
      postalAddress: item.address,
    };
  }
}

export class BoardMemberMapper {
  fromOfficer(officer: OfficerApiResponse, companyId: string): BoardMember {
    const rawName = officer.naturalPerson?.name
      || officer.legalEntity?.legalName
      || officer.legalEntity?.registrationNumber
      || 'Nav zināms';
    const name = abbreviateLegalForm(rawName);

    // Return raw representation rights data for frontend i18n
    let representationRights: string | null = null;
    if (officer.rightsOfRepresentation?.length) {
      const right = officer.rightsOfRepresentation[0];
      if (right.type === 'WITH_AT_LEAST' && right.withAtLeast) {
        representationRights = `WITH_AT_LEAST:${right.withAtLeast}`;
      } else {
        representationRights = right.type;
      }
    }

    return {
      id: randomUUID(),
      companyId,
      name,
      personalCode: officer.naturalPerson?.latvianIdentityNumber || null,
      institution: officer.governingBody || null,
      position: officer.position,
      appointedDate: officer.appointedOn ? new Date(officer.appointedOn) : null,
      endDate: officer.removedOn ? new Date(officer.removedOn) : null,
      representationRights,
      note: officer.note || null,
      isHistorical: officer.isAnnulled || !!officer.removedOn,
    };
  }
}

export interface OwnerMapped {
  id: string;
  owner: { name: string; personalCode: string | null; isLegalEntity: boolean; country: string | null; isForeignEntity: boolean };
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

export class MemberMapper {
  fromMember(member: MemberApiResponse): OwnerMapped {
    const le = member.legalEntity;
    const rawName = (member.naturalPerson?.name?.trim())
      || (le?.legalName?.trim())
      || (le?.name?.trim())
      || le?.registrationNumber
      || le?.foreignRegistrationNumber
      || le?.externalObjectNumber
      || '—';
    const name = abbreviateLegalForm(rawName);
    const personalCode = member.naturalPerson?.latvianIdentityNumber
      || le?.registrationNumber
      || le?.foreignRegistrationNumber
      || le?.externalObjectNumber
      || null;
    const details = member.shareHolderDetails;

    return {
      id: randomUUID(),
      owner: {
        name,
        personalCode,
        isLegalEntity: !!member.legalEntity,
        country: le?.country || member.naturalPerson?.country || null,
        isForeignEntity: !!le && !le.registrationNumber,
      },
      sharePercentage: details?.inPercent ?? 0,
      sharesCount: details?.numberOfShares ?? null,
      nominalValue: details?.shareNominalValue ?? null,
      totalValue: details ? details.numberOfShares * details.shareNominalValue : null,
      votingRights: details?.votes ?? null,
      memberSince: member.dateFrom || null,
      registeredOn: member.registeredOn || null,
      isPersonallyLiable: member.isPersonallyLiable ?? false,
      notes: null,
    };
  }
}

export interface BeneficialOwnerMapped {
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

export class BeneficialOwnerMapper {
  fromApiResponse(bo: BeneficialOwnerApiResponse): BeneficialOwnerMapped {
    const np = bo.naturalPerson;
    const name = np ? `${np.forename || ''} ${np.surname || ''}`.trim() : 'Nav zināms';

    return {
      id: randomUUID(),
      name,
      personalCode: np?.latvianIdentityNumber || null,
      dateFrom: bo.dateFrom || null,
      registeredOn: bo.registeredOn || null,
      residenceCountry: np?.countryOfResidence || np?.country || null,
      citizenship: np?.country || null,
      controlType: bo.meansOfControl?.[0]?.natureOfControl || null,
      birthDate: np?.birthDate || null,
      isMinor: bo.isMinor ?? false,
    };
  }
}

export class AnnualReportMapper {
  fromApiResponse(item: AnnualReportItem): CompanyAnnualReport {
    return {
      fileId: item.fileId,
      year: parseInt(item.year, 10),
      periodFrom: item.startDate || null,
      periodTo: item.endDate || null,
      type: item.type || null,
      registeredOn: item.registeredOn || null,
      isAnnulled: item.isAnnulled,
      fileExtension: item.filenameExtension?.toUpperCase() || null,
    };
  }
}

export const annualReportMapper = new AnnualReportMapper();
export const companyMapper = new CompanyMapper();
export const boardMemberMapper = new BoardMemberMapper();
export const memberMapper = new MemberMapper();
export const beneficialOwnerMapper = new BeneficialOwnerMapper();
