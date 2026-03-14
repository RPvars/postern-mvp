import { randomUUID } from 'crypto';
import { businessRegisterConfig } from '../config';
import { httpsRequestWithCert } from './https-util';

export class TransactionManager {
  generateTransactionId(): string {
    return randomUUID().replace(/-/g, '');
  }

  createTransactionHeaders(transactionId: string) {
    return {
      'X-Transaction-ID': transactionId,
      'Content-Type': 'application/json',
    };
  }

  async pingpong(): Promise<{ success: boolean; body: string }> {
    try {
      const response = await httpsRequestWithCert({
        url: businessRegisterConfig.pingpongUrl,
        method: 'GET',
      });
      return {
        success: response.statusCode >= 200 && response.statusCode < 300,
        body: response.body,
      };
    } catch (error) {
      return {
        success: false,
        body: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createTransaction(token: string): Promise<{ transactionId: string; response: string }> {
    if (businessRegisterConfig.useMockData) {
      const mockId = this.generateTransactionId();
      return { transactionId: mockId, response: 'MOCK_TRANSACTION' };
    }

    const transactionId = this.generateTransactionId();

    const body = JSON.stringify({
      eServiceId: businessRegisterConfig.eServiceId,
      transactionId,
    });

    const response = await httpsRequestWithCert({
      url: businessRegisterConfig.transactionApiUrl,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(
        `Transaction creation failed: ${response.statusCode} - ${response.body}`
      );
    }

    return { transactionId, response: response.body };
  }
}

export const transactionManager = new TransactionManager();
