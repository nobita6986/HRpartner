/**
 * rate-limit-memory.ts — V5-OPS-06A / RQ-01 / STEP-01 (DEC-03).
 *
 * Fake deterministic (fixed window, injectable clock) cho unit/route test và dev local.
 * KHÔNG BAO GIỜ được activate ở production: constructor throw `MEMORY_IN_PRODUCTION`
 * khi `VERCEL_ENV=production` hoặc `NODE_ENV=production` (DEC-02/03) ⇒ production chỉ có
 * Upstash hoặc 503, không có RAM fallback.
 */
import {
  isProductionEnv,
  RateLimitUnavailableError,
  retryAfterSecFrom,
  type EnvLike,
  type RateLimitProvider,
  type RateLimitRule,
} from './rate-limit-port';

interface WindowState {
  count: number;
  resetAtMs: number;
}

export interface MemoryRateLimitOptions {
  env: EnvLike;
  now?: () => number;
  /** Store dùng chung giữa nhiều provider instance (mô phỏng counter phân tán trong test). */
  store?: Map<string, WindowState>;
}

export function createMemoryRateLimitProvider(opts: MemoryRateLimitOptions): RateLimitProvider {
  if (isProductionEnv(opts.env)) throw new RateLimitUnavailableError('MEMORY_IN_PRODUCTION');
  const now = opts.now ?? (() => Date.now());
  const store = opts.store ?? new Map<string, WindowState>();

  return {
    kind: 'memory',
    async limit(rule: RateLimitRule, identifier: string) {
      const at = now();
      const key = `${rule.surface}:${identifier}`;
      const existing = store.get(key);
      const bucket: WindowState =
        existing && existing.resetAtMs > at
          ? existing
          : { count: 0, resetAtMs: at + rule.windowSec * 1000 };
      bucket.count += 1;
      store.set(key, bucket);
      const allowed = bucket.count <= rule.limit;
      return {
        allowed,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - bucket.count),
        resetAtMs: bucket.resetAtMs,
        retryAfterSec: retryAfterSecFrom(bucket.resetAtMs, at),
      };
    },
  };
}
