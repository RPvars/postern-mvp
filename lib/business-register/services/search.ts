import { companyService } from './company';
import type { Company } from '../types/api-responses';

export class SearchService {
  async searchCompanies(query: string, options?: { limit?: number }): Promise<Company[]> {
    const limit = options?.limit || 10;

    if (!query || query.trim().length < 2) {
      return [];
    }

    return companyService.searchCompanies(query.trim(), limit);
  }

  async searchByRegistrationNumber(registrationNumber: string): Promise<Company | null> {
    return companyService.getCompany(registrationNumber);
  }

  async searchByName(name: string, limit: number = 10): Promise<Company[]> {
    return this.searchCompanies(name, { limit });
  }
}

export const searchService = new SearchService();
