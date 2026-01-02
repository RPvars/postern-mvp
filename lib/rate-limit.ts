interface RateLimitRecord {
  count: number;
  lastReset: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.lastReset > windowMs) {
      rateLimitMap.delete(key);
    }
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
  cleanup(windowMs);

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
