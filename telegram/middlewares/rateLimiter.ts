/**
 * ASAKA ZIYO — Telegram Platform Sliding-Window Rate Limiter
 *
 * Protects bot command & callback endpoints from flood/spam abuse per Telegram user.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class TelegramRateLimiter {
  private readonly buckets = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 25, windowMs = 60_000) {
    this.maxRequests = Math.max(1, maxRequests);
    this.windowMs = Math.max(1_000, windowMs);
  }

  check(key: string, nowMs = Date.now()): RateLimitResult {
    const cutoff = nowMs - this.windowMs;
    const timestamps = (this.buckets.get(key) || []).filter((ts) => ts > cutoff);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0] || nowMs;
      const retryAfterMs = Math.max(250, oldest + this.windowMs - nowMs);
      this.buckets.set(key, timestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
      };
    }

    timestamps.push(nowMs);
    this.buckets.set(key, timestamps);

    // Periodic bounded cleanup to prevent unbounded memory growth
    if (this.buckets.size > 5_000) {
      for (const [bucketKey, entries] of this.buckets.entries()) {
        const fresh = entries.filter((ts) => ts > cutoff);
        if (fresh.length === 0) {
          this.buckets.delete(bucketKey);
        } else {
          this.buckets.set(bucketKey, fresh);
        }
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      retryAfterMs: 0,
    };
  }

  reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
    } else {
      this.buckets.clear();
    }
  }
}
