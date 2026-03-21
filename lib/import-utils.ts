import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import https from 'https';
import path from 'path';

interface DownloadOptions {
  /** Disable SSL certificate verification (for servers with known cert issues) */
  rejectUnauthorized?: boolean;
}

/**
 * Download a file from a URL with redirect following.
 * Saves to `data/<filename>` in the project root.
 */
export async function downloadCSV(url: string, filename: string, options?: DownloadOptions): Promise<string> {
  const localPath = path.join(process.cwd(), 'data', filename);
  const { mkdirSync, existsSync } = await import('fs');
  const dir = path.dirname(localPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const requestOptions = options?.rejectUnauthorized === false ? { rejectUnauthorized: false } : {};

  return new Promise((resolve, reject) => {
    const follow = (href: string, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const parsed = new URL(href);
      https.get(
        { hostname: parsed.hostname, path: parsed.pathname + parsed.search, ...requestOptions },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return follow(res.headers.location, redirects + 1);
          }
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
          const file = createWriteStream(localPath);
          pipeline(res, file).then(() => resolve(localPath)).catch(reject);
        }
      ).on('error', reject);
    };
    follow(url);
  });
}

/**
 * Parse a comma-separated CSV line with quoted field support.
 * Handles escaped quotes ("") inside quoted fields.
 */
export function parseCSVLine(line: string, delimiter = ','): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// Re-export from text-utils for backward compatibility
export { normalizeName } from './text-utils';

/**
 * Parse a Latvian date string (DD.MM.YYYY) to Date object.
 */
export function parseLvDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('.');
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return isNaN(d.getTime()) ? null : d;
}
