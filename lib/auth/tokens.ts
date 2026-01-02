import crypto from 'crypto';

export const TOKEN_EXPIRY = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
} as const;

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getTokenExpiry(type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Date {
  return new Date(Date.now() + TOKEN_EXPIRY[type]);
}
