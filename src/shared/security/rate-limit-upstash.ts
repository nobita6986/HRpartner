/**
 * rate-limit-upstash.ts — V5-OPS-06A / RQ-01 / STEP-01 (DEC-01/02/06, EV-12, RISK-03).
 *
 * Distributed counter adapter: `@upstash/ratelimit` sliding window trên Upstash Redis REST.
 * Redis là source-of-truth (không ephemeral cache) ⇒ nhiều instance serverless dùng chung counter.
 *
 * FAIL-CLOSED (DEC-02): provider throw ⇒ `PROVIDER_ERROR`; SDK trả `reason === 'timeout'`
 * (fail-OPEN mặc định của SDK — EV-12/RISK-03) ⇒ `PROVIDER_TIMEOUT`. Cả hai thành
 * RateLimitUnavailableError ⇒ route trả 503, KHÔNG chạm DB. Raw error KHÔNG được ném/log tiếp (DEC-12).
 *
 * DEC-06: `analytics: false` + `enableProtection: false` — SDK không nhận/ghi raw IP.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import {
  keyPrefixFor,
  RateLimitUnavailableError,
  retryAfterSecFrom,
  type RateLimitConfig,
  type RateLimitProvider,
  type RateLimitRule,
  type RateLimitSurface,
} from './rate-limit-port';

/** Cap latency của limiter; hết hạn ⇒ fail-closed 503 chứ KHÔNG cho qua. */
export const UPSTASH_TIMEOUT_MS = 1500;

export interface UpstashLimiterResponse {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: string;
}

export interface UpstashLimiterLike {
  limit(identifier: string): Promise<UpstashLimiterResponse>;
}

export type UpstashLimiterFactory = (rule: RateLimitRule, config: RateLimitConfig) => UpstashLimiterLike;

export function defaultUpstashLimiterFactory(rule: RateLimitRule, config: RateLimitConfig): UpstashLimiterLike {
  const redis = new Redis({
    url: config.restUrl,
    token: config.restToken,
    retry: { retries: 1, backoff: () => 50 },
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSec} s` as `${number} s`),
    prefix: keyPrefixFor(config, rule),
    analytics: false,
    enableProtection: false,
    ephemeralCache: false,
    timeout: UPSTASH_TIMEOUT_MS,
  });
}

export function createUpstashRateLimitProvider(
  config: RateLimitConfig,
  factory: UpstashLimiterFactory = defaultUpstashLimiterFactory,
): RateLimitProvider {
  const limiters = new Map<RateLimitSurface, UpstashLimiterLike>();

  function limiterFor(rule: RateLimitRule): UpstashLimiterLike {
    const cached = limiters.get(rule.surface);
    if (cached) return cached;
    const created = factory(rule, config);
    limiters.set(rule.surface, created);
    return created;
  }

  return {
    kind: 'upstash',
    async limit(rule, identifier) {
      let res: UpstashLimiterResponse;
      try {
        res = await limiterFor(rule).limit(identifier);
      } catch {
        // DEC-12: raw provider error KHÔNG được log hay ném tiếp — message của Upstash có thể
        // mang endpoint/scope của token. Chỉ reason code đi ra ngoài. Việc phân loại capability
        // (ví dụ NOPERM scripting) thuộc LIVE lane, KHÔNG phải production log.
        throw new RateLimitUnavailableError('PROVIDER_ERROR');
      }
      if (res?.reason === 'timeout') throw new RateLimitUnavailableError('PROVIDER_TIMEOUT');
      if (typeof res?.success !== 'boolean' || typeof res?.reset !== 'number') {
        throw new RateLimitUnavailableError('PROVIDER_ERROR');
      }
      return {
        allowed: res.success,
        limit: typeof res.limit === 'number' ? res.limit : rule.limit,
        remaining: Math.max(0, typeof res.remaining === 'number' ? res.remaining : 0),
        resetAtMs: res.reset,
        retryAfterSec: retryAfterSecFrom(res.reset, Date.now()),
      };
    },
  };
}
