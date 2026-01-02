/**
 * Centralized Application Configuration
 * All magic numbers and configuration values should be defined here
 */

export const APP_CONFIG = {
  /**
   * Application metadata
   */
  app: {
    name: 'Posterns',
    brandColor: '#FEC200', // Posterns yellow
  },

  /**
   * Search configuration
   */
  search: {
    /** Maximum results to return to client */
    maxResults: 10,
    /** Maximum companies to fetch from database for filtering */
    dbQueryLimit: 50,
    /** Minimum query length before triggering search */
    minQueryLength: 2,
    /** Debounce delay in milliseconds */
    debounceMs: 300,
    /** Maximum query length to prevent abuse */
    maxQueryLength: 100,
  },

  /**
   * Company comparison configuration
   */
  comparison: {
    /** Minimum companies required for comparison */
    minCompanies: 2,
    /** Maximum companies allowed for comparison */
    maxCompanies: 5,
    /** Maximum batch fetch limit */
    maxBatchFetch: 10,
    /** Color palette for comparison charts */
    colors: {
      primary: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      secondary: ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'],
    },
  },

  /**
   * Rate limiting configuration
   */
  rateLimit: {
    /** Cleanup interval for stale entries (5 minutes) */
    cleanupInterval: 5 * 60 * 1000,
    /** Maximum map size before eviction */
    maxMapSize: 10000,
    /** Maximum window for cleanup (1 minute) */
    maxWindowMs: 60000,
    /** Rate limits for different endpoints */
    endpoints: {
      search: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
      companyDetail: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
      compare: { maxRequests: 15, windowMs: 60000 }, // 15 per minute
      batch: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
      auth: {
        login: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
        register: { maxRequests: 3, windowMs: 60000 }, // 3 per minute
        forgotPassword: { maxRequests: 3, windowMs: 60000 }, // 3 per minute
        verifyEmail: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
        resendVerification: { maxRequests: 2, windowMs: 60000 }, // 2 per minute
      },
    },
  },

  /**
   * Authentication configuration
   */
  auth: {
    /** Password minimum length */
    passwordMinLength: 8,
    /** Email verification token expiry (24 hours) */
    emailTokenExpiry: 24 * 60 * 60 * 1000,
    /** Password reset token expiry (1 hour) */
    passwordResetTokenExpiry: 60 * 60 * 1000,
    /** bcrypt salt rounds */
    bcryptSaltRounds: 12,
  },

  /**
   * Pagination configuration
   */
  pagination: {
    /** Default page size */
    defaultPageSize: 20,
    /** Maximum page size */
    maxPageSize: 100,
  },

  /**
   * Chart configuration
   */
  charts: {
    /** Default animation duration */
    animationDuration: 300,
    /** Grid line color */
    gridColor: 'rgba(0, 0, 0, 0.1)',
  },
} as const;

/**
 * Type-safe configuration access helper
 */
export type AppConfig = typeof APP_CONFIG;
