import * as Sentry from '@sentry/nextjs';
import { env } from './env';

/**
 * Capture an exception with Sentry
 * @param error The error to capture
 * @param context Additional context to attach to the error
 */
export function captureException(error: unknown, context?: Record<string, any>) {
  // Only capture in production or when Sentry is configured
  if (!env.SENTRY_DSN && env.NODE_ENV !== 'production') {
    return;
  }

  Sentry.captureException(error, {
    tags: context,
  });
}

/**
 * Capture a message with Sentry
 * @param message The message to capture
 * @param level The severity level
 * @param context Additional context to attach to the message
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  // Only capture in production or when Sentry is configured
  if (!env.SENTRY_DSN && env.NODE_ENV !== 'production') {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    tags: context,
  });
}

/**
 * Set user context for Sentry
 * @param user User information
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb to Sentry
 * @param message The breadcrumb message
 * @param category The breadcrumb category
 * @param data Additional data
 */
export function addBreadcrumb(
  message: string,
  category: string = 'default',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}
