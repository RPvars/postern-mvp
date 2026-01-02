import { randomUUID } from 'crypto';
import type { CompanyApiResponse, Company, BoardMemberApiResponse, BoardMember } from '../types/api-responses';

export class CompanyMapper {
  toInternalFormat(apiResponse: CompanyApiResponse): Company {
    return {
      id: randomUUID(), // Generate UUID for internal use
      name: apiResponse.name,
      registrationNumber: apiResponse.regcode,
      taxNumber: apiResponse.taxNumber || '',
      address: apiResponse.address,
      legalForm: apiResponse.legalForm || null,
      status: apiResponse.status,
      registrationDate: apiResponse.registrationDate
        ? new Date(apiResponse.registrationDate)
        : null,
      // Additional fields (set to null as API may not provide them)
      closedDate: null,
      sepaId: null,
      liquidationType: null,
      liquidationDate: null,
      insolvencyDate: null,
      vatNumber: apiResponse.taxNumber || null,
      seatAddress: apiResponse.address,
      postalAddress: apiResponse.address,
    };
  }

  toApiFormat(company: Company): CompanyApiResponse {
    return {
      regcode: company.registrationNumber,
      name: company.name,
      address: company.address,
      legalForm: company.legalForm || '',
      status: company.status,
      registrationDate: company.registrationDate?.toISOString() || '',
      taxNumber: company.taxNumber,
    };
  }
}

export class BoardMemberMapper {
  toInternalFormat(apiResponse: BoardMemberApiResponse, companyId: string): BoardMember {
    return {
      id: randomUUID(),
      companyId,
      name: apiResponse.name,
      personalCode: apiResponse.personalCode || null,
      position: apiResponse.position,
      appointedDate: apiResponse.appointedDate
        ? new Date(apiResponse.appointedDate)
        : null,
      endDate: apiResponse.endDate
        ? new Date(apiResponse.endDate)
        : null,
      isHistorical: apiResponse.isHistorical,
    };
  }

  toApiFormat(boardMember: BoardMember): BoardMemberApiResponse {
    return {
      name: boardMember.name,
      personalCode: boardMember.personalCode || undefined,
      position: boardMember.position,
      appointedDate: boardMember.appointedDate?.toISOString() || '',
      endDate: boardMember.endDate?.toISOString() || undefined,
      isHistorical: boardMember.isHistorical,
    };
  }
}

export const companyMapper = new CompanyMapper();
export const boardMemberMapper = new BoardMemberMapper();
