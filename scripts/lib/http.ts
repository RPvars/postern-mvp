import https from 'https';
import http from 'http';

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; Posterns/1.0; +https://posterns.lv)';

/**
 * Fetch a URL with one redirect follow, timeout, and size limit.
 * Returns the response body as a string, or null on failure.
 */
export async function fetchUrl(
  url: string,
  options?: { timeout?: number; maxBytes?: number }
): Promise<string | null> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const maxBytes = options?.maxBytes ?? 100000;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout);
    const proto = url.startsWith('http://') ? http : https;

    const req = proto.get(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'text/html',
      },
      timeout,
    }, (res) => {
      // Follow one redirect
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timer);
        let redirectUrl: string;
        try {
          redirectUrl = new URL(res.headers.location, url).href;
        } catch {
          resolve(null);
          return;
        }
        const timer2 = setTimeout(() => resolve(null), timeout);
        const proto2 = redirectUrl.startsWith('http://') ? http : https;
        const req2 = proto2.get(redirectUrl, {
          headers: { 'User-Agent': DEFAULT_USER_AGENT },
          timeout,
        }, (res2) => {
          let body = '';
          res2.setEncoding('utf8');
          res2.on('data', (chunk) => { body += chunk; if (body.length > maxBytes) res2.destroy(); });
          res2.on('end', () => { clearTimeout(timer2); resolve(body); });
          res2.on('error', () => { clearTimeout(timer2); resolve(null); });
        });
        req2.on('error', () => { clearTimeout(timer2); resolve(null); });
        req2.on('timeout', () => { req2.destroy(); clearTimeout(timer2); resolve(null); });
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; if (body.length > maxBytes) res.destroy(); });
      res.on('end', () => { clearTimeout(timer); resolve(body); });
      res.on('error', () => { clearTimeout(timer); resolve(null); });
    });

    req.on('error', () => { clearTimeout(timer); resolve(null); });
    req.on('timeout', () => { req.destroy(); clearTimeout(timer); resolve(null); });
  });
}

/**
 * Run async tasks with bounded concurrency using a thread-safe queue.
 * Each worker atomically claims the next item via a synchronized counter.
 */
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items]; // Copy to avoid mutation
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (true) {
      const item = queue.shift(); // Atomic in single-threaded JS event loop
      if (item === undefined) break;
      await fn(item);
    }
  });
  await Promise.all(workers);
}
