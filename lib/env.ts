import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  AUTH_TRUST_HOST: z.string().optional(),

  // Google OAuth (optional)
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email'),

  // Business Register API (optional for now - mock mode available)
  BR_AUTH_URL: z.string().url().optional(),
  BR_CONSUMER_KEY: z.string().optional(),
  BR_CONSUMER_SECRET: z.string().optional(),
  BR_CERTIFICATE_PATH: z.string().optional(),
  BR_CERTIFICATE_PASSWORD: z.string().optional(),
  BR_USE_MOCK_DATA: z.string().optional(),

  // Feature flags
  SITE_ENABLED: z.string().optional().default('true'),

  // Cron jobs
  CRON_SECRET: z.string().optional(),

  // Error monitoring (Sentry)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n');

      console.error('❌ Environment validation failed:\n');
      console.error(missingVars);
      console.error('\nPlease check your .env file and ensure all required variables are set.');

      process.exit(1);
    }
    throw error;
  }
}

// Validate environment variables at module load time
export const env = validateEnv();

// Helper to check if Google OAuth is configured
export const isGoogleOAuthEnabled = () => {
  return !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
};

// Helper to check if Business Register API is configured
export const isBusinessRegisterEnabled = () => {
  return env.BR_USE_MOCK_DATA !== 'true' &&
         !!(env.BR_CONSUMER_KEY && env.BR_CONSUMER_SECRET && env.BR_CERTIFICATE_PATH);
};
