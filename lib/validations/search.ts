import { z } from 'zod';
import { APP_CONFIG } from '@/lib/config';

/**
 * Search query validation schema
 * Prevents injection attacks and malicious input
 */
export const searchQuerySchema = z
  .string()
  .min(APP_CONFIG.search.minQueryLength, `Search query must be at least ${APP_CONFIG.search.minQueryLength} characters`)
  .max(APP_CONFIG.search.maxQueryLength, `Search query cannot exceed ${APP_CONFIG.search.maxQueryLength} characters`)
  .trim()
  .transform((val) => {
    // Remove potentially dangerous characters but allow Latvian diacritics
    // Allow: letters (including Latvian), numbers, spaces, basic punctuation
    return val.replace(/[^a-zA-ZāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ0-9\s\-.,&()]/g, '');
  })
  .refine(
    (val) => val.length >= APP_CONFIG.search.minQueryLength,
    { message: `Search query too short after sanitization` }
  );

/**
 * Company ID validation schema (UUID format)
 */
export const companyIdSchema = z
  .string()
  .uuid('Invalid company ID format');

/**
 * Company ID array validation schema
 * Used for batch operations and comparison
 */
export const companyIdsSchema = z
  .array(companyIdSchema)
  .min(1, 'At least one company ID required')
  .max(APP_CONFIG.comparison.maxBatchFetch, `Maximum ${APP_CONFIG.comparison.maxBatchFetch} companies allowed`);

/**
 * Comparison validation schema
 */
export const comparisonSchema = z.object({
  companyIds: z
    .array(companyIdSchema)
    .min(APP_CONFIG.comparison.minCompanies, `At least ${APP_CONFIG.comparison.minCompanies} companies required for comparison`)
    .max(APP_CONFIG.comparison.maxCompanies, `Maximum ${APP_CONFIG.comparison.maxCompanies} companies allowed for comparison`),
});

/**
 * Helper to safely parse and validate search query
 */
export function validateSearchQuery(query: unknown): { success: true; data: string } | { success: false; error: string } {
  const result = searchQuerySchema.safeParse(query);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.errors[0]?.message || 'Invalid search query',
  };
}

/**
 * Helper to safely parse and validate company IDs
 */
export function validateCompanyIds(ids: unknown): { success: true; data: string[] } | { success: false; error: string } {
  const result = companyIdsSchema.safeParse(ids);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.errors[0]?.message || 'Invalid company IDs',
  };
}
