/**
 * Pure / mocked unit tests for the JobPosting authoring service.
 *
 * Covers (targeted, fast):
 *   - normalizeSlugTitle + generateCanonicalSlug are deterministic.
 *   - assertMutationRole throws on non-mutation roles.
 *   - The service correctly surfaces AuthoringError with stable codes.
 *
 * Race / RLS / state machine matrix is covered by the integration test in
 * `tests/db/job-posting-authoring.integration.test.ts` (self-skipping when
 * DATABASE_URL_TEST is absent).
 */

import { describe, it, expect } from 'vitest';
import {
  generateCanonicalSlug,
  normalizeSlugTitle,
  stableShortSuffix,
  assertMutationRole,
  AuthoringError,
  ALLOWED_MUTATION_ROLES,
} from '@/src/domains/staffing/job-posting-authoring.service';

describe('job-posting-authoring/slug helpers', () => {
  it('normalizes Vietnamese diacritics and collapses separators', () => {
    expect(normalizeSlugTitle('Kỹ sư điện — Công trình')).toBe('ky-su-dien-cong-trinh');
  });

  it('returns empty string for empty input (caller substitutes "job")', () => {
    expect(normalizeSlugTitle('')).toBe('');
    expect(normalizeSlugTitle('   ')).toBe('');
    expect(normalizeSlugTitle('---')).toBe('');
  });

  it('clamps to 80 characters', () => {
    const long = 'a'.repeat(200);
    expect(normalizeSlugTitle(long).length).toBe(80);
  });

  it('stableShortSuffix is deterministic for the same seed', () => {
    expect(stableShortSuffix('seedA')).toBe(stableShortSuffix('seedA'));
    expect(stableShortSuffix('seedA')).not.toBe(stableShortSuffix('seedB'));
    expect(stableShortSuffix('seedA')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('generateCanonicalSlug is deterministic per (jobOpeningId, title)', () => {
    const slug1 = generateCanonicalSlug({ jobOpeningId: 'op-1', title: 'Kỹ sư X' });
    const slug2 = generateCanonicalSlug({ jobOpeningId: 'op-1', title: 'Kỹ sư X' });
    expect(slug1).toBe(slug2);
    expect(slug1).toMatch(/^ky-su-x-[0-9a-f]{8}$/);
  });

  it('generateCanonicalSlug differs per jobOpeningId', () => {
    const a = generateCanonicalSlug({ jobOpeningId: 'op-A', title: 'Kỹ sư X' });
    const b = generateCanonicalSlug({ jobOpeningId: 'op-B', title: 'Kỹ sư X' });
    expect(a).not.toBe(b);
  });

  it('generateCanonicalSlug uses "job-<suffix>" when title is empty', () => {
    const slug = generateCanonicalSlug({ jobOpeningId: 'op-1', title: '' });
    expect(slug).toMatch(/^job-[0-9a-f]{8}$/);
  });
});

describe('job-posting-authoring/assertMutationRole', () => {
  it('allows the three mutation roles', () => {
    for (const role of ['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const) {
      expect(() => assertMutationRole({ userId: 'u', role })).not.toThrow();
    }
  });

  it.each([
    'SALE',
    'PM',
    'ACCOUNTANT',
    'DIRECTOR',
    'WORKER',
    'MKT',
    'VENDOR_ADMIN',
    'VENDOR_STAFF',
    'CTV',
  ] as const)('rejects role %s', (role) => {
    expect(() => assertMutationRole({ userId: 'u', role })).toThrow(AuthoringError);
  });

  it('ALLOWED_MUTATION_ROLES is exactly {ADMIN, HR_MANAGER, HR_STAFF}', () => {
    expect([...ALLOWED_MUTATION_ROLES].sort()).toEqual(['ADMIN', 'HR_MANAGER', 'HR_STAFF'].sort());
  });

  it('AuthoringError carries httpStatus 403 on PERMISSION_DENIED', () => {
    try {
      assertMutationRole({ userId: 'u', role: 'SALE' });
      throw new Error('expected to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AuthoringError);
      const err = e as AuthoringError;
      expect(err.code).toBe('PERMISSION_DENIED');
      expect(err.httpStatus).toBe(403);
    }
  });
});
