import { authClient } from './auth';
import { businessRegisterConfig } from '../config';
import { httpsRequestWithCert } from './https-util';
import type { SearchApiResponse, LegalEntityApiResponse, SearchResultItem } from '../types/api-responses';

const API_GATEWAY = () => businessRegisterConfig.apiGatewayUrl;

// Simple in-memory cache with TTL and size limit
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

const API_PATHS = {
  searchLegalEntities: (query: string) =>
    `${API_GATEWAY()}/searchlegalentities/search/legal-entities?q=${encodeURIComponent(query)}`,
  legalEntity: (regcode: string) =>
    `${API_GATEWAY()}/legalentity/legal-entity/${regcode}`,
  annualReport: (regcode: string) =>
    `${API_GATEWAY()}/annualreport/annual-report/${regcode}`,
} as const;

export class HttpClient {
  private async authenticatedRequest<T>(url: string): Promise<T> {
    const token = await authClient.getAccessToken();

    const response = await httpsRequestWithCert({
      url,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`API request failed: ${response.statusCode} - ${response.body}`);
    }

    try {
      return JSON.parse(response.body) as T;
    } catch {
      throw new Error(`Failed to parse API response: ${response.body}`);
    }
  }

  async searchCompanies(query: string): Promise<SearchResultItem[]> {
    if (businessRegisterConfig.useMockData) {
      return this.getMockSearchResults();
    }

    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const cached = getCached<SearchResultItem[]>(cacheKey);
    if (cached) return cached;

    const data = await this.authenticatedRequest<SearchApiResponse>(
      API_PATHS.searchLegalEntities(query)
    );

    const results = data._embedded?.legalEntityList || [];
    setCache(cacheKey, results);
    return results;
  }

  async getLegalEntity(regcode: string): Promise<LegalEntityApiResponse> {
    if (businessRegisterConfig.useMockData) {
      return this.getMockLegalEntity(regcode);
    }

    const cacheKey = `entity:${regcode}`;
    const cached = getCached<LegalEntityApiResponse>(cacheKey);
    if (cached) return cached;

    const data = await this.authenticatedRequest<LegalEntityApiResponse>(
      API_PATHS.legalEntity(regcode)
    );

    setCache(cacheKey, data);
    return data;
  }

  // Mock data for development
  private getMockSearchResults(): SearchResultItem[] {
    return [
      {
        registrationNumber: '40003032949',
        currentName: 'Akciju sabiedrība "Latvenergo"',
        address: 'Pulkveža Brieža iela 12, Rīga, LV-1010',
        status: 'REGISTERED',
        register: 'COMMERCIAL',
        type: 'PUBLIC_LIMITED_COMPANY_AS',
        links: { self: '/legal-entity/40003032949' },
      },
      {
        registrationNumber: '40003575743',
        currentName: 'Sabiedrība ar ierobežotu atbildību "Tet"',
        address: 'Dzirnavu iela 105, Rīga, LV-1011',
        status: 'REGISTERED',
        register: 'COMMERCIAL',
        type: 'LIMITED_LIABILITY_COMPANY_SIA',
        links: { self: '/legal-entity/40003575743' },
      },
    ];
  }

  private getMockLegalEntity(regcode: string): LegalEntityApiResponse {
    return {
      registrationNumber: regcode,
      status: 'REGISTERED',
      register: 'COMMERCIAL',
      type: 'LIMITED_LIABILITY_COMPANY_SIA',
      legalName: `Mock Company ${regcode}`,
      isAnnulled: false,
      address: {
        addressComplete: 'Brīvības iela 12, Rīga, LV-1010',
        city: 'Rīga',
        postalCode: 'LV-1010',
      },
      links: {},
      officers: [
        {
          id: 1,
          naturalPerson: { name: 'Jānis Bērziņš' },
          position: 'BOARD_MEMBER',
          appointedOn: '2020-01-15',
          isAnnulled: false,
        },
      ],
    };
  }
}

export const httpClient = new HttpClient();
