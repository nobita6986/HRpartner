/**
 * cron-auth.test.ts — V5-M1-06b / RQ-11 / STEP-07 / DEC-09.
 *
 * UNIT (no DB): chứng minh `verifyCronSecret` FAIL-CLOSED:
 *   - secret chưa cấu hình → 503 CRON_NOT_CONFIGURED (KHÔNG mở cửa).
 *   - thiếu / sai header → 401.
 *   - đúng secret → ok.
 * Zero DB by construction: hàm chỉ đọc env + header, không nhận/không gọi client.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { verifyCronSecret } from './cron-auth';

/** Fake NextRequest chỉ hỗ trợ headers.get — đủ cho verifyCronSecret. */
function reqWith(header?: string): NextRequest {
  return {
    headers: { get: (k: string) => (k === 'x-cron-secret' ? header ?? null : null) },
  } as unknown as NextRequest;
}

const ORIGINAL = process.env.CRON_SECRET;

describe('verifyCronSecret — fail-closed cron auth (DEC-09)', () => {
  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIGINAL;
  });

  it('secret CHƯA cấu hình → 503 CRON_NOT_CONFIGURED (không mở cửa như if (SECRET && ...))', () => {
    const r = verifyCronSecret(reqWith('anything'));
    expect(r).toEqual({ ok: false, status: 503, code: 'CRON_NOT_CONFIGURED' });
  });

  it('secret rỗng → 503 (coi như chưa cấu hình)', () => {
    process.env.CRON_SECRET = '';
    const r = verifyCronSecret(reqWith('anything'));
    expect(r).toEqual({ ok: false, status: 503, code: 'CRON_NOT_CONFIGURED' });
  });

  it('có secret nhưng THIẾU header → 401', () => {
    process.env.CRON_SECRET = 's3cret-value';
    const r = verifyCronSecret(reqWith(undefined));
    expect(r).toEqual({ ok: false, status: 401, code: 'UNAUTHORIZED' });
  });

  it('header SAI → 401', () => {
    process.env.CRON_SECRET = 's3cret-value';
    const r = verifyCronSecret(reqWith('wrong-value'));
    expect(r).toEqual({ ok: false, status: 401, code: 'UNAUTHORIZED' });
  });

  it('header SAI nhưng CÙNG độ dài → 401 (so sánh nội dung, không chỉ độ dài)', () => {
    process.env.CRON_SECRET = 'abcdef';
    const r = verifyCronSecret(reqWith('abcdeg'));
    expect(r).toEqual({ ok: false, status: 401, code: 'UNAUTHORIZED' });
  });

  it('secret ĐÚNG → ok', () => {
    process.env.CRON_SECRET = 's3cret-value';
    const r = verifyCronSecret(reqWith('s3cret-value'));
    expect(r).toEqual({ ok: true });
  });
});
