interface RateLimitRecord {
  count: number;
  lastReset: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Configuration
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_MAP_SIZE = 10000; // Maximum number of entries to prevent memory bloat
const MAX_WINDOW_MS = 60000; // 1 minute - maximum window for cleanup

// Automatic cleanup with setInterval (runs regardless of traffic)
function startPeriodicCleanup() {
  setInterval(() => {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, record] of rateLimitMap.entries()) {
      // Delete entries older than the maximum window
      if (now - record.lastReset > MAX_WINDOW_MS) {
        rateLimitMap.delete(key);
        deletedCount++;
      }
    }

    if (process.env.NODE_ENV === 'development' && deletedCount > 0) {
      console.log(`[RateLimit] Cleaned up ${deletedCount} stale entries. Current size: ${rateLimitMap.size}`);
    }
  }, CLEANUP_INTERVAL);
}

// Start cleanup on module load (only in Node.js environment, not during build)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  startPeriodicCleanup();
}

// Evict oldest entries if we hit the size limit
function evictOldestIfNeeded() {
  if (rateLimitMap.size < MAX_MAP_SIZE) return;

  // Find the oldest entry
  let oldestKey: string | null = null;
  let oldestTime = Date.now();

  for (const [key, record] of rateLimitMap.entries()) {
    if (record.lastReset < oldestTime) {
      oldestTime = record.lastReset;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    rateLimitMap.delete(oldestKey);
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

export function rateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): RateLimitResult {
  // Check if we need to evict old entries to prevent memory bloat
  evictOldestIfNeeded();

  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now - record.lastReset > windowMs) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now });
    return { success: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (record.count >= maxRequests) {
    const resetIn = windowMs - (now - record.lastReset);
    return { success: false, remaining: 0, resetIn };
  }

  record.count++;
  return {
    success: true,
    remaining: maxRequests - record.count,
    resetIn: windowMs - (now - record.lastReset),
  };
}

// Helper to get identifier from request
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

// Pre-configured rate limiters for different endpoints
export const authRateLimiter = {
  login: (identifier: string) => rateLimit(`login:${identifier}`, 5, 60000), // 5 per minute
  register: (identifier: string) => rateLimit(`register:${identifier}`, 3, 60000), // 3 per minute
  forgotPassword: (identifier: string) => rateLimit(`forgot:${identifier}`, 3, 60000), // 3 per minute
  verifyEmail: (identifier: string) => rateLimit(`verify:${identifier}`, 5, 60000), // 5 per minute
  resendVerification: (identifier: string) => rateLimit(`resend:${identifier}`, 2, 60000), // 2 per minute
};
