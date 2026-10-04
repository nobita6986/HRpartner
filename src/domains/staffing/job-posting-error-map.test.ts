/**
 * job-posting-error-map.test.ts — hrp-m2a-operational-ux-debt / F8.
 *
 * Pure-function unit tests for the JobPosting safe-error mapper.
 * Mirrors the placement-ui.ts precedent: each documented code gets a
 * known-label assertion; the unknown / null / empty code path returns the
 * single generic safe fallback; `summarizeJobPostingApiError` composes
 * label + recovery href from a route JSON envelope without ever leaking
 * the raw `message` field.
 *
 * No React / no DOM / no Prisma. Vitest unit lane (forbidden-DB gate).
 */
import { describe, expect, it } from 'vitest';

import {
  JOB_POSTING_ERROR_LABELS,
  JOB_POSTING_RECOVERY_HINTS,
  JOB_POSTING_UNKNOWN_ERROR_LABEL,
  jobPostingErrorLabel,
  jobPostingRecoveryHref,
  summarizeJobPostingApiError,
  type JobPostingApiErrorEnvelope,
} from './job-posting-error-map';

describe('JOB_POSTING_ERROR_LABELS — stable code → Vietnamese label', () => {
  // RQ-04 / AC-05 — every documented code has a non-empty label.
  const expectedCodes = [
    'JOB_OPENING_NOT_OPEN',
    'INVALID_STATE_TRANSITION',
    'INVALID_REVISION',
    'INVALID_INPUT',
    'NOT_FOUND',
    'SLUG_COLLISION',
    'IDEMPOTENCY_CONFLICT',
    'PERMISSION_DENIED',
    'IDEMPOTENCY_REQUIRED',
    'INTERNAL',
    'FORBIDDEN',
    'UNAUTHORIZED',
  ] as const;

  it.each(expectedCodes)('has a non-empty label for %s', (code) => {
    const label = JOB_POSTING_ERROR_LABELS[code];
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('table contains at least 11 codes (R-04 / AC-05)', () => {
    expect(Object.keys(JOB_POSTING_ERROR_LABELS).length).toBeGreaterThanOrEqual(11);
  });

  it('every label is in Vietnamese (contains diacritic OR ASCII fallback)', () => {
    // Defensive — labels are recovery-oriented Vietnamese phrases. Any
    // accidental insertion of a raw English developer message would stand out
    // because the existing labels all carry diacritics.
    for (const code of Object.keys(JOB_POSTING_ERROR_LABELS)) {
      const label = JOB_POSTING_ERROR_LABELS[code]!;
      expect(label).toMatch(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợỡợùúụủũưừứựửữỳýỷỹđ]|\bJobPosting\b|\bJobOpening\b|\bIdempotency\b/);
    }
  });
});

describe('JOB_POSTING_RECOVERY_HINTS — known code → safe local href template', () => {
  it('JOB_OPENING_NOT_OPEN has the canonical /admin/job-openings/<id> template', () => {
    expect(JOB_POSTING_RECOVERY_HINTS.JOB_OPENING_NOT_OPEN).toBe(
      '/admin/job-openings/{{jobOpeningId}}',
    );
  });

  it('other codes do not introduce a recovery href today', () => {
    expect(Object.keys(JOB_POSTING_RECOVERY_HINTS)).toEqual(['JOB_OPENING_NOT_OPEN']);
  });
});

describe('jobPostingErrorLabel — pure code → label', () => {
  // RQ-04 / AC-05 — known codes return their table value.
  it('returns JOB_OPENING_NOT_OPEN label for the JOB_OPENING_NOT_OPEN code', () => {
    const label = jobPostingErrorLabel('JOB_OPENING_NOT_OPEN');
    expect(label).toBe(JOB_POSTING_ERROR_LABELS.JOB_OPENING_NOT_OPEN);
    // Case-insensitive — label uses lowercase "mở" mid-sentence.
    expect(label.toLowerCase()).toContain('mở jobopening');
    expect(label).toContain('publish JobPosting');
  });

  it('returns INVALID_STATE_TRANSITION label verbatim', () => {
    expect(jobPostingErrorLabel('INVALID_STATE_TRANSITION')).toBe(
      JOB_POSTING_ERROR_LABELS.INVALID_STATE_TRANSITION,
    );
  });

  it('returns INVALID_REVISION label verbatim', () => {
    expect(jobPostingErrorLabel('INVALID_REVISION')).toBe(
      JOB_POSTING_ERROR_LABELS.INVALID_REVISION,
    );
  });

  it('returns IDEMPOTENCY_CONFLICT label verbatim', () => {
    expect(jobPostingErrorLabel('IDEMPOTENCY_CONFLICT')).toBe(
      JOB_POSTING_ERROR_LABELS.IDEMPOTENCY_CONFLICT,
    );
  });

  // RQ-05 / AC-06 — unknown / null / empty / non-string → safe fallback.
  it('returns the generic safe fallback for an unknown code', () => {
    expect(jobPostingErrorLabel('NOT_A_REAL_CODE_XYZ')).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
  });

  it('returns the generic safe fallback for null', () => {
    expect(jobPostingErrorLabel(null)).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
  });

  it('returns the generic safe fallback for undefined', () => {
    expect(jobPostingErrorLabel(undefined)).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
  });

  it('returns the generic safe fallback for an empty string', () => {
    expect(jobPostingErrorLabel('')).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
  });

  it('returns the generic safe fallback for whitespace-only string', () => {
    expect(jobPostingErrorLabel('   ')).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
  });

  it('never returns a raw developer / DB message string', () => {
    // Defensive: even if a caller mistakenly passes a developer-authored
    // string, the function MUST NOT echo it. We pass a UUID-shaped string
    // and a SQL-fragment-looking string and assert the generic fallback.
    expect(jobPostingErrorLabel('123e4567-e89b-12d3-a456-426614174000')).toBe(
      JOB_POSTING_UNKNOWN_ERROR_LABEL,
    );
    expect(jobPostingErrorLabel('SELECT * FROM job_postings WHERE id=1')).toBe(
      JOB_POSTING_UNKNOWN_ERROR_LABEL,
    );
    expect(
      jobPostingErrorLabel('JobPosting 0b9864b4-1234-5678-9abc-def012345678 không tồn tại.'),
    ).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
  });

  it('honours the caller-provided fallback for unknown codes', () => {
    const fb = 'Custom caller fallback';
    expect(jobPostingErrorLabel('NOT_A_REAL_CODE_XYZ', fb)).toBe(fb);
    // Known code still wins over fallback.
    expect(jobPostingErrorLabel('NOT_FOUND', fb)).toBe(JOB_POSTING_ERROR_LABELS.NOT_FOUND);
  });
});

describe('jobPostingRecoveryHref — template interpolation with UUID guard', () => {
  const UUID = '0b9864b4-1234-5678-9abc-def012345678';

  it('JOB_OPENING_NOT_OPEN + UUID-shaped jobOpeningId → resolved href', () => {
    expect(jobPostingRecoveryHref('JOB_OPENING_NOT_OPEN', { jobOpeningId: UUID })).toBe(
      `/admin/job-openings/${UUID}`,
    );
  });

  it('JOB_OPENING_NOT_OPEN + missing jobOpeningId → null', () => {
    expect(jobPostingRecoveryHref('JOB_OPENING_NOT_OPEN', {})).toBeNull();
    expect(jobPostingRecoveryHref('JOB_OPENING_NOT_OPEN', { jobOpeningId: null })).toBeNull();
    expect(jobPostingRecoveryHref('JOB_OPENING_NOT_OPEN', null)).toBeNull();
  });

  it('JOB_OPENING_NOT_OPEN + non-UUID jobOpeningId → null (defensive)', () => {
    expect(
      jobPostingRecoveryHref('JOB_OPENING_NOT_OPEN', { jobOpeningId: 'not-a-uuid' }),
    ).toBeNull();
    expect(jobPostingRecoveryHref('JOB_OPENING_NOT_OPEN', { jobOpeningId: '1; DROP TABLE' })).toBeNull();
    expect(jobPostingRecoveryHref('JOB_OPENING_NOT_OPEN', { jobOpeningId: '' })).toBeNull();
  });

  it('unknown code → null (no recovery affordance)', () => {
    expect(jobPostingRecoveryHref('UNKNOWN', { jobOpeningId: UUID })).toBeNull();
    expect(jobPostingRecoveryHref(null, { jobOpeningId: UUID })).toBeNull();
    expect(jobPostingRecoveryHref(undefined, { jobOpeningId: UUID })).toBeNull();
  });

  it('never returns a non-repo-local href', () => {
    const resolved = jobPostingRecoveryHref('JOB_OPENING_NOT_OPEN', { jobOpeningId: UUID });
    expect(resolved).not.toMatch(/^https?:\/\//);
    expect(resolved).toMatch(/^\/admin\//);
  });
});

describe('summarizeJobPostingApiError — route envelope composer', () => {
  // RQ-04 / RQ-05 / AC-07 — label + recoveryHref composition.
  it('recognized code with jobOpeningId → known label + recovery href', () => {
    const UUID = '0b9864b4-1234-5678-9abc-def012345678';
    const env: JobPostingApiErrorEnvelope = {
      status: 409,
      error: 'JOB_OPENING_NOT_OPEN',
      message: 'Server message that MUST NOT be echoed',
      details: { jobOpeningId: UUID },
    };
    const summary = summarizeJobPostingApiError(env);
    expect(summary.label).toBe(JOB_POSTING_ERROR_LABELS.JOB_OPENING_NOT_OPEN);
    expect(summary.recoveryHref).toBe(`/admin/job-openings/${UUID}`);
    // Critical: the server message must NOT appear in the label.
    expect(summary.label).not.toContain('Server message');
    expect(summary.label).not.toContain(UUID);
  });

  it('recognized code without jobOpeningId → known label, null recovery', () => {
    const env: JobPostingApiErrorEnvelope = {
      status: 409,
      error: 'INVALID_REVISION',
      message: 'Revision mismatch: client=2, server=5.',
    };
    const summary = summarizeJobPostingApiError(env);
    expect(summary.label).toBe(JOB_POSTING_ERROR_LABELS.INVALID_REVISION);
    expect(summary.recoveryHref).toBeNull();
    // Critical: the server message must NOT appear in the label.
    expect(summary.label).not.toContain('Revision mismatch');
    expect(summary.label).not.toContain('client=2');
    expect(summary.label).not.toContain('server=5');
  });

  it('unrecognized code → generic safe fallback, null recovery', () => {
    const env: JobPostingApiErrorEnvelope = {
      status: 500,
      error: 'WHATEVER_NEW_CODE',
      message: 'Some developer-authored detail that MUST be redacted.',
    };
    const summary = summarizeJobPostingApiError(env);
    expect(summary.label).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
    expect(summary.recoveryHref).toBeNull();
    expect(summary.label).not.toContain('developer-authored');
    expect(summary.label).not.toContain('Some developer');
  });

  it('null envelope → generic safe fallback, null recovery', () => {
    const summary = summarizeJobPostingApiError(null);
    expect(summary.label).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
    expect(summary.recoveryHref).toBeNull();
  });

  it('undefined envelope → generic safe fallback, null recovery', () => {
    const summary = summarizeJobPostingApiError(undefined);
    expect(summary.label).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
    expect(summary.recoveryHref).toBeNull();
  });

  it('non-object envelope (defensive) → generic safe fallback', () => {
    // Cast through unknown to bypass the type guard intentionally.
    const summary = summarizeJobPostingApiError('not-an-object' as unknown as JobPostingApiErrorEnvelope);
    expect(summary.label).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
    expect(summary.recoveryHref).toBeNull();
  });

  it('2xx status envelope is caller misuse → generic safe fallback (defensive)', () => {
    const summary = summarizeJobPostingApiError({ status: 200, error: 'OK' });
    expect(summary.label).toBe(JOB_POSTING_UNKNOWN_ERROR_LABEL);
    expect(summary.recoveryHref).toBeNull();
  });

  it('missing status (status: undefined) still routes through composer', () => {
    const summary = summarizeJobPostingApiError({ error: 'NOT_FOUND', message: 'oops' });
    expect(summary.label).toBe(JOB_POSTING_ERROR_LABELS.NOT_FOUND);
    expect(summary.recoveryHref).toBeNull();
    expect(summary.label).not.toContain('oops');
  });
});