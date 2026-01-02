import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1,

  // Set profilesSampleRate to 1.0 to profile 100% of sampled transactions.
  // We recommend adjusting this value in production
  profilesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: process.env.NODE_ENV || 'development',

  // Ignore errors from specific files or patterns
  ignoreErrors: [
    // Browser errors
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
});
