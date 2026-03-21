/**
 * Normalize a name for search: lowercase, remove diacritics, trim.
 * "Bērziņš Jānis" → "berzins janis"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
    .replace(/[^a-z0-9\s]/g, '')    // Keep only alphanumeric + spaces
    .replace(/\s+/g, ' ')
    .trim();
}
