import { authClient } from './auth';
import { transactionManager } from './transaction';
import { businessRegisterConfig } from '../config';
import type { CompanyApiResponse, BoardMemberApiResponse, SearchApiResponse } from '../types/api-responses';

export class HttpClient {
  private baseUrl = 'https://api.ur.gov.lv/v1'; // Placeholder - update with real URL from API docs

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Return mock data if enabled
    if (businessRegisterConfig.useMockData) {
      return this.getMockData<T>(endpoint);
    }

    const token = await authClient.getAccessToken();
    const transactionId = transactionManager.generateTransactionId();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        ...transactionManager.createTransactionHeaders(transactionId),
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  private getMockData<T>(endpoint: string): Promise<T> {
    // Parse endpoint to determine what mock data to return

    // Company detail: /companies/{regcode}
    if (endpoint.match(/^\/companies\/\d+$/)) {
      const regcode = endpoint.split('/')[2];
      return Promise.resolve({
        regcode,
        name: `Mock Company ${regcode}`,
        address: 'Rīga, Brīvības iela 12, LV-1010',
        legalForm: 'SIA',
        status: 'Reģistrēts',
        registrationDate: '2020-01-15',
        taxNumber: `LV${regcode}`,
      } as T);
    }

    // Search: /companies/search?q=...
    if (endpoint.startsWith('/companies/search')) {
      const searchApiResponse: SearchApiResponse = {
        companies: [
          {
            regcode: '40003123456',
            name: 'Mock Company 1',
            address: 'Rīga, Brīvības iela 12, LV-1010',
            legalForm: 'SIA',
            status: 'Reģistrēts',
            registrationDate: '2020-01-15',
            taxNumber: 'LV40003123456',
          },
          {
            regcode: '40003654321',
            name: 'Mock Company 2',
            address: 'Rīga, Elizabetes iela 45, LV-1011',
            legalForm: 'AS',
            status: 'Reģistrēts',
            registrationDate: '2018-05-20',
            taxNumber: 'LV40003654321',
          },
        ],
        totalResults: 2,
      };
      return Promise.resolve(searchApiResponse as T);
    }

    // Board members: /companies/{regcode}/board-members
    if (endpoint.match(/^\/companies\/\d+\/board-members$/)) {
      const boardMembers: BoardMemberApiResponse[] = [
        {
          name: 'Jānis Bērziņš',
          personalCode: '123456-12345',
          position: 'Valdes loceklis',
          appointedDate: '2020-01-15',
          isHistorical: false,
        },
        {
          name: 'Anna Kalna',
          personalCode: '234567-23456',
          position: 'Valdes priekšsēdētājs',
          appointedDate: '2020-01-15',
          isHistorical: false,
        },
      ];
      return Promise.resolve(boardMembers as T);
    }

    // Default: throw error for unknown endpoints
    throw new Error(`Mock data not implemented for endpoint: ${endpoint}`);
  }
}

export const httpClient = new HttpClient();
