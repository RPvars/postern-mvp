/**
 * Safe enum translation with fallback to raw value.
 * Uses t.has() to check key existence before translating,
 * preventing next-intl from returning "MISSING: namespace.key" strings.
 */
export function translateEnum(
  t: { has: (key: string) => boolean; (key: string): string },
  key: string,
  fallback: string
): string {
  return t.has(key) ? t(key) : fallback;
}
