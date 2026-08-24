/**
 * rate-limit — MP-2 STEP-03 (RQ-04 / RISK-03).
 *
 * A small, deterministic fixed-window rate-limit hook for the anonymous public
 * tracking endpoint (tracking-code enumeration guard). In-memory by design: the
 * public tracking read is idempotent and low-value, so a per-instance limiter is
 * an adequate "hook" (DEC-02/RQ-04). The clock is injectable so the behavior is
 * unit-testable without timers; a distributed limiter can replace the store
 * later without changing call sites.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets (>= 1 when blocked). */
  retryAfterSec: number;
}

export interface RateLimitOptions {
  /** Max requests permitted per window per key. */
  max?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

interface Entry {
  count: number;
  resetAt: number;
}

// Public tracking defaults: 20 reads / minute / key. Tighter than the portal
// limiter (30) because tracking codes are the enumeration surface (RISK-03).
const DEFAULT_MAX = 20;
const DEFAULT_WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

const STORE = new Map<string, Entry>();
let lastCleanup = 0;

/**
 * Fixed-window check for `key`. Records the hit and returns whether it is
 * allowed. Pure aside from the module-level store + injected clock.
 */
export function checkTrackingRateLimit(key: string, opts: RateLimitOptions = {}): RateLimitResult {
  const max = opts.max ?? DEFAULT_MAX;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const now = (opts.now ?? Date.now)();

  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    for (const [k, e] of STORE.entries()) {
      if (e.resetAt <= now) STORE.delete(k);
    }
    lastCleanup = now;
  }

  const entry = STORE.get(key);
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    STORE.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, retryAfterSec: 0 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  entry.count += 1;
  return { allowed: true, remaining: max - entry.count, retryAfterSec: 0 };
}

/** Test helper — clears the in-memory window store. */
export function __resetTrackingRateLimit(): void {
  STORE.clear();
  lastCleanup = 0;
}

/** Derive a rate-limit key from a request's client IP headers (best-effort). */
export function clientKeyFromHeaders(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
