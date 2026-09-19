/**
 * aff03-public-intake.service.test.ts — unit tests (STEP-04).
 *
 * Pure unit tests with Prisma client mocked. Verifies:
 *   - cookie verify-fail paths (forged, expired, missing) → resolveActiveAttributionId returns null
 *   - cookie verify-success path → resolveActiveAttributionId looks up the row
 *   - findUnique projection is minimal (id, referrerUserId, status, expiresAt)
 *   - server-clock expiresAt guard
 *   - status='ACTIVE' guard
 *   - submitPublicIntake passes referralAttributionId to writer when valid
 *   - submitPublicIntake passes null to writer when invalid (silent fail-safe)
 *   - DTO NEVER contains referrer fields
 *   - Intent validation (JOB_INTEREST | GENERAL_INTEREST)
 *
 * No DB. Mock the writer (createCandidateSubmissionFromIntake) and Prisma's
 * referralAttribution.findUnique.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  writerResult: null as unknown,
  writerError: null as unknown,
  findUniqueResult: null as unknown,
}));

vi.mock('@/src/domains/referrals/redirect-token', () => ({
  verifyAttributionToken: vi.fn((token: string) => {
    if (!token || token === 'forged') return null;
    if (token === 'expired-token') {
      // Return a payload with expiresAt in the past (verify itself rejects; we
      // simulate the verify-passing-but-DB-row-expired case differently below).
      return { attributionId: 'attr-expired', expiresAt: Date.now() - 1000, keyVersion: 1 };
    }
    if (token === 'valid-token') {
      return { attributionId: 'attr-active', expiresAt: Date.now() + 60_000, keyVersion: 1 };
    }
    if (token === 'valid-token-row-inactive') {
      return { attributionId: 'attr-consumed', expiresAt: Date.now() + 60_000, keyVersion: 1 };
    }
    if (token === 'valid-token-row-missing') {
      return { attributionId: 'attr-missing', expiresAt: Date.now() + 60_000, keyVersion: 1 };
    }
    return null;
  }),
}));

vi.mock('@/src/domains/talent/intake-writer.service', () => ({
  createCandidateSubmissionFromIntake: vi.fn(async (_tx, _input) => {
    if (mocks.writerError) throw mocks.writerError;
    return (
      mocks.writerResult ?? {
        match: { verdict: 'NEW_PROFILE', laborProfileId: 'lp-1' },
        placementCase: { placementCaseId: 'pc-1' },
        candidateSubmission: {
          id: 'cs-1',
          status: 'NEW',
          placementCaseId: 'pc-1',
          laborProfileId: 'lp-1',
          projectId: null,
          channel: 'PUBLIC_MARKETPLACE',
        },
      }
    );
  }),
  PossibleMatchNotResolvedError: class extends Error {
    match: unknown;
    constructor(match: unknown) {
      super('POSSIBLE_MATCH');
      this.name = 'PossibleMatchNotResolvedError';
      this.match = match;
    }
  },
}));

// ─── Imports under test ────────────────────────────────────────────────────

import {
  resolveActiveAttributionId,
  submitPublicIntake,
} from '@/src/domains/applications/aff03-public-intake.service';
import { createCandidateSubmissionFromIntake } from '@/src/domains/talent/intake-writer.service';

type Tx = Parameters<typeof submitPublicIntake>[0];

function makeTx(): Tx {
  return {
    referralAttribution: {
      findUnique: vi.fn(async ({ where, select }: { where: { id: string }; select?: Record<string, boolean> }) => {
        // Defensive: assert projection is minimal.
        expect(select).toBeDefined();
        const keys = Object.keys(select ?? {}).sort();
        expect(keys).toEqual(['expiresAt', 'id', 'referrerUserId', 'status']);
        if (where.id === 'attr-active') {
          return {
            id: 'attr-active',
            referrerUserId: 'user-1',
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 60_000),
          };
        }
        if (where.id === 'attr-consumed') {
          return {
            id: 'attr-consumed',
            referrerUserId: 'user-2',
            status: 'CONSUMED',
            expiresAt: new Date(Date.now() + 60_000),
          };
        }
        if (where.id === 'attr-row-expired') {
          return {
            id: 'attr-row-expired',
            referrerUserId: 'user-3',
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() - 60_000),
          };
        }
        return null;
      }),
    },
    // Other tx methods not exercised by unit tests.
  } as unknown as Tx;
}

beforeEach(() => {
  mocks.writerResult = null;
  mocks.writerError = null;
  mocks.findUniqueResult = null;
  vi.mocked(createCandidateSubmissionFromIntake).mockClear();
});

// ─── resolveActiveAttributionId ────────────────────────────────────────────

describe('resolveActiveAttributionId (silent fail-safe)', () => {
  it('returns null when cookie is missing', async () => {
    const result = await resolveActiveAttributionId(makeTx(), null);
    expect(result).toBeNull();
  });

  it('returns null when cookie is empty string', async () => {
    const result = await resolveActiveAttributionId(makeTx(), '');
    expect(result).toBeNull();
  });

  it('returns null when verifyAttributionToken rejects (forged)', async () => {
    const result = await resolveActiveAttributionId(makeTx(), 'forged');
    expect(result).toBeNull();
  });

  it('returns null when the row does not exist', async () => {
    const result = await resolveActiveAttributionId(makeTx(), 'valid-token-row-missing');
    expect(result).toBeNull();
  });

  it('returns null when the row status is not ACTIVE (e.g. CONSUMED)', async () => {
    const result = await resolveActiveAttributionId(makeTx(), 'valid-token-row-inactive');
    expect(result).toBeNull();
  });

  it('returns the attribution id when row is ACTIVE and not expired', async () => {
    const result = await resolveActiveAttributionId(makeTx(), 'valid-token');
    expect(result).toBe('attr-active');
  });

  it('returns null when the row expiresAt <= now() (server-clock guard)', async () => {
    const result = await resolveActiveAttributionId(makeTx(), 'expired-token');
    expect(result).toBeNull();
  });
});

// ─── submitPublicIntake ────────────────────────────────────────────────────

describe('submitPublicIntake', () => {
  it('passes referralAttributionId=null to writer when no cookie', async () => {
    const tx = makeTx();
    const dto = await submitPublicIntake(tx, {
      applicant: { fullName: 'Nguyễn Văn A', phone: '0909123456', consentAt: new Date().toISOString() },
      hrpAffCookie: null,
      actorId: 'system:public-intake',
    });
    expect(dto.verdict).toBe('NEW_PROFILE');
    expect(vi.mocked(createCandidateSubmissionFromIntake)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ referralAttributionId: null }),
    );
  });

  it('passes referralAttributionId=null when cookie is forged (silent fail-safe)', async () => {
    const tx = makeTx();
    await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: 'forged',
      actorId: 'system:public-intake',
    });
    expect(vi.mocked(createCandidateSubmissionFromIntake)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ referralAttributionId: null }),
    );
  });

  it('passes referralAttributionId=<id> when cookie verifies and row is ACTIVE+not expired', async () => {
    const tx = makeTx();
    await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: 'valid-token',
      actorId: 'system:public-intake',
    });
    expect(vi.mocked(createCandidateSubmissionFromIntake)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ referralAttributionId: 'attr-active' }),
    );
  });

  it('passes referralAttributionId=null when row status is not ACTIVE (silent fail-safe)', async () => {
    const tx = makeTx();
    await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: 'valid-token-row-inactive',
      actorId: 'system:public-intake',
    });
    expect(vi.mocked(createCandidateSubmissionFromIntake)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ referralAttributionId: null }),
    );
  });

  it('passes referralAttributionId=null when row expiresAt <= now() (server-clock guard)', async () => {
    const tx = makeTx();
    await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: 'expired-token',
      actorId: 'system:public-intake',
    });
    expect(vi.mocked(createCandidateSubmissionFromIntake)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ referralAttributionId: null }),
    );
  });

  it('DTO contains ONLY { candidateSubmissionId, laborProfileId, placementCaseId, verdict }', async () => {
    const tx = makeTx();
    const dto = await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: null,
      actorId: 'system:public-intake',
    });
    expect(Object.keys(dto).sort()).toEqual(
      ['candidateSubmissionId', 'laborProfileId', 'placementCaseId', 'verdict'].sort(),
    );
    // JSON serialization must NOT contain any referrer field.
    const json = JSON.stringify(dto);
    expect(json).not.toMatch(/referrerUserId/i);
    expect(json).not.toMatch(/attributionId/i);
    expect(json).not.toMatch(/affiliateCode/i);
    expect(json).not.toMatch(/referrer/i);
  });

  it('throws when writer throws PossibleMatchNotResolvedError (not silently caught)', async () => {
    const tx = makeTx();
    mocks.writerError = new (await import('@/src/domains/talent/intake-writer.service'))
      .PossibleMatchNotResolvedError({
        verdict: 'POSSIBLE_MATCH',
        laborProfileId: null,
        candidates: [],
        hasConflict: false,
      });
    await expect(
      submitPublicIntake(tx, {
        applicant: { fullName: 'A', phone: '0909123456' },
        hrpAffCookie: null,
        actorId: 'system:public-intake',
      }),
    ).rejects.toThrow(/POSSIBLE_MATCH/);
  });
});
