import { httpClient } from '../client/http';
import { companyMapper, boardMemberMapper } from '../mappers/company';
import type { Company, BoardMember } from '../types/api-responses';

export class CompanyService {
  async getCompany(registrationNumber: string): Promise<Company | null> {
    try {
      const apiResponse = await httpClient.getLegalEntity(registrationNumber);
      return companyMapper.fromLegalEntity(apiResponse);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch company:', error);
      }
      return null;
    }
  }

  async searchCompanies(query: string, limit: number = 10): Promise<Company[]> {
    try {
      const results = await httpClient.searchCompanies(query);
      return results.slice(0, limit).map(r => companyMapper.fromSearchResult(r));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to search companies:', error);
      }
      return [];
    }
  }

  async getBatch(registrationNumbers: string[]): Promise<Company[]> {
    try {
      const promises = registrationNumbers.map(rn => this.getCompany(rn));
      const results = await Promise.all(promises);
      return results.filter((c): c is Company => c !== null);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch batch companies:', error);
      }
      return [];
    }
  }

  async getBoardMembers(registrationNumber: string): Promise<BoardMember[]> {
    try {
      const apiResponse = await httpClient.getLegalEntity(registrationNumber);
      const companyId = apiResponse.registrationNumber;
      return (apiResponse.officers || []).map(o =>
        boardMemberMapper.fromOfficer(o, companyId)
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch board members:', error);
      }
      return [];
    }
  }
}

export const companyService = new CompanyService();
