/**
 * rate-limit-config.test.ts — V5-OPS-06A / RQ-01/02 / STEP-01 / AC-01/02.
 *
 * Ma trận configuration / failure / privacy của limiter port:
 *   - DEC-02: production THIẾU hoặc SAI env ⇒ throw (không bao giờ có RAM fallback).
 *   - DEC-03: memory fake chỉ sống ngoài production; injection cũng bị chặn ở production.
 *   - DEC-04: đúng số limit/window launch baseline; DEC-07 unknown bucket bị siết /4.
 *   - DEC-05: identifier vào Redis là HMAC — không chứa raw IP/phone/tracking code.
 *
 * KHÔNG đọc secret thật: mọi env là object synthetic truyền tay.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  createMemoryRateLimitProvider,
} from '@/src/shared/security/rate-limit-memory';
import {
  canonicalTrackingCode,
  clientIpFromHeaders,
  hashRateLimitIdentifier,
  isPlausibleIp,
  UNKNOWN_CLIENT_BUCKET,
} from '@/src/shared/security/rate-limit-identity';
import {
  DEV_ONLY_HASH_SECRET,
  keyPrefixFor,
  MIN_HASH_SECRET_LENGTH,
  RATE_LIMIT_KEY_VERSION,
  RATE_LIMIT_RULES,
  RateLimitUnavailableError,
  resolveHashSecret,
  resolveRateLimitConfig,
  retryAfterSecFrom,
  tightenForUnknownSubject,
  UNKNOWN_BUCKET_DIVISOR,
  type EnvLike,
} from '@/src/shared/security/rate-limit-port';
import {
  getRateLimitRuntime,
  __resetRateLimitRuntime,
  __setRateLimitRuntime,
} from '@/src/shared/security/rate-limit-provider';

// Synthetic sentinels — KHÔNG phải credential thật.
const FAKE_URL = 'https://synthetic-upstash.example.invalid';
const FAKE_TOKEN = 'SYNTHETIC-TOKEN-NOT-REAL';
const FAKE_SECRET = 'S'.repeat(MIN_HASH_SECRET_LENGTH);

const PROD: EnvLike = {
  VERCEL_ENV: 'production',
  UPSTASH_REDIS_REST_URL: FAKE_URL,
  UPSTASH_REDIS_REST_TOKEN: FAKE_TOKEN,
  RATE_LIMIT_HASH_SECRET: FAKE_SECRET,
};
const DEV: EnvLike = { NODE_ENV: 'test' };

function reasonOf(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    return err instanceof RateLimitUnavailableError ? err.reason : `UNEXPECTED:${String(err)}`;
  }
  return 'NO_THROW';
}

beforeEach(() => __resetRateLimitRuntime());

describe('DEC-04 — launch rule matrix', () => {
  it('đúng limit/window baseline và JOB_BROWSE là MỘT bucket cho list+detail', () => {
    expect(RATE_LIMIT_RULES.JOB_BROWSE).toEqual({ surface: 'JOB_BROWSE', subject: 'ip', limit: 120, windowSec: 60 });
    expect(RATE_LIMIT_RULES.TRACKING_IP).toEqual({ surface: 'TRACKING_IP', subject: 'ip', limit: 20, windowSec: 60 });
    expect(RATE_LIMIT_RULES.TRACKING_CODE).toEqual({ surface: 'TRACKING_CODE', subject: 'tracking-code', limit: 10, windowSec: 60 });
    expect(RATE_LIMIT_RULES.APPLY_IP).toEqual({ surface: 'APPLY_IP', subject: 'ip', limit: 10, windowSec: 600 });
    expect(RATE_LIMIT_RULES.APPLY_PHONE).toEqual({ surface: 'APPLY_PHONE', subject: 'phone', limit: 5, windowSec: 3600 });
  });

  it('DEC-07: unknown bucket bị chia /4 và không bao giờ xuống dưới 1', () => {
    expect(UNKNOWN_BUCKET_DIVISOR).toBe(4);
    expect(tightenForUnknownSubject(RATE_LIMIT_RULES.JOB_BROWSE).limit).toBe(30);
    expect(tightenForUnknownSubject(RATE_LIMIT_RULES.TRACKING_IP).limit).toBe(5);
    expect(tightenForUnknownSubject(RATE_LIMIT_RULES.APPLY_IP).limit).toBe(2);
    expect(tightenForUnknownSubject({ ...RATE_LIMIT_RULES.APPLY_IP, limit: 2 }).limit).toBe(1);
    // window KHÔNG bị nới ra khi siết limit.
    expect(tightenForUnknownSubject(RATE_LIMIT_RULES.APPLY_IP).windowSec).toBe(600);
  });

  it('retryAfterSec luôn >= 1, kể cả reset đã trôi qua hoặc không hữu hạn', () => {
    expect(retryAfterSecFrom(10_000, 1_000)).toBe(9);
    expect(retryAfterSecFrom(1_000, 10_000)).toBe(1);
    expect(retryAfterSecFrom(Number.NaN, 0)).toBe(1);
  });
});

describe('DEC-02 — config resolution fail-closed', () => {
  it('thiếu URL hoặc TOKEN ⇒ CONFIG_MISSING', () => {
    expect(reasonOf(() => resolveRateLimitConfig({ NODE_ENV: 'test' }))).toBe('CONFIG_MISSING');
    expect(reasonOf(() => resolveRateLimitConfig({ UPSTASH_REDIS_REST_URL: FAKE_URL }))).toBe('CONFIG_MISSING');
    expect(reasonOf(() => resolveRateLimitConfig({ UPSTASH_REDIS_REST_TOKEN: FAKE_TOKEN }))).toBe('CONFIG_MISSING');
    // whitespace-only cũng là "chưa cấu hình".
    expect(
      reasonOf(() => resolveRateLimitConfig({ UPSTASH_REDIS_REST_URL: '   ', UPSTASH_REDIS_REST_TOKEN: '  ' })),
    ).toBe('CONFIG_MISSING');
  });

  it('URL không phải https ⇒ CONFIG_INVALID (kể cả ngoài production)', () => {
    const env = { UPSTASH_REDIS_REST_URL: 'http://insecure.example.invalid', UPSTASH_REDIS_REST_TOKEN: FAKE_TOKEN };
    expect(reasonOf(() => resolveRateLimitConfig(env))).toBe('CONFIG_INVALID');
  });

  it('secret ngắn hơn 32 ký tự ⇒ CONFIG_INVALID ở MỌI môi trường', () => {
    expect(reasonOf(() => resolveHashSecret({ RATE_LIMIT_HASH_SECRET: 'too-short' }))).toBe('CONFIG_INVALID');
    expect(reasonOf(() => resolveHashSecret({ VERCEL_ENV: 'production', RATE_LIMIT_HASH_SECRET: 'x'.repeat(31) }))).toBe(
      'CONFIG_INVALID',
    );
  });

  it('production thiếu secret ⇒ CONFIG_MISSING; ngoài production dùng pepper dev', () => {
    expect(reasonOf(() => resolveHashSecret({ VERCEL_ENV: 'production' }))).toBe('CONFIG_MISSING');
    expect(reasonOf(() => resolveHashSecret({ NODE_ENV: 'production' }))).toBe('CONFIG_MISSING');
    expect(resolveHashSecret(DEV)).toBe(DEV_ONLY_HASH_SECRET);
  });

  it('key prefix chứa version + env + surface, KHÔNG chứa identifier', () => {
    const config = resolveRateLimitConfig(PROD);
    const prefix = keyPrefixFor(config, RATE_LIMIT_RULES.APPLY_PHONE);
    expect(prefix).toBe(`hrp:rl:${RATE_LIMIT_KEY_VERSION}:production:APPLY_PHONE`);
    expect(prefix).not.toContain(FAKE_TOKEN);
    expect(prefix).not.toContain('0909123456');
  });
});

describe('DEC-02/03 — provider selection không có RAM fallback ở production', () => {
  it('production + env đầy đủ ⇒ upstash adapter', () => {
    expect(getRateLimitRuntime(PROD).provider.kind).toBe('upstash');
  });

  it('production + THIẾU env ⇒ throw CONFIG_MISSING, KHÔNG rơi về memory', () => {
    expect(reasonOf(() => getRateLimitRuntime({ VERCEL_ENV: 'production' }))).toBe('CONFIG_MISSING');
    expect(reasonOf(() => getRateLimitRuntime({ NODE_ENV: 'production' }))).toBe('CONFIG_MISSING');
  });

  it('env SAI định dạng ⇒ throw CONFIG_INVALID kể cả ngoài production (không fallback)', () => {
    const badUrl = { NODE_ENV: 'test', UPSTASH_REDIS_REST_URL: 'ftp://x.invalid', UPSTASH_REDIS_REST_TOKEN: FAKE_TOKEN };
    expect(reasonOf(() => getRateLimitRuntime(badUrl))).toBe('CONFIG_INVALID');
    const shortSecret = { NODE_ENV: 'test', RATE_LIMIT_HASH_SECRET: 'short' };
    expect(reasonOf(() => getRateLimitRuntime(shortSecret))).toBe('CONFIG_INVALID');
  });

  it('ngoài production + CHƯA cấu hình Upstash ⇒ memory fake (DX)', () => {
    const runtime = getRateLimitRuntime(DEV);
    expect(runtime.provider.kind).toBe('memory');
    expect(runtime.hashSecret).toBe(DEV_ONLY_HASH_SECRET);
  });

  it('memory adapter TỰ CHẶN khi production ⇒ MEMORY_IN_PRODUCTION', () => {
    expect(reasonOf(() => createMemoryRateLimitProvider({ env: { VERCEL_ENV: 'production' } }))).toBe(
      'MEMORY_IN_PRODUCTION',
    );
    expect(reasonOf(() => createMemoryRateLimitProvider({ env: { NODE_ENV: 'production' } }))).toBe(
      'MEMORY_IN_PRODUCTION',
    );
  });

  it('test injection bị từ chối ở production (DEC-03)', () => {
    const provider = createMemoryRateLimitProvider({ env: DEV });
    expect(reasonOf(() => __setRateLimitRuntime({ provider }, { VERCEL_ENV: 'production' }))).toBe(
      'MEMORY_IN_PRODUCTION',
    );
    // ngoài production thì injection thắng mọi env fingerprint.
    __setRateLimitRuntime({ provider }, DEV);
    expect(getRateLimitRuntime(PROD).provider.kind).toBe('memory');
    __resetRateLimitRuntime();
    expect(getRateLimitRuntime(PROD).provider.kind).toBe('upstash');
  });

  it('cache theo fingerprint env: đổi env ⇒ build lại, không giữ provider cũ', () => {
    expect(getRateLimitRuntime(DEV).provider.kind).toBe('memory');
    expect(getRateLimitRuntime(PROD).provider.kind).toBe('upstash');
    expect(reasonOf(() => getRateLimitRuntime({ VERCEL_ENV: 'production' }))).toBe('CONFIG_MISSING');
  });
});

describe('DEC-05/06 — identifier privacy', () => {
  const RAW_PHONE = '0909123456';
  const RAW_CODE = 'APP-CANARY-TRACK';
  const RAW_IP = '203.0.113.9';

  it('digest là 32 hex và KHÔNG chứa raw value', () => {
    for (const raw of [RAW_PHONE, RAW_CODE, RAW_IP]) {
      const digest = hashRateLimitIdentifier(RATE_LIMIT_RULES.APPLY_PHONE, raw, FAKE_SECRET);
      expect(digest).toMatch(/^[0-9a-f]{32}$/);
      expect(digest).not.toContain(raw);
    }
  });

  it('cùng giá trị nhưng khác surface/subject ⇒ khác digest (namespaced)', () => {
    const a = hashRateLimitIdentifier(RATE_LIMIT_RULES.TRACKING_IP, RAW_IP, FAKE_SECRET);
    const b = hashRateLimitIdentifier(RATE_LIMIT_RULES.APPLY_IP, RAW_IP, FAKE_SECRET);
    const c = hashRateLimitIdentifier(RATE_LIMIT_RULES.TRACKING_CODE, RAW_IP, FAKE_SECRET);
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('đổi secret ⇒ đổi digest (pepper thật sự tham gia)', () => {
    const withDev = hashRateLimitIdentifier(RATE_LIMIT_RULES.APPLY_PHONE, RAW_PHONE, DEV_ONLY_HASH_SECRET);
    const withProd = hashRateLimitIdentifier(RATE_LIMIT_RULES.APPLY_PHONE, RAW_PHONE, FAKE_SECRET);
    expect(withDev).not.toBe(withProd);
  });

  it('deterministic: cùng (rule, value, secret) ⇒ cùng digest', () => {
    const first = hashRateLimitIdentifier(RATE_LIMIT_RULES.TRACKING_CODE, RAW_CODE, FAKE_SECRET);
    const second = hashRateLimitIdentifier(RATE_LIMIT_RULES.TRACKING_CODE, RAW_CODE, FAKE_SECRET);
    expect(first).toBe(second);
  });
});

describe('DEC-07 — client IP trust boundary', () => {
  it('CHỈ Vercel production mới trust x-forwarded-for first value', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' });
    expect(clientIpFromHeaders(headers, { VERCEL_ENV: 'production' })).toBe('203.0.113.9');
    // preview/dev/test: header do client kiểm soát ⇒ gom vào unknown bucket.
    expect(clientIpFromHeaders(headers, { VERCEL_ENV: 'preview' })).toBe(UNKNOWN_CLIENT_BUCKET);
    expect(clientIpFromHeaders(headers, { NODE_ENV: 'test' })).toBe(UNKNOWN_CLIENT_BUCKET);
  });

  it('malformed/absent IP ở production ⇒ unknown bucket cố định (không random)', () => {
    const env = { VERCEL_ENV: 'production' };
    expect(clientIpFromHeaders(new Headers(), env)).toBe(UNKNOWN_CLIENT_BUCKET);
    expect(clientIpFromHeaders(new Headers({ 'x-forwarded-for': 'not-an-ip' }), env)).toBe(UNKNOWN_CLIENT_BUCKET);
    expect(clientIpFromHeaders(new Headers({ 'x-forwarded-for': '999.1.1.1' }), env)).toBe(UNKNOWN_CLIENT_BUCKET);
    expect(clientIpFromHeaders(new Headers({ 'x-forwarded-for': '' }), env)).toBe(UNKNOWN_CLIENT_BUCKET);
    // hai request malformed liên tiếp phải vào CÙNG bucket.
    expect(clientIpFromHeaders(new Headers({ 'x-forwarded-for': 'a' }), env)).toBe(
      clientIpFromHeaders(new Headers({ 'x-forwarded-for': 'b' }), env),
    );
  });

  it('x-real-ip là fallback hợp lệ ở production; IPv6 được chấp nhận', () => {
    const env = { VERCEL_ENV: 'production' };
    expect(clientIpFromHeaders(new Headers({ 'x-real-ip': '198.51.100.7' }), env)).toBe('198.51.100.7');
    expect(clientIpFromHeaders(new Headers({ 'x-forwarded-for': '2001:db8::1' }), env)).toBe('2001:db8::1');
    expect(isPlausibleIp('2001:db8::1')).toBe(true);
    expect(isPlausibleIp('256.1.1.1')).toBe(false);
  });

  it('tracking code canonical hoá case/space ⇒ không lách bucket', () => {
    expect(canonicalTrackingCode('  app-abcd-efgh ')).toBe('APP-ABCD-EFGH');
    expect(canonicalTrackingCode('APP-ABCD-EFGH')).toBe(canonicalTrackingCode('app-abcd-efgh'));
  });
});
