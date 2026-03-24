import { prisma } from '@/lib/prisma';
import { fetchUrl, runWithConcurrency } from './lib/http';

const HTTP_CONCURRENCY = 10;

// Junk email domains to ignore
const JUNK_DOMAINS = new Set([
  'example.com', 'test.com', 'localhost', 'sentry.io',
  'wixpress.com', 'googletagmanager.com', 'google.com',
  'facebook.com', 'twitter.com', 'schema.org', 'w3.org',
  'wordpress.org', 'wordpress.com', 'gravatar.com',
  'cloudflare.com', 'jsdelivr.net', 'googleapis.com',
]);

// Generic prefixes that represent company contact (not personal)
const GENERIC_PREFIXES = [
  'info', 'office', 'kontakti', 'contact', 'hello', 'birojs',
  'sales', 'admin', 'support', 'help', 'pasutijumi', 'orders',
  'sekretare', 'reception', 'noliktava', 'warehouse',
  'marketing', 'hr', 'finance', 'accounting', 'inkasso',
  'service', 'serviss', 'helpdesk', 'ofiss',
  'riga', 'jelgava', 'liepaja', 'daugavpils', 'ventspils',
  'kauguri', 'valmiera', 'rezekne', 'jurmala', 'ogre',
];

function isPersonalEmail(prefix: string): boolean {
  // Pattern: firstname.lastname@ or firstname_lastname@
  return /^[a-z]+[._][a-z]+$/.test(prefix);
}

function extractEmail(html: string, websiteDomain: string | null): string | null {
  // First try mailto: links (higher quality)
  const mailtoMatches = html.match(/href=["']mailto:([^"'?]+)/gi);
  const mailtoEmails = (mailtoMatches || [])
    .map(m => m.replace(/href=["']mailto:/i, '').split(/[?&]/)[0].toLowerCase().trim())
    .filter(e => isValidEmail(e));

  // Then try general email regex
  const generalMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  const generalEmails = (generalMatches || [])
    .map(e => e.toLowerCase())
    .filter(e => isValidEmail(e));

  let allEmails = [...new Set([...mailtoEmails, ...generalEmails])];
  if (allEmails.length === 0) return null;

  // Filter: email domain must match website domain
  if (websiteDomain) {
    const siteDomain = websiteDomain.replace(/^www\./, '');
    allEmails = allEmails.filter(e => {
      const emailDomain = e.split('@')[1];
      return emailDomain === siteDomain || emailDomain.endsWith('.' + siteDomain);
    });
    if (allEmails.length === 0) return null;
  }

  // Filter out personal emails, keep only generic
  const genericEmails = allEmails.filter(e => {
    const prefix = e.split('@')[0];
    if (GENERIC_PREFIXES.some(gp => prefix.startsWith(gp))) return true;
    if (isPersonalEmail(prefix)) return false;
    return true; // Unknown single-word prefix — keep but lower priority
  });

  if (genericEmails.length === 0) return null;

  // Sort by preference (known generic prefixes first)
  genericEmails.sort((a, b) => {
    const prefixA = a.split('@')[0];
    const prefixB = b.split('@')[0];
    const idxA = GENERIC_PREFIXES.findIndex(p => prefixA.startsWith(p));
    const idxB = GENERIC_PREFIXES.findIndex(p => prefixB.startsWith(p));
    const scoreA = idxA >= 0 ? idxA : 100;
    const scoreB = idxB >= 0 ? idxB : 100;
    return scoreA - scoreB;
  });

  return genericEmails[0];
}

function isValidEmail(email: string): boolean {
  const domain = email.split('@')[1];
  if (!domain) return false;
  if (JUNK_DOMAINS.has(domain)) return false;
  // Skip image/file extensions mistaken as emails
  if (/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(domain)) return false;
  // Skip very long emails (likely encoded strings)
  if (email.length > 60) return false;
  return true;
}

function extractPhone(html: string): string | null {
  // First try tel: links (highest quality)
  const telMatches = html.match(/href=["']tel:([^"']+)/gi);
  const telPhones = (telMatches || [])
    .map(m => m.replace(/href=["']tel:/i, '').replace(/\s/g, ''))
    .filter(p => isLatvianPhone(p))
    .map(normalizePhone);

  if (telPhones.length > 0) return telPhones[0];

  // General phone regex for Latvian numbers
  const phoneMatches = html.match(/\+?371[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{3}/g);
  const phones = (phoneMatches || [])
    .map(normalizePhone)
    .filter((p): p is string => p !== null);

  return phones.length > 0 ? phones[0] : null;
}

function isLatvianPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  // Must be 371 + 8 digits
  return /^371\d{8}$/.test(digits);
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  // Extract 371XXXXXXXX
  const match = digits.match(/371(\d{8})/);
  if (!match) return null;
  const num = match[1];
  return `+371 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const forceAll = args.includes('--force');

  console.log(`📇 Contact enrichment — dry-run: ${dryRun}, force: ${forceAll}`);

  // Get companies with website but missing contacts
  const companies = await prisma.company.findMany({
    where: forceAll
      ? { website: { not: null } }
      : { website: { not: null }, OR: [{ email: null }, { phone: null }] },
    select: { registrationNumber: true, name: true, website: true, email: true, phone: true },
  });

  console.log(`📋 Processing ${companies.length} companies with websites...`);

  let processed = 0;
  let emailsFound = 0;
  let phonesFound = 0;

  await runWithConcurrency(companies, HTTP_CONCURRENCY, async (company) => {
    if (!company.website) return;

    const html = await fetchUrl(company.website);
    if (!html) {
      processed++;
      return;
    }

    const updates: { email?: string; phone?: string } = {};
    let websiteDomain: string | null = null;
    try {
      websiteDomain = new URL(company.website!).hostname.replace(/^www\./, '');
    } catch { /* ignore */ }

    if (!company.email || forceAll) {
      const email = extractEmail(html, websiteDomain);
      if (email) {
        updates.email = email;
        emailsFound++;
      }
    }

    if (!company.phone || forceAll) {
      const phone = extractPhone(html);
      if (phone) {
        updates.phone = phone;
        phonesFound++;
      }
    }

    if (Object.keys(updates).length > 0) {
      const parts = [];
      if (updates.email) parts.push(`📧 ${updates.email}`);
      if (updates.phone) parts.push(`📞 ${updates.phone}`);
      console.log(`  ✅ ${company.name} → ${parts.join('  ')}`);

      if (!dryRun) {
        await prisma.company.update({
          where: { registrationNumber: company.registrationNumber },
          data: updates,
        });
      }
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`📊 Progress: ${processed}/${companies.length} — emails: ${emailsFound}, phones: ${phonesFound}`);
    }
  });

  console.log(`\n✨ Done! Processed: ${processed}, Emails: ${emailsFound}, Phones: ${phonesFound}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
