import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically prune stale entries to prevent memory growth
let lastCleanup = Date.now();
function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 60000) return; // run at most once per minute
  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  cleanupStaleEntries(windowMs);

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Remove timestamps outside the sliding window
  record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds)
    };
  }

  record.timestamps.push(now);
  const resetSeconds = Math.ceil(windowSeconds);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    resetSeconds
  };
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown-ip';
}
