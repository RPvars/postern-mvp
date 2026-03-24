import { prisma } from '@/lib/prisma';
import dns from 'dns';
import { promisify } from 'util';
import https from 'https';
import http from 'http';

const resolve4 = promisify(dns.resolve4);

// Config
const DNS_CONCURRENCY = 20;
const HTTP_CONCURRENCY = 10;
const HTTP_TIMEOUT = 8000;
const DEFAULT_LIMIT = 10000;
const BATCH_SIZE = 100;

// Legal form prefixes to strip from company names
const LEGAL_FORMS = [
  'sabiedrība ar ierobežotu atbildību',
  'akciju sabiedrība',
  'sia', 'as', 'ik', 'zs', 'ks', 'ps',
  'vsia', 'valsts sia',
  'individuālais komersants',
  'zemnieku saimniecība',
  'kooperatīvā sabiedrība',
  'pilnsabiedrība',
];

function cleanCompanyName(name: string): string {
  let cleaned = name.toLowerCase().trim();
  // Remove quotes
  cleaned = cleaned.replace(/["""''„"«»]/g, '');
  // Remove legal form
  for (const form of LEGAL_FORMS) {
    cleaned = cleaned.replace(new RegExp(`^${form}\\s+`, 'i'), '');
    cleaned = cleaned.replace(new RegExp(`\\s+${form}$`, 'i'), '');
    cleaned = cleaned.replace(new RegExp(`\\s*,\\s*${form}$`, 'i'), '');
  }
  // Transliterate common Latvian chars
  cleaned = cleaned
    .replace(/ā/g, 'a').replace(/č/g, 'c').replace(/ē/g, 'e')
    .replace(/ģ/g, 'g').replace(/ī/g, 'i').replace(/ķ/g, 'k')
    .replace(/ļ/g, 'l').replace(/ņ/g, 'n').replace(/š/g, 's')
    .replace(/ū/g, 'u').replace(/ž/g, 'z');
  return cleaned.trim();
}

function generateDomainCandidates(companyName: string): string[] {
  const cleaned = cleanCompanyName(companyName);
  if (!cleaned || cleaned.length < 2) return [];

  // Remove special chars, split into words
  const alphaOnly = cleaned.replace(/[^a-z0-9\s-]/g, '').trim();
  const words = alphaOnly.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  const candidates = new Set<string>();

  // Full name joined: "rimi latvia" → "rimilatvia"
  const joined = words.join('');
  // Full name hyphenated: "rimi-latvia"
  const hyphenated = words.join('-');
  // First word only: "rimi"
  const first = words[0];

  // .lv domains (most common for Latvian companies)
  if (joined.length >= 2) candidates.add(`${joined}.lv`);
  if (words.length > 1 && hyphenated.length >= 2) candidates.add(`${hyphenated}.lv`);
  if (first.length >= 3 && first !== joined) candidates.add(`${first}.lv`);

  // .com domains (international companies)
  if (joined.length >= 2) candidates.add(`${joined}.com`);
  if (first.length >= 3 && first !== joined) candidates.add(`${first}.com`);

  // .eu for some companies
  if (joined.length >= 2) candidates.add(`${joined}.eu`);

  return [...candidates];
}

async function checkDNS(domain: string): Promise<boolean> {
  try {
    await resolve4(domain);
    return true;
  } catch {
    return false;
  }
}

async function fetchHomepage(domain: string): Promise<string | null> {
  const url = `https://${domain}`;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), HTTP_TIMEOUT);

    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Posterns/1.0; +https://posterns.lv)',
        'Accept': 'text/html',
      },
      timeout: HTTP_TIMEOUT,
    }, (res) => {
      // Follow one redirect
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timeout);
        const rawLocation = res.headers.location;
        let redirectUrl: string;
        try {
          redirectUrl = new URL(rawLocation, `https://${domain}`).href;
        } catch {
          clearTimeout(timeout);
          resolve(null);
          return;
        }
        const proto = redirectUrl.startsWith('http://') ? http : https;
        const timeout2 = setTimeout(() => resolve(null), HTTP_TIMEOUT);
        const req2 = proto.get(redirectUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Posterns/1.0)' },
          timeout: HTTP_TIMEOUT,
        }, (res2) => {
          let body = '';
          res2.setEncoding('utf8');
          res2.on('data', (chunk) => {
            body += chunk;
            // Only read first 50KB
            if (body.length > 50000) res2.destroy();
          });
          res2.on('end', () => { clearTimeout(timeout2); resolve(body); });
          res2.on('error', () => { clearTimeout(timeout2); resolve(null); });
        });
        req2.on('error', () => { clearTimeout(timeout2); resolve(null); });
        req2.on('timeout', () => { req2.destroy(); clearTimeout(timeout2); resolve(null); });
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
        if (body.length > 50000) res.destroy();
      });
      res.on('end', () => { clearTimeout(timeout); resolve(body); });
      res.on('error', () => { clearTimeout(timeout); resolve(null); });
    });

    req.on('error', () => { clearTimeout(timeout); resolve(null); });
    req.on('timeout', () => { req.destroy(); clearTimeout(timeout); resolve(null); });
  });
}

type VerifyResult = { confidence: 'high' | 'medium' | 'none' };

function verifyHomepage(html: string, registrationNumber: string, companyName: string): VerifyResult {
  const lowerHtml = html.toLowerCase();

  // High confidence: registration number found in HTML
  if (html.includes(registrationNumber)) return { confidence: 'high' };

  // High confidence: formatted reg number (40003053029 → 4000 3053 029)
  const formatted = registrationNumber.replace(/(\d{4})(\d{4})(\d{3})/, '$1 $2 $3');
  if (html.includes(formatted)) return { confidence: 'high' };

  // Medium confidence: company name found in HTML (cleaned, without legal form)
  const cleaned = cleanCompanyName(companyName);
  if (cleaned.length >= 5 && lowerHtml.includes(cleaned)) return { confidence: 'medium' };

  // Medium confidence: original name (with Latvian chars) in HTML
  let originalCleaned = companyName.toLowerCase().replace(/["""''„"«»]/g, '');
  for (const form of LEGAL_FORMS) {
    originalCleaned = originalCleaned.replace(new RegExp(`^${form}\\s+`, 'i'), '');
    originalCleaned = originalCleaned.replace(new RegExp(`\\s+${form}$`, 'i'), '');
    originalCleaned = originalCleaned.replace(new RegExp(`\\s*,\\s*${form}$`, 'i'), '');
  }
  originalCleaned = originalCleaned.trim();
  if (originalCleaned.length >= 5 && lowerHtml.includes(originalCleaned)) return { confidence: 'medium' };

  return { confidence: 'none' };
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : DEFAULT_LIMIT;
  const dryRun = args.includes('--dry-run');

  console.log(`🔍 Website enrichment — limit: ${limit}, dry-run: ${dryRun}`);

  // Get companies without website, ordered by tax payments (most important first)
  const companies = await prisma.$queryRawUnsafe<Array<{
    registrationNumber: string;
    name: string;
  }>>(`
    SELECT c.registrationNumber, c.name
    FROM Company c
    LEFT JOIN (
      SELECT registrationNumber, SUM(amount) as totalTax
      FROM TaxPayment
      GROUP BY registrationNumber
    ) tp ON c.registrationNumber = tp.registrationNumber
    WHERE c.website IS NULL
      AND c.status = 'REGISTERED'
    ORDER BY tp.totalTax DESC NULLS LAST
    LIMIT ?
  `, limit);

  console.log(`📋 Processing ${companies.length} companies...`);

  let processed = 0;
  let found = 0;
  let dnsHits = 0;

  // Process in batches
  for (let batchStart = 0; batchStart < companies.length; batchStart += BATCH_SIZE) {
    const batch = companies.slice(batchStart, batchStart + BATCH_SIZE);

    // Step 1: Generate candidates + DNS check
    const dnsResults: Array<{ company: typeof companies[0]; domain: string }> = [];

    const allCandidates = batch.flatMap(company => {
      const domains = generateDomainCandidates(company.name);
      return domains.map(domain => ({ company, domain }));
    });

    await runWithConcurrency(allCandidates, DNS_CONCURRENCY, async (item) => {
      const exists = await checkDNS(item.domain);
      if (exists) {
        dnsResults.push(item);
        dnsHits++;
      }
    });

    // Step 2: Verify homepage (only for DNS-resolved domains)
    // Group by company to avoid duplicate fetches
    const byCompany = new Map<string, string[]>();
    for (const r of dnsResults) {
      const existing = byCompany.get(r.company.registrationNumber) || [];
      existing.push(r.domain);
      byCompany.set(r.company.registrationNumber, existing);
    }

    const verifyTasks = [...byCompany.entries()].map(([regNum, domains]) => ({
      regNum,
      domains,
      company: batch.find(c => c.registrationNumber === regNum)!,
    }));

    await runWithConcurrency(verifyTasks, HTTP_CONCURRENCY, async (task) => {
      let bestMatch: { domain: string; confidence: 'high' | 'medium' } | null = null;

      for (const domain of task.domains) {
        const html = await fetchHomepage(domain);
        if (!html) continue;

        const result = verifyHomepage(html, task.regNum, task.company.name);
        if (result.confidence === 'high') {
          bestMatch = { domain, confidence: 'high' };
          break; // High confidence — no need to check more
        }
        if (result.confidence === 'medium' && !bestMatch) {
          bestMatch = { domain, confidence: 'medium' };
          // Continue checking — maybe a high-confidence match exists
        }
      }

      if (bestMatch) {
        const website = `https://${bestMatch.domain}`;
        if (!dryRun) {
          await prisma.company.update({
            where: { registrationNumber: task.regNum },
            data: { website, websiteVerifiedAt: new Date() },
          });
        }
        found++;
        const tag = bestMatch.confidence === 'high' ? '✅' : '⚠️';
        console.log(`  ${tag} ${task.company.name} → ${website} [${bestMatch.confidence}]`);
      }
    });

    processed += batch.length;
    const pct = ((processed / companies.length) * 100).toFixed(1);
    console.log(`📊 Progress: ${processed}/${companies.length} (${pct}%) — DNS: ${dnsHits}, verified: ${found}`);
  }

  console.log(`\n✨ Done! Processed: ${processed}, Found: ${found} websites (${((found / processed) * 100).toFixed(1)}%)`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
