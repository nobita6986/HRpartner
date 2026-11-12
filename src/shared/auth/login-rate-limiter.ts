import { createHash } from 'node:crypto';

interface RateLimitEntry {
  failures: number;
  windowStartedAt: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES_PER_WINDOW = 8;

const buckets = new Map<string, RateLimitEntry>();

function buildBucketKey(ip: string, identifier: string): string {
  const hash = createHash('sha256')
    .update(`${ip.trim()}|${identifier.trim()}`)
    .digest('hex');
  return hash;
}

export function isLoginRateLimited(ip: string, identifier: string, nowMs = Date.now()): boolean {
  const key = buildBucketKey(ip, identifier);
  const entry = buckets.get(key);
  if (!entry) return false;
  if (nowMs - entry.windowStartedAt > WINDOW_MS) {
    buckets.delete(key);
    return false;
  }
  return entry.failures >= MAX_FAILURES_PER_WINDOW;
}

export function recordLoginFailure(ip: string, identifier: string, nowMs = Date.now()): void {
  const key = buildBucketKey(ip, identifier);
  const entry = buckets.get(key);
  if (!entry || nowMs - entry.windowStartedAt > WINDOW_MS) {
    buckets.set(key, { failures: 1, windowStartedAt: nowMs });
    return;
  }
  entry.failures += 1;
}

export function clearLoginFailures(ip: string, identifier: string): void {
  const key = buildBucketKey(ip, identifier);
  buckets.delete(key);
}

export function resetLoginRateLimiterForTests(): void {
  buckets.clear();
}
