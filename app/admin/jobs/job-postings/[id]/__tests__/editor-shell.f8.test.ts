/**
 * app/admin/jobs/job-postings/[id]/__tests__/editor-shell.f8.test.ts
 *
 * hrp-m2a-operational-ux-debt (F8, integrated by T1B UI V1):
 *
 * Unit tests xác nhận editor shell CONSUME shared safe mapper
 * `summarizeJobPostingApiError` qua `readApiErrorSummary(res, fallbackJobOpeningId)`
 * đúng cách. KHÔNG echo raw `body.message`, UUID, SQL, stack hay PII.
 *
 * Coverage (per T0 directive):
 *   - known code → safe Vietnamese message (mapper table value)
 *   - `JOB_OPENING_NOT_OPEN` → recovery link canonical href (jobOpeningId interpolated)
 *   - unknown / null response → generic safe fallback
 *   - raw `body.message` + UUID không xuất hiện trong DOM (verified via summary.label + summary.recoveryHref)
 *
 * T1A owns the mapper (Mốc 2A). T1B owns the call site (editor shell).
 *
 * Pure unit lane — không cần DOM env, không cần `@testing-library/react`.
 */

import { describe, it, expect } from 'vitest';

import {
  readApiErrorSummary,
} from '../editor-shell';
import { JOB_POSTING_UNKNOWN_ERROR_LABEL } from '@/src/domains/staffing/job-posting-error-map';

const EDITOR_JOB_OPENING_ID = '11111111-1111-1111-1111-111111111111';

function makeJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeTextResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

describe('F8 integration — editor-shell.readApiErrorSummary (hrp-m2a-operational-ux-debt)', () => {
  it('known code (INVALID_REVISION) → safe Vietnamese message from JOB_POSTING_ERROR_LABELS', async () => {
    const res = makeJsonResponse(409, {
      status: 409,
      error: 'INVALID_REVISION',
      // Sensitive content that MUST NOT be echoed into the summary.
      message:
        'db error: stale row version 7 expected 8 (UUID=00000000-0000-0000-0000-0000000000aa)',
      details: { jobOpeningId: EDITOR_JOB_OPENING_ID },
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toContain(
      'Phiên bản JobPosting đã được người khác cập nhật',
    );
    // Mapper table value, not raw body.message.
    expect(summary.label).not.toContain('db error');
    expect(summary.label).not.toContain('stale row');
    expect(summary.label).not.toContain('00000000-0000-0000-0000-0000000000aa');
    // No recovery href for INVALID_REVISION.
    expect(summary.recoveryHref).toBeNull();
  });

  it('JOB_OPENING_NOT_OPEN → recovery href points at canonical /admin/job-openings/<uuid>', async () => {
    const res = makeJsonResponse(409, {
      status: 409,
      error: 'JOB_OPENING_NOT_OPEN',
      message:
        'JobOpening 11111111-1111-1111-1111-111111111111 is CLOSED, expected OPEN',
      details: { jobOpeningId: EDITOR_JOB_OPENING_ID },
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toContain('Linked JobOpening chưa ở trạng thái OPEN');
    expect(summary.recoveryHref).toBe(`/admin/job-openings/${EDITOR_JOB_OPENING_ID}`);
  });

  it('JOB_OPENING_NOT_OPEN WITHOUT server-supplied jobOpeningId → falls back to editor jobOpeningId', async () => {
    const res = makeJsonResponse(409, {
      status: 409,
      error: 'JOB_OPENING_NOT_OPEN',
      message: 'sensitive stack trace line',
      details: null,
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toContain('Linked JobOpening chưa ở trạng thái OPEN');
    expect(summary.recoveryHref).toBe(`/admin/job-openings/${EDITOR_JOB_OPENING_ID}`);
  });

  it('JOB_OPENING_NOT_OPEN WITH non-UUID jobOpeningId → recovery href stays null (defensive)', async () => {
    const res = makeJsonResponse(409, {
      status: 409,
      error: 'JOB_OPENING_NOT_OPEN',
      message: 'sensitive stack trace line',
      details: { jobOpeningId: 'not-a-uuid' },
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toContain('Linked JobOpening chưa ở trạng thái OPEN');
    // jobPostingRecoveryHref rejects non-UUID strings; safe fallback is to stay on the page.
    expect(summary.recoveryHref).toBeNull();
  });

  it('unknown code → generic safe fallback (single source of truth)', async () => {
    const res = makeJsonResponse(500, {
      status: 500,
      error: 'SOME_MADE_UP_CODE',
      message:
        'PrismaClientKnownRequestError: relation "job_postings" violates check constraint (UUID=12345678-1234-1234-1234-123456789abc)',
      details: { jobOpeningId: EDITOR_JOB_OPENING_ID },
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
    // Raw message + UUID are NEVER echoed.
    expect(summary.label).not.toContain('PrismaClientKnownRequestError');
    expect(summary.label).not.toContain('violates check constraint');
    expect(summary.label).not.toContain('12345678-1234-1234-1234-123456789abc');
    expect(summary.recoveryHref).toBeNull();
  });

  it('null response body (503 text/plain) → generic safe fallback, no crash', async () => {
    const res = makeTextResponse(503);
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
    expect(summary.recoveryHref).toBeNull();
  });

  it('2xx response is defensive misuse — mapper returns safe fallback (NOT authoritatively "success")', async () => {
    const res = makeJsonResponse(200, {
      status: 200,
      error: null,
      message: 'should not be echoed',
      details: null,
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
    expect(summary.label).not.toContain('should not be echoed');
    expect(summary.recoveryHref).toBeNull();
  });

  it('raw body.message + UUID NEVER appears in summary.label (full coverage of the directive)', async () => {
    const secretUuid = '99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const res = makeJsonResponse(409, {
      status: 409,
      error: 'JOB_OPENING_NOT_OPEN',
      message: `PrismaClientKnownRequestError at JobOpening ${secretUuid}: foreign key violation`,
      details: { jobOpeningId: EDITOR_JOB_OPENING_ID },
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).not.toContain('PrismaClientKnownRequestError');
    expect(summary.label).not.toContain('foreign key violation');
    expect(summary.label).not.toContain(secretUuid);
    // The safe href uses the EDITOR jobOpeningId (not the secret UUID).
    expect(summary.recoveryHref).toBe(`/admin/job-openings/${EDITOR_JOB_OPENING_ID}`);
    expect(summary.recoveryHref).not.toContain(secretUuid);
  });

  it('PERMISSION_DENIED → safe label, no recovery link (operator-correctable in place)', async () => {
    const res = makeJsonResponse(403, {
      status: 403,
      error: 'PERMISSION_DENIED',
      message: 'sensitive role info',
      details: null,
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toContain('không có quyền thực hiện thao tác JobPosting');
    expect(summary.recoveryHref).toBeNull();
  });

  it('FORBIDDEN (route-level) → safe label, no recovery link', async () => {
    const res = makeJsonResponse(403, {
      status: 403,
      error: 'FORBIDDEN',
      message: 'sensitive role info',
      details: null,
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toContain('không có quyền truy cập JobPosting này');
    expect(summary.recoveryHref).toBeNull();
  });

  it('UNAUTHORIZED → safe Vietnamese label, no recovery link', async () => {
    const res = makeJsonResponse(401, {
      status: 401,
      error: 'UNAUTHORIZED',
      message: 'sensitive session info',
      details: null,
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toContain('Phiên đăng nhập đã hết hạn');
    expect(summary.recoveryHref).toBeNull();
  });

  it('SLUG_COLLISION → safe Vietnamese label, no recovery link', async () => {
    const res = makeJsonResponse(409, {
      status: 409,
      error: 'SLUG_COLLISION',
      message: 'sensitive collision info',
      details: null,
    });
    const summary = await readApiErrorSummary(res, EDITOR_JOB_OPENING_ID);
    expect(summary.label).toContain('slug duy nhất cho JobPosting');
    expect(summary.recoveryHref).toBeNull();
  });
});