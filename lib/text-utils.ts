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

/**
 * Normalize a Latvian address for matching: lowercase, remove quotes,
 * strip postal codes, sort parts alphabetically so different orderings match.
 * "Rēznas iela 9A, Rīga, LV-1019" → "rīga, rēznas iela 9a"
 * "Rīga, Rēznas iela 9A"           → "rīga, rēznas iela 9a"
 */
export function normalizeAddress(address: string): string {
  const cleaned = address
    .toLowerCase()
    .replace(/[""\u201C\u201D]/g, '');

  const parts = cleaned
    .split(',')
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p && !/^lv-?\d{4}$/i.test(p));  // Remove postal codes (LV-1019)

  parts.sort();
  return parts.join(', ');
}

const LEGAL_FORM_ABBREVIATIONS: [RegExp, string][] = [
  [/Sabiedrība ar ierobežotu atbildību/gi, 'SIA'],
  [/Akciju sabiedrība/gi, 'AS'],
];

/**
 * Replace full legal form names with abbreviations.
 * "Sabiedrība ar ierobežotu atbildību "Piche"" → "SIA "Piche""
 */
export function abbreviateLegalForm(name: string): string {
  let result = name;
  for (const [pattern, abbr] of LEGAL_FORM_ABBREVIATIONS) {
    result = result.replace(pattern, abbr);
  }
  return result;
}

const LEGAL_FORMS = ['SIA', 'AS'];

function stripQuotes(s: string): string {
  return s.replace(/[""\u201C\u201D]/g, '').trim();
}

/**
 * Format company name for display: move legal form to end after comma, strip quotes.
 * 'SIA "Piche"' → 'Piche, SIA'
 * 'Akciju sabiedrība "UPB"' → 'UPB, AS'
 * '"Foo" SIA' → 'Foo, SIA'
 * 'SIA Connecto Latvija' → 'Connecto Latvija, SIA'
 * 'Pillar Contractor, SIA' → 'Pillar Contractor, SIA' (already correct)
 */
export function formatCompanyDisplayName(name: string): string {
  let result = abbreviateLegalForm(name);

  for (const form of LEGAL_FORMS) {
    // Already in "Name, FORM" format
    if (result.endsWith(`, ${form}`)) return result;

    // Pattern: 'FORM "Name"' or 'FORM Name'
    const prefixMatch = new RegExp(`^${form}\\s+(.+)$`, 'i').exec(result);
    if (prefixMatch) {
      const companyName = stripQuotes(prefixMatch[1]);
      return `${companyName}, ${form}`;
    }

    // Pattern: '"Name" FORM'
    const suffixMatch = new RegExp(`^(.+?)\\s+${form}$`, 'i').exec(result);
    if (suffixMatch) {
      const companyName = stripQuotes(suffixMatch[1]);
      return `${companyName}, ${form}`;
    }
  }

  // No legal form found — just strip outer quotes
  return stripQuotes(result);
}
