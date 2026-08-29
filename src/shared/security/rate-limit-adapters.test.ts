/**
 * rate-limit-adapters.test.ts — V5-OPS-06A / RQ-01/02 / STEP-01 / AC-02 (DEC-02/03/06, EV-12, RISK-03).
 *
 * Ma trận failure của hai adapter:
 *   - Upstash: throw ⇒ PROVIDER_ERROR; `reason='timeout'` (fail-OPEN của SDK) ⇒ PROVIDER_TIMEOUT;
 *     shape lạ ⇒ PROVIDER_ERROR. KHÔNG bao giờ trả allowed=true khi provider hỏng.
 *   - Memory: fixed window deterministic, clock injectable, store dùng chung mô phỏng counter
 *     phân tán (hai instance ⇒ MỘT counter, EV-12).
 *
 * Limiter được inject bằng factory fake ⇒ test KHÔNG mở network, KHÔNG cần credential.
 */
import { describe, it, expect, vi } from 'vitest';

import { createMemoryRateLimitProvider } from '@/src/shared/security/rate-limit-memory';
import {
  MIN_HASH_SECRET_LENGTH,
  RATE_LIMIT_RULES,
  RateLimitUnavailableError,
  resolveRateLimitConfig,
  type RateLimitConfig,
} from '@/src/shared/security/rate-limit-port';
import {
  createUpstashRateLimitProvider,
  UPSTASH_TIMEOUT_MS,
  type UpstashLimiterLike,
  type UpstashLimiterResponse,
} from '@/src/shared/security/rate-limit-upstash';

const CONFIG: RateLimitConfig = resolveRateLimitConfig({
  VERCEL_ENV: 'production',
  UPSTASH_REDIS_REST_URL: 'https://synthetic-upstash.example.invalid',
  UPSTASH_REDIS_REST_TOKEN: 'SYNTHETIC-TOKEN-NOT-REAL',
  RATE_LIMIT_HASH_SECRET: 'S'.repeat(MIN_HASH_SECRET_LENGTH),
});

function fakeLimiter(impl: () => Promise<UpstashLimiterResponse>): UpstashLimiterLike {
  return { limit: vi.fn(impl) };
}

async function reasonOfAsync(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (err) {
    return err instanceof RateLimitUnavailableError ? err.reason : `UNEXPECTED:${String(err)}`;
  }
  return 'NO_THROW';
}

describe('DEC-02 — Upstash adapter fail-closed mapping', () => {
  it('SDK throw ⇒ PROVIDER_ERROR (raw error KHÔNG được ném tiếp — DEC-12)', async () => {
    const provider = createUpstashRateLimitProvider(CONFIG, () =>
      fakeLimiter(() => Promise.reject(new Error('SECRET-URL-INSIDE-RAW-ERROR'))),
    );
    let caught: unknown;
    try {
      await provider.limit(RATE_LIMIT_RULES.JOB_BROWSE, 'deadbeef');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RateLimitUnavailableError);
    expect((caught as RateLimitUnavailableError).reason).toBe('PROVIDER_ERROR');
    expect(String(caught)).not.toContain('SECRET-URL-INSIDE-RAW-ERROR');
  });

  it('DEC-12: raw error KHÔNG bị ghi ra console (chặn debug log lọt vào production)', async () => {
    // Canary mang hình dạng của lỗi thật đã thấy ở audit round 2/3 (NOPERM + endpoint).
    const CANARY = "NOPERM this user has no permissions to run the 'evalsha' command @ https://synthetic.upstash.invalid";
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    try {
      const provider = createUpstashRateLimitProvider(CONFIG, () => fakeLimiter(() => Promise.reject(new Error(CANARY))));
      expect(await reasonOfAsync(() => provider.limit(RATE_LIMIT_RULES.APPLY_IP, 'deadbeef'))).toBe('PROVIDER_ERROR');
      // Adapter phải IM LẶNG: phân loại capability là việc của LIVE lane, không phải production log.
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  it('reason=timeout (fail-OPEN của SDK) bị lật thành PROVIDER_TIMEOUT, KHÔNG cho qua', async () => {
    const provider = createUpstashRateLimitProvider(CONFIG, () =>
      // SDK trả success=true khi timeout — adapter phải từ chối tin.
      fakeLimiter(async () => ({ success: true, limit: 120, remaining: 119, reset: Date.now() + 1000, reason: 'timeout' })),
    );
    expect(await reasonOfAsync(() => provider.limit(RATE_LIMIT_RULES.JOB_BROWSE, 'deadbeef'))).toBe('PROVIDER_TIMEOUT');
  });

  it('response shape lạ ⇒ PROVIDER_ERROR', async () => {
    const noSuccess = createUpstashRateLimitProvider(CONFIG, () =>
      fakeLimiter(async () => ({ limit: 1, remaining: 0, reset: Date.now() } as unknown as UpstashLimiterResponse)),
    );
    expect(await reasonOfAsync(() => noSuccess.limit(RATE_LIMIT_RULES.APPLY_IP, 'deadbeef'))).toBe('PROVIDER_ERROR');

    const noReset = createUpstashRateLimitProvider(CONFIG, () =>
      fakeLimiter(async () => ({ success: true, limit: 1, remaining: 0 } as unknown as UpstashLimiterResponse)),
    );
    expect(await reasonOfAsync(() => noReset.limit(RATE_LIMIT_RULES.APPLY_IP, 'deadbeef'))).toBe('PROVIDER_ERROR');
  });

  it('allow/deny bình thường map đủ limit/remaining/reset/retryAfter', async () => {
    const reset = Date.now() + 30_000;
    const allow = createUpstashRateLimitProvider(CONFIG, () =>
      fakeLimiter(async () => ({ success: true, limit: 120, remaining: 7, reset })),
    );
    await expect(allow.limit(RATE_LIMIT_RULES.JOB_BROWSE, 'deadbeef')).resolves.toMatchObject({
      allowed: true,
      limit: 120,
      remaining: 7,
      resetAtMs: reset,
    });

    const deny = createUpstashRateLimitProvider(CONFIG, () =>
      fakeLimiter(async () => ({ success: false, limit: 10, remaining: -3, reset })),
    );
    const decision = await deny.limit(RATE_LIMIT_RULES.APPLY_IP, 'deadbeef');
    expect(decision.allowed).toBe(false);
    // remaining không bao giờ âm; retryAfter luôn >= 1.
    expect(decision.remaining).toBe(0);
    expect(decision.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it('limiter được cache theo surface: mỗi surface tạo đúng 1 lần, prefix KHÔNG chứa identifier', async () => {
    const factory = vi.fn(() => fakeLimiter(async () => ({ success: true, limit: 120, remaining: 1, reset: Date.now() + 1000 })));
    const provider = createUpstashRateLimitProvider(CONFIG, factory);
    await provider.limit(RATE_LIMIT_RULES.JOB_BROWSE, 'aaaa');
    await provider.limit(RATE_LIMIT_RULES.JOB_BROWSE, 'bbbb');
    await provider.limit(RATE_LIMIT_RULES.APPLY_IP, 'cccc');
    expect(factory).toHaveBeenCalledTimes(2);
    expect(UPSTASH_TIMEOUT_MS).toBeGreaterThan(0);
  });
});

describe('DEC-03 — memory fake deterministic', () => {
  const rule = { surface: 'APPLY_IP' as const, subject: 'ip' as const, limit: 2, windowSec: 60 };

  it('đếm đúng trong window rồi deny; hết window thì mở lại', async () => {
    let clock = 1_000_000;
    const provider = createMemoryRateLimitProvider({ env: { NODE_ENV: 'test' }, now: () => clock });
    expect((await provider.limit(rule, 'id-1')).allowed).toBe(true);
    expect((await provider.limit(rule, 'id-1')).allowed).toBe(true);
    const third = await provider.limit(rule, 'id-1');
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterSec).toBeGreaterThanOrEqual(1);
    // identifier khác ⇒ bucket khác.
    expect((await provider.limit(rule, 'id-2')).allowed).toBe(true);
    // qua window ⇒ reset.
    clock += 61_000;
    expect((await provider.limit(rule, 'id-1')).allowed).toBe(true);
  });

  it('hai provider instance dùng CHUNG store ⇒ MỘT counter (mô phỏng Redis phân tán, EV-12)', async () => {
    const store = new Map<string, { count: number; resetAtMs: number }>();
    const env = { NODE_ENV: 'test' };
    const a = createMemoryRateLimitProvider({ env, store });
    const b = createMemoryRateLimitProvider({ env, store });
    expect((await a.limit(rule, 'shared')).allowed).toBe(true);
    expect((await b.limit(rule, 'shared')).allowed).toBe(true);
    // instance thứ 2 thấy counter của instance thứ 1 ⇒ deny.
    expect((await b.limit(rule, 'shared')).allowed).toBe(false);
    expect((await a.limit(rule, 'shared')).allowed).toBe(false);
  });

  it('bucket được namespace theo surface: cùng identifier khác surface KHÔNG dùng chung counter', async () => {
    const store = new Map<string, { count: number; resetAtMs: number }>();
    const provider = createMemoryRateLimitProvider({ env: { NODE_ENV: 'test' }, store });
    await provider.limit(rule, 'same');
    await provider.limit(rule, 'same');
    expect((await provider.limit({ ...rule, surface: 'TRACKING_IP' }, 'same')).allowed).toBe(true);
  });
});
