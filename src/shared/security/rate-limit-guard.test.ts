/**
 * rate-limit-guard.test.ts — V5-OPS-06A / RQ-02 / STEP-01 / AC-01/02/08 (DEC-02/05/07/08/12).
 *
 * `enforceRateLimits()` là điểm vào DUY NHẤT của route. Test chứng minh:
 *   - allow ⇒ `null` (route mới được đi tiếp), deny ⇒ 429 shape DEC-08, limiter lỗi ⇒ 503 DEC-02.
 *   - provider CHỈ nhận HMAC digest — raw IP/phone/tracking code không ra khỏi process (DEC-05/RQ-02).
 *   - bucket tuần tự: bucket đầu deny thì bucket sau KHÔNG bị đếm.
 *   - IP unknown bị siết /4 (DEC-07); tracking code canonical hoá (không lách bucket).
 *   - Log chỉ có route class/outcome/status/surface/retryAfter — KHÔNG identifier, KHÔNG digest (DEC-12).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { __captureSink, __resetSink, type LogEntry } from '@/src/shared/observability/logger';
import { enforceRateLimits, RATE_LIMITED_MESSAGE } from '@/src/shared/security/rate-limit-guard';
import { hashRateLimitIdentifier, UNKNOWN_CLIENT_BUCKET } from '@/src/shared/security/rate-limit-identity';
import {
  DEV_ONLY_HASH_SECRET,
  RATE_LIMIT_RULES,
  RateLimitUnavailableError,
  tightenForUnknownSubject,
  type RateLimitDecision,
  type RateLimitProvider,
  type RateLimitRule,
} from '@/src/shared/security/rate-limit-port';
import { __resetRateLimitRuntime, __setRateLimitRuntime } from '@/src/shared/security/rate-limit-provider';

const TEST_ENV = { NODE_ENV: 'test' };
const ROUTE_CLASS = 'GET /api/public/applications/[trackingCode]';

// Giá trị thô synthetic (KHÔNG PII thật) — canary để soi rò rỉ.
const RAW_IP = '203.0.113.9';
const RAW_CODE = 'app-canary-code';
const RAW_PHONE = '0909123456';

interface Recorded {
  rule: RateLimitRule;
  identifier: string;
}

function allow(rule: RateLimitRule): RateLimitDecision {
  return { allowed: true, limit: rule.limit, remaining: rule.limit - 1, resetAtMs: Date.now() + 60_000, retryAfterSec: 60 };
}
function deny(rule: RateLimitRule): RateLimitDecision {
  return { allowed: false, limit: rule.limit, remaining: 0, resetAtMs: Date.now() + 30_000, retryAfterSec: 30 };
}

/** Provider fake ghi lại mọi lời gọi; behaviour lấy theo thứ tự bucket. */
function scriptedProvider(
  script: Array<(rule: RateLimitRule) => RateLimitDecision | never>,
): { provider: RateLimitProvider; calls: Recorded[] } {
  const calls: Recorded[] = [];
  let i = 0;
  const provider: RateLimitProvider = {
    kind: 'memory',
    async limit(rule, identifier) {
      calls.push({ rule, identifier });
      const step = script[Math.min(i, script.length - 1)];
      i += 1;
      return step(rule);
    },
  };
  return { provider, calls };
}

let logs: LogEntry[];

beforeEach(() => {
  __resetRateLimitRuntime();
  logs = __captureSink().entries;
});
afterEach(() => {
  __resetRateLimitRuntime();
  __resetSink();
});

describe('RQ-02/DEC-05 — chỉ HMAC đi tới provider', () => {
  it('identifier là digest 32 hex, KHÔNG phải raw value', async () => {
    const { provider, calls } = scriptedProvider([allow]);
    __setRateLimitRuntime({ provider }, TEST_ENV);

    const result = await enforceRateLimits({
      buckets: [
        { rule: RATE_LIMIT_RULES.TRACKING_IP, value: RAW_IP },
        { rule: RATE_LIMIT_RULES.TRACKING_CODE, value: RAW_CODE },
      ],
      routeClass: ROUTE_CLASS,
      requestId: 'req-1',
      env: TEST_ENV,
    });

    expect(result).toBeNull();
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.identifier).toMatch(/^[0-9a-f]{32}$/);
      expect(call.identifier).not.toContain(RAW_IP);
      expect(call.identifier).not.toContain(RAW_CODE);
      expect(call.identifier).not.toContain(RAW_CODE.toUpperCase());
    }
  });

  it('digest khớp HMAC của giá trị canonical (tracking code UPPER, IP trim)', async () => {
    const { provider, calls } = scriptedProvider([allow]);
    __setRateLimitRuntime({ provider }, TEST_ENV);

    await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.TRACKING_CODE, value: '  app-canary-code ' }],
      routeClass: ROUTE_CLASS,
      env: TEST_ENV,
    });

    expect(calls[0].identifier).toBe(
      hashRateLimitIdentifier(RATE_LIMIT_RULES.TRACKING_CODE, 'APP-CANARY-CODE', DEV_ONLY_HASH_SECRET),
    );
  });

  it('phone: hoa/thường-space không tạo bucket mới (cùng digest)', async () => {
    const { provider, calls } = scriptedProvider([allow]);
    __setRateLimitRuntime({ provider }, TEST_ENV);
    const bucket = (value: string) => ({
      buckets: [{ rule: RATE_LIMIT_RULES.APPLY_PHONE, value }],
      routeClass: 'POST /api/public/jobs/[slug]/applications',
      env: TEST_ENV,
    });
    await enforceRateLimits(bucket(RAW_PHONE));
    await enforceRateLimits(bucket(` ${RAW_PHONE} `));
    expect(calls[0].identifier).toBe(calls[1].identifier);
    expect(calls[0].identifier).not.toContain(RAW_PHONE);
  });
});

describe('DEC-08 — 429 shape', () => {
  it('deny ⇒ 429, error code chung, Retry-After, no-store, header không chứa identifier', async () => {
    const { provider } = scriptedProvider([deny]);
    __setRateLimitRuntime({ provider }, TEST_ENV);

    const res = await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.TRACKING_CODE, value: RAW_CODE }],
      routeClass: ROUTE_CLASS,
      requestId: 'req-2',
      env: TEST_ENV,
    });

    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(await res!.json()).toEqual({ error: 'RATE_LIMITED', message: RATE_LIMITED_MESSAGE });
    expect(res!.headers.get('retry-after')).toBe('30');
    expect(res!.headers.get('cache-control')).toBe('no-store');
    expect(res!.headers.get('x-ratelimit-limit')).toBe(String(RATE_LIMIT_RULES.TRACKING_CODE.limit));
    expect(res!.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(Number(res!.headers.get('x-ratelimit-reset'))).toBeGreaterThan(0);

    const headerDump = JSON.stringify([...res!.headers.entries()]);
    expect(headerDump).not.toContain(RAW_CODE);
    expect(headerDump).not.toContain(RAW_CODE.toUpperCase());
  });

  it('bucket đầu deny ⇒ bucket sau KHÔNG được đếm (subject vô can không bị phóng đại)', async () => {
    const { provider, calls } = scriptedProvider([deny, allow]);
    __setRateLimitRuntime({ provider }, TEST_ENV);

    const res = await enforceRateLimits({
      buckets: [
        { rule: RATE_LIMIT_RULES.TRACKING_IP, value: RAW_IP },
        { rule: RATE_LIMIT_RULES.TRACKING_CODE, value: RAW_CODE },
      ],
      routeClass: ROUTE_CLASS,
      env: TEST_ENV,
    });

    expect(res!.status).toBe(429);
    expect(calls).toHaveLength(1);
    expect(calls[0].rule.surface).toBe('TRACKING_IP');
  });
});

describe('DEC-02 — fail-closed 503', () => {
  it('provider throw ⇒ 503 RATE_LIMIT_UNAVAILABLE + Retry-After 5', async () => {
    const provider: RateLimitProvider = {
      kind: 'upstash',
      async limit() {
        throw new RateLimitUnavailableError('PROVIDER_TIMEOUT');
      },
    };
    __setRateLimitRuntime({ provider }, TEST_ENV);

    const res = await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.JOB_BROWSE, value: RAW_IP }],
      routeClass: 'GET /api/jobs',
      env: TEST_ENV,
    });

    expect(res!.status).toBe(503);
    expect(await res!.json()).toMatchObject({ error: 'RATE_LIMIT_UNAVAILABLE' });
    expect(res!.headers.get('retry-after')).toBe('5');
    expect(res!.headers.get('cache-control')).toBe('no-store');
  });

  it('lỗi lạ (không phải RateLimitUnavailableError) vẫn 503, không cho qua', async () => {
    const provider: RateLimitProvider = {
      kind: 'upstash',
      async limit() {
        throw new Error('SYNTHETIC-RAW-PROVIDER-ERROR');
      },
    };
    __setRateLimitRuntime({ provider }, TEST_ENV);

    const res = await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.JOB_BROWSE, value: RAW_IP }],
      routeClass: 'GET /api/jobs',
      env: TEST_ENV,
    });

    expect(res!.status).toBe(503);
    expect(JSON.stringify(logs)).not.toContain('SYNTHETIC-RAW-PROVIDER-ERROR');
  });

  it('config production thiếu env ⇒ 503 và provider KHÔNG được gọi', async () => {
    const { provider, calls } = scriptedProvider([allow]);
    // KHÔNG inject: production fingerprint phải tự throw ở tầng runtime.
    void provider;
    const res = await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.JOB_BROWSE, value: RAW_IP }],
      routeClass: 'GET /api/jobs',
      env: { VERCEL_ENV: 'production' },
    });
    expect(res!.status).toBe(503);
    expect(calls).toHaveLength(0);
  });
});

describe('DEC-07 — unknown IP bucket bị siết', () => {
  it('IP unknown ⇒ rule tới provider có limit /4, window giữ nguyên', async () => {
    const { provider, calls } = scriptedProvider([allow]);
    __setRateLimitRuntime({ provider }, TEST_ENV);

    await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.JOB_BROWSE, value: UNKNOWN_CLIENT_BUCKET }],
      routeClass: 'GET /api/jobs',
      env: TEST_ENV,
    });

    expect(calls[0].rule).toEqual(tightenForUnknownSubject(RATE_LIMIT_RULES.JOB_BROWSE));
    expect(calls[0].rule.limit).toBe(30);
    expect(calls[0].rule.windowSec).toBe(60);
  });

  it('IP xác định ⇒ rule KHÔNG bị siết', async () => {
    const { provider, calls } = scriptedProvider([allow]);
    __setRateLimitRuntime({ provider }, TEST_ENV);

    await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.JOB_BROWSE, value: RAW_IP }],
      routeClass: 'GET /api/jobs',
      env: TEST_ENV,
    });

    expect(calls[0].rule).toEqual(RATE_LIMIT_RULES.JOB_BROWSE);
  });

  it('subject không phải ip thì chuỗi "unknown" KHÔNG kích hoạt siết', async () => {
    const { provider, calls } = scriptedProvider([allow]);
    __setRateLimitRuntime({ provider }, TEST_ENV);

    await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.TRACKING_CODE, value: UNKNOWN_CLIENT_BUCKET }],
      routeClass: ROUTE_CLASS,
      env: TEST_ENV,
    });

    expect(calls[0].rule).toEqual(RATE_LIMIT_RULES.TRACKING_CODE);
  });
});

describe('DEC-12 — log không mang identifier', () => {
  it('deny log: chỉ route class/status/outcome/surface/retryAfter', async () => {
    const { provider, calls } = scriptedProvider([deny]);
    __setRateLimitRuntime({ provider }, TEST_ENV);

    await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.APPLY_PHONE, value: RAW_PHONE }],
      routeClass: 'POST /api/public/jobs/[slug]/applications',
      requestId: 'req-3',
      env: TEST_ENV,
    });

    const entry = logs.find((e) => e.event === 'rate_limit.denied');
    expect(entry).toBeDefined();
    expect(entry!.requestId).toBe('req-3');
    expect(entry!.meta).toMatchObject({
      route: 'POST /api/public/jobs/[slug]/applications',
      status: 429,
      outcome: 'rate_limited',
    });
    const dump = JSON.stringify(logs);
    expect(dump).not.toContain(RAW_PHONE);
    expect(dump).not.toContain(calls[0].identifier);
    // route class là template tĩnh, không phải URL thật có slug/mã.
    expect(dump).not.toContain('http');
  });

  it('unavailable log: chỉ reason code + errorCode, không raw error', async () => {
    const provider: RateLimitProvider = {
      kind: 'upstash',
      async limit() {
        throw new RateLimitUnavailableError('PROVIDER_ERROR');
      },
    };
    __setRateLimitRuntime({ provider }, TEST_ENV);

    await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.TRACKING_CODE, value: RAW_CODE }],
      routeClass: ROUTE_CLASS,
      requestId: 'req-4',
      env: TEST_ENV,
    });

    const entry = logs.find((e) => e.event === 'rate_limit.unavailable');
    expect(entry).toBeDefined();
    expect(entry!.meta).toMatchObject({ status: 503, outcome: 'fail_closed' });
    // Guard gửi errorCode 'RATE_LIMIT_UNAVAILABLE'; sanitizer của logger (OPS-04a) coi mọi
    // chuỗi ≥20 ký tự word là "secret-shaped" nên rewrite thành sentinel. Đây là
    // over-redaction FAIL-SAFE của logger, không phải lỗi guard: chấp nhận cả hai giá trị,
    // miễn KHÔNG bao giờ là raw provider error. Reason code sống ở detail.reason.
    expect(entry!.meta.errorCode).toMatch(/^(RATE_LIMIT_UNAVAILABLE|\[REDACTED\])$/);
    expect(entry!.meta.detail).toMatchObject({ reason: 'PROVIDER_ERROR', retryAfterSec: 5, surface: 'TRACKING_CODE' });
    expect(JSON.stringify(logs)).not.toContain(RAW_CODE.toUpperCase());
  });
});
