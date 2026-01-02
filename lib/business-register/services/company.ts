import { httpClient } from '../client/http';
import { companyMapper } from '../mappers/company';
import type { CompanyApiResponse, Company } from '../types/api-responses';

export class CompanyService {
  async getCompany(registrationNumber: string): Promise<Company | null> {
    try {
      const apiResponse = await httpClient.request<CompanyApiResponse>(
        `/companies/${registrationNumber}`
      );

      return companyMapper.toInternalFormat(apiResponse);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch company:', error);
      }
      return null;
    }
  }

  async searchCompanies(query: string, limit: number = 10): Promise<Company[]> {
    try {
      const apiResponse = await httpClient.request<{ companies: CompanyApiResponse[] }>(
        `/companies/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );

      return apiResponse.companies.map(c => companyMapper.toInternalFormat(c));
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
}

export const companyService = new CompanyService();
