/**
 * Centralized In-Memory Sliding-Window Rate Limiter
 * Provides robust rate-limiting for sensitive endpoints across LogHorizon.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      const freshTimestamps = record.timestamps.filter((ts) => now - ts < 300_000);
      if (freshTimestamps.length === 0) {
        rateLimitStore.delete(key);
      } else {
        record.timestamps = freshTimestamps;
      }
    }
  }, 300_000);
}

/**
 * Checks if an action is within rate limits.
 * @param key Unique key (e.g., `user:${userId}:checkin` or `ip:${ip}:upload`)
 * @param limit Maximum allowed requests within the window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remainingSec: number; remainingCount: number } {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0] || now;
    const remainingMs = windowMs - (now - oldest);
    const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
    return {
      allowed: false,
      remainingSec,
      remainingCount: 0,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remainingSec: 0,
    remainingCount: limit - record.timestamps.length,
  };
}

/**
 * Helper to extract client IP address from Next.js Request headers.
 */
export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp?.trim()) return xRealIp.trim();

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim();

  return "127.0.0.1";
}
