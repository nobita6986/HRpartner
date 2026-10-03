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

import { describe, it, expect, vi } from 'vitest';
import {
  generateCanonicalSlug,
  normalizeSlugTitle,
  stableShortSuffix,
  assertMutationRole,
  assertHrStaffRecruiterScope,
  AuthoringError,
  ALLOWED_MUTATION_ROLES,
} from '@/src/domains/staffing/job-posting-authoring.service';
import {
  RecruiterAssignmentError,
  RECRUITER_ASSIGNMENT_STATUS,
} from '@/src/domains/talent/recruiter-assignment.service';

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

/**
 * hrp-f9-hr-staff-jobposting-scope (DEC-02, DEC-05, DEC-08) — unit coverage
 * for the new `assertHrStaffRecruiterScope` guard. The integration test
 * `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` covers
 * the end-to-end scenarios on synthetic DB; here we prove the helper's
 * surface (HR_STAFF reject / ADMIN bypass / HR_MANAGER bypass / message
 * canonical-safety) at the service boundary with a mocked Prisma
 * transaction client.
 */
describe('job-posting-authoring/assertHrStaffRecruiterScope (F9)', () => {
  // Minimal Prisma transaction client mock — only the
  // `staffingOrderRecruiterAssignment.findFirst` call path is exercised.
  // Other Prisma calls in the helper's reach (none today) would simply not
  // be invoked.
  function makeTx(
    findFirstResult: unknown,
  ): { staffingOrderRecruiterAssignment: { findFirst: ReturnType<typeof vi.fn> } } {
    return {
      staffingOrderRecruiterAssignment: {
        findFirst: vi.fn(async () => findFirstResult),
      },
    };
  }

  it('HR_STAFF on ACTIVE assignment → no throw (canonical bypass via the inner helper)', async () => {
    const tx = makeTx({ id: 'assignment-active-1' });
    await expect(
      assertHrStaffRecruiterScope(
        tx as never,
        { userId: 'alice', role: 'HR_STAFF' },
        'order-A',
      ),
    ).resolves.toBeUndefined();
    expect(tx.staffingOrderRecruiterAssignment.findFirst).toHaveBeenCalledWith({
      where: {
        staffingOrderId: 'order-A',
        recruiterUserId: 'alice',
        status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
      },
      select: { id: true },
    });
  });

  it('HR_STAFF on unassigned order → AuthoringError NO_ACTIVE_ORDER_ASSIGNMENT (403)', async () => {
    const tx = makeTx(null);
    try {
      await assertHrStaffRecruiterScope(
        tx as never,
        { userId: 'alice', role: 'HR_STAFF' },
        'order-C',
      );
      throw new Error('expected to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AuthoringError);
      const err = e as AuthoringError;
      expect(err.code).toBe('NO_ACTIVE_ORDER_ASSIGNMENT');
      expect(err.httpStatus).toBe(403);
      // AC-10: the envelope must NOT leak slotId, staffingOrderId, projectId,
      // assigneeUserId, JobPosting.id, or actorId.
      expect(err.message).not.toContain('order-C');
      expect(err.message).not.toContain('alice');
      expect(err.message).not.toContain('slot');
      expect(err.message).not.toContain('project');
      expect(err.message).not.toContain('assignee');
      // And no `details` object — the helper's default carries
      // `actorId` + `staffingOrderId`; we drop it intentionally.
      expect(err.details).toBeUndefined();
    }
  });

  it('HR_STAFF on REVOKED assignment → AuthoringError NO_ACTIVE_ORDER_ASSIGNMENT (403)', async () => {
    // `findFirst` returns null because the canonical helper filters on
    // `status = 'ACTIVE'` — a REVOKED row never matches.
    const tx = makeTx(null);
    await expect(
      assertHrStaffRecruiterScope(
        tx as never,
        { userId: 'alice', role: 'HR_STAFF' },
        'order-D',
      ),
    ).rejects.toBeInstanceOf(AuthoringError);
  });

  it('HR_STAFF on another-recruiter\'s order → AuthoringError NO_ACTIVE_ORDER_ASSIGNMENT (403)', async () => {
    // `findFirst` filtered by `recruiterUserId = actorId` — Bob's
    // assignment for Alice's actorId returns null.
    const tx = makeTx(null);
    try {
      await assertHrStaffRecruiterScope(
        tx as never,
        { userId: 'alice', role: 'HR_STAFF' },
        'order-B',
      );
      throw new Error('expected to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AuthoringError);
      expect((e as AuthoringError).code).toBe('NO_ACTIVE_ORDER_ASSIGNMENT');
    }
  });

  it('ADMIN bypass → no throw, NO DB call', async () => {
    const tx = makeTx(null);
    await expect(
      assertHrStaffRecruiterScope(
        tx as never,
        { userId: 'admin', role: 'ADMIN' },
        'order-X',
      ),
    ).resolves.toBeUndefined();
    // Canonical helper returns early before any DB read.
    expect(tx.staffingOrderRecruiterAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('HR_MANAGER bypass → no throw, NO DB call', async () => {
    const tx = makeTx(null);
    await expect(
      assertHrStaffRecruiterScope(
        tx as never,
        { userId: 'manager', role: 'HR_MANAGER' },
        'order-X',
      ),
    ).resolves.toBeUndefined();
    expect(tx.staffingOrderRecruiterAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('re-throws non-NO_ACTIVE_ORDER_ASSIGNMENT RecruiterAssignmentError unchanged (no swallow)', async () => {
    // Simulate a sibling error from the inner helper (e.g. ROLE_NOT_PERMITTED
    // for a non-HR_STAFF role that somehow reached the helper). The wrapper
    // must NOT swallow; the inner error class + code must propagate.
    const err = new RecruiterAssignmentError(
      'ROLE_NOT_PERMITTED',
      'Role X cannot act on a recruiter-scoped placement',
      403,
    );
    const tx = {
      staffingOrderRecruiterAssignment: {
        findFirst: vi.fn(async () => {
          throw err;
        }),
      },
    };
    await expect(
      assertHrStaffRecruiterScope(
        tx as never,
        { userId: 'alice', role: 'HR_STAFF' },
        'order-A',
      ),
    ).rejects.toBe(err);
  });
});
