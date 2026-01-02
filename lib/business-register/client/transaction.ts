import { randomUUID } from 'crypto';

export class TransactionManager {
  generateTransactionId(): string {
    // Format: UUID v4 without hyphens (as per API docs)
    return randomUUID().replace(/-/g, '');
  }

  createTransactionHeaders(transactionId: string) {
    return {
      'X-Transaction-ID': transactionId,
      'Content-Type': 'application/json',
    };
  }
}

export const transactionManager = new TransactionManager();
