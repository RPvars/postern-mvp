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
  BR_CERTIFICATE_BASE64: z.string().optional(),
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
}).superRefine((data, ctx) => {
  if (data.NODE_ENV !== 'production') return;
  // `next build` boots Node with NODE_ENV=production but doesn't actually
  // need runtime secrets — skip strict validation during the build phase.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  // Production-only requirements: a missing CRON_SECRET silently disables
  // the cron auth check, so we hard-fail boot instead of shipping it open.
  if (!data.CRON_SECRET || data.CRON_SECRET.length < 16) {
    ctx.addIssue({
      code: 'custom',
      path: ['CRON_SECRET'],
      message: 'CRON_SECRET must be set (16+ chars) in production',
    });
  }

  const useMock = data.BR_USE_MOCK_DATA === 'true';
  if (!useMock) {
    const hasPath = !!data.BR_CERTIFICATE_PATH;
    const hasBase64 = !!data.BR_CERTIFICATE_BASE64;
    if (!hasPath && !hasBase64) {
      ctx.addIssue({
        code: 'custom',
        path: ['BR_CERTIFICATE_PATH'],
        message: 'BR_CERTIFICATE_PATH or BR_CERTIFICATE_BASE64 required when BR_USE_MOCK_DATA is not "true"',
      });
    }
    if (!data.BR_CERTIFICATE_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        path: ['BR_CERTIFICATE_PASSWORD'],
        message: 'BR_CERTIFICATE_PASSWORD required when BR_USE_MOCK_DATA is not "true"',
      });
    }
    if (!data.BR_CONSUMER_KEY || !data.BR_CONSUMER_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['BR_CONSUMER_KEY'],
        message: 'BR_CONSUMER_KEY and BR_CONSUMER_SECRET required when BR_USE_MOCK_DATA is not "true"',
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err: z.ZodIssue) => `  - ${err.path.join('.')}: ${err.message}`).join('\n');

      console.error('❌ Environment validation failed:\n');
      console.error(missingVars);
      console.error('\nPlease check your .env file and ensure all required variables are set.');
    }
    throw error;
  }
}

export const env = validateEnv();

export const isGoogleOAuthEnabled = () => {
  return !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
};

export const isBusinessRegisterEnabled = () => {
  return env.BR_USE_MOCK_DATA !== 'true' &&
         !!(env.BR_CONSUMER_KEY && env.BR_CONSUMER_SECRET) &&
         !!(env.BR_CERTIFICATE_PATH || env.BR_CERTIFICATE_BASE64);
};
