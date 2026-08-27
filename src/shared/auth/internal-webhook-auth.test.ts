/**
 * internal-webhook-auth.test.ts — V5-M1-06d / RQ-02 / STEP-02 / DEC-03.
 *
 * UNIT: verifyInternalApiKey FAIL-CLOSED.
 *   - INTERNAL_API_KEY chưa cấu hình → 503 INTERNAL_API_NOT_CONFIGURED (không fallback).
 *   - header thiếu / sai → 401; đúng → ok. So sánh hằng-thời-gian, độc lập độ dài.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { verifyInternalApiKey } from '@/src/shared/auth/internal-webhook-auth';

const req = (apiKey?: string) =>
  new NextRequest('http://localhost/api/webhook/payslip', {
    method: 'POST',
    headers: apiKey === undefined ? {} : { 'x-api-key': apiKey },
  });

describe('verifyInternalApiKey (RQ-02 / DEC-03)', () => {
  const ORIGINAL = process.env.INTERNAL_API_KEY;
  beforeEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = ORIGINAL;
  });

  it('secret chưa cấu hình → 503 (KHÔNG fallback dev key)', () => {
    const r = verifyInternalApiKey(req('dev-internal-key'));
    expect(r).toEqual({ ok: false, status: 503, code: 'INTERNAL_API_NOT_CONFIGURED' });
  });

  it('secret rỗng → 503', () => {
    process.env.INTERNAL_API_KEY = '';
    expect(verifyInternalApiKey(req('anything')).ok).toBe(false);
    expect((verifyInternalApiKey(req('anything')) as { status: number }).status).toBe(503);
  });

  it('header thiếu → 401', () => {
    process.env.INTERNAL_API_KEY = 's3cret-value';
    expect(verifyInternalApiKey(req())).toEqual({ ok: false, status: 401, code: 'UNAUTHORIZED' });
  });

  it('header sai → 401', () => {
    process.env.INTERNAL_API_KEY = 's3cret-value';
    expect(verifyInternalApiKey(req('wrong'))).toEqual({ ok: false, status: 401, code: 'UNAUTHORIZED' });
  });

  it('key sai độ dài khác → 401 (không throw do timingSafeEqual chênh độ dài)', () => {
    process.env.INTERNAL_API_KEY = 'short';
    expect(verifyInternalApiKey(req('a-much-longer-provided-key')).ok).toBe(false);
  });

  it('header đúng → ok', () => {
    process.env.INTERNAL_API_KEY = 's3cret-value';
    expect(verifyInternalApiKey(req('s3cret-value'))).toEqual({ ok: true });
  });
});
