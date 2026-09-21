/**
 * aff03-public-intake.service.test.ts — unit tests (STEP-04, slice 03b).
 *
 * Pure unit tests with Prisma `$queryRaw` mocked. Verifies:
 *   - cookie verify-fail paths (forged, expired, missing) →
 *     resolveActiveAttributionId returns null
 *   - cookie verify-success path → resolveActiveAttributionId looks up the row
 *   - findUnique projection is minimal (id, referrerUserId, status, expiresAt)
 *   - server-clock expiresAt guard
 *   - status='ACTIVE' guard
 *   - TOKEN_SIGNING_ERROR (missing/short `RATE_LIMIT_HASH_SECRET`) → null
 *   - submitPublicIntake delegates the full write chain to
 *     `hrp_public_intake_submission(jsonb)` (DEC-01, DEC-11) — NOT to the
 *     Prisma writer `createCandidateSubmissionFromIntake` (which is preserved
 *     for non-anon flows).
 *   - DTO NEVER contains referrer fields
 *   - RPC return shape → DTO mapping (5-row shape)
 *   - `verdict='POSSIBLE_MATCH'` → throws PossibleMatchNotResolvedError
 *
 * No DB. Mock `tx.$queryRaw` to return canned RPC rows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────

interface IntakeRpcRow {
  labor_profile_id: string | null;
  candidate_submission_id: string | null;
  placement_case_id: string | null;
  verdict: 'EXACT_MATCH' | 'NEW_PROFILE' | 'POSSIBLE_MATCH';
  possible_match: unknown | null;
  attribution_consumed: boolean;
}

const mocks = vi.hoisted(() => ({
  rpcResult: null as IntakeRpcRow[] | null,
  rpcError: null as unknown,
  queryRawCalls: [] as Array<{ sql: string; values: unknown[] }>,
}));

vi.mock('@/src/domains/referrals/redirect-token', () => ({
  verifyAttributionToken: vi.fn((token: string) => {
    if (!token || token === 'forged') return null;
    if (token === 'expired-token') {
      // verify-passing-but-DB-row-expired simulated below
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
    if (token === 'token-signing-error') {
      // Simulates TOKEN_SIGNING_ERROR thrown by verifyAttributionToken when
      // RATE_LIMIT_HASH_SECRET is missing or too short.
      throw new Error('TOKEN_SIGNING_ERROR: RATE_LIMIT_HASH_SECRET missing or too short');
    }
    return null;
  }),
}));

// ─── Imports under test ────────────────────────────────────────────────────

import {
  resolveActiveAttributionId,
  submitPublicIntake,
  PossibleMatchNotResolvedError,
} from '@/src/domains/applications/aff03-public-intake.service';

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
    $queryRaw: vi.fn(async (sql: TemplateStringsArray | string, ...values: unknown[]) => {
      // Capture for assertions; ignore template-tag-vs-string in capture.
      const sqlText =
        typeof sql === 'string'
          ? sql
          : Array.isArray(sql)
            ? (sql as unknown as readonly string[]).join('?')
            : String(sql);
      mocks.queryRawCalls.push({ sql: sqlText, values });
      if (mocks.rpcError) throw mocks.rpcError;
      return (
        mocks.rpcResult ?? [
          {
            labor_profile_id: 'lp-1',
            candidate_submission_id: 'cs-1',
            placement_case_id: 'pc-1',
            verdict: 'NEW_PROFILE' as const,
            possible_match: null,
            attribution_consumed: false,
          },
        ]
      );
    }),
  } as unknown as Tx;
}

beforeEach(() => {
  mocks.rpcResult = null;
  mocks.rpcError = null;
  mocks.queryRawCalls.length = 0;
});

// ─── resolveActiveAttributionId ────────────────────────────────────────────

describe('resolveActiveAttributionId (silent fail-safe, DEC-05)', () => {
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

  it('returns null when TOKEN_SIGNING_ERROR is thrown (missing/short secret)', async () => {
    const result = await resolveActiveAttributionId(makeTx(), 'token-signing-error');
    expect(result).toBeNull();
  });
});

// ─── submitPublicIntake ────────────────────────────────────────────────────

describe('submitPublicIntake (Full RPC path, DEC-01/DEC-11)', () => {
  it('passes referralAttributionId=null to RPC when no cookie', async () => {
    const tx = makeTx();
    const dto = await submitPublicIntake(tx, {
      applicant: { fullName: 'Nguyễn Văn A', phone: '0909123456', consentAt: new Date().toISOString() },
      hrpAffCookie: null,
      actorId: 'system:public-intake',
    });
    expect(dto.verdict).toBe('NEW_PROFILE');
    expect(dto.laborProfileId).toBe('lp-1');
    expect(dto.candidateSubmissionId).toBe('cs-1');
    expect(dto.placementCaseId).toBe('pc-1');
    expect(mocks.queryRawCalls.length).toBe(1);
    // The payload is JSON-encoded into one arg.
    const payloadArg = mocks.queryRawCalls[0]?.values[0];
    expect(typeof payloadArg).toBe('string');
    const parsed = JSON.parse(payloadArg as string) as Record<string, unknown>;
    expect(parsed.referralAttributionId).toBeNull();
    expect(parsed.fullName).toBe('Nguyễn Văn A');
  });

  it('passes referralAttributionId=null when cookie is forged (silent fail-safe)', async () => {
    const tx = makeTx();
    await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: 'forged',
      actorId: 'system:public-intake',
    });
    const payloadArg = mocks.queryRawCalls[0]?.values[0];
    expect(typeof payloadArg).toBe('string');
    const parsed = JSON.parse(payloadArg as string) as Record<string, unknown>;
    expect(parsed.referralAttributionId).toBeNull();
  });

  it('passes referralAttributionId=<id> when cookie verifies and row is ACTIVE+not expired', async () => {
    const tx = makeTx();
    await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: 'valid-token',
      actorId: 'system:public-intake',
    });
    const payloadArg = mocks.queryRawCalls[0]?.values[0];
    const parsed = JSON.parse(payloadArg as string) as Record<string, unknown>;
    expect(parsed.referralAttributionId).toBe('attr-active');
  });

  it('passes referralAttributionId=null when row status is not ACTIVE (silent fail-safe)', async () => {
    const tx = makeTx();
    await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: 'valid-token-row-inactive',
      actorId: 'system:public-intake',
    });
    const payloadArg = mocks.queryRawCalls[0]?.values[0];
    const parsed = JSON.parse(payloadArg as string) as Record<string, unknown>;
    expect(parsed.referralAttributionId).toBeNull();
  });

  it('passes referralAttributionId=null when row expiresAt <= now() (server-clock guard)', async () => {
    const tx = makeTx();
    await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: 'expired-token',
      actorId: 'system:public-intake',
    });
    const payloadArg = mocks.queryRawCalls[0]?.values[0];
    const parsed = JSON.parse(payloadArg as string) as Record<string, unknown>;
    expect(parsed.referralAttributionId).toBeNull();
  });

  it('passes referralAttributionId=null on TOKEN_SIGNING_ERROR (silent fail-safe)', async () => {
    const tx = makeTx();
    await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: 'token-signing-error',
      actorId: 'system:public-intake',
    });
    const payloadArg = mocks.queryRawCalls[0]?.values[0];
    const parsed = JSON.parse(payloadArg as string) as Record<string, unknown>;
    expect(parsed.referralAttributionId).toBeNull();
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

  it('throws PossibleMatchNotResolvedError when RPC returns verdict=POSSIBLE_MATCH', async () => {
    mocks.rpcResult = [
      {
        labor_profile_id: null,
        candidate_submission_id: null,
        placement_case_id: null,
        verdict: 'POSSIBLE_MATCH' as const,
        possible_match: {
          candidates: [
            {
              laborProfileId: 'lp-cand-1',
              signalsMatched: ['phone', 'full_name'],
              conflictingEvidence: [],
            },
          ],
          signalsProvided: 3,
        },
        attribution_consumed: false,
      },
    ];
    const tx = makeTx();
    await expect(
      submitPublicIntake(tx, {
        applicant: { fullName: 'A', phone: '0909123456' },
        hrpAffCookie: null,
        actorId: 'system:public-intake',
      }),
    ).rejects.toThrow(PossibleMatchNotResolvedError);
  });

  it('maps verdict=EXACT_MATCH from RPC to DTO verdict=EXACT_MATCH', async () => {
    mocks.rpcResult = [
      {
        labor_profile_id: 'lp-existing',
        candidate_submission_id: 'cs-existing',
        placement_case_id: 'pc-existing',
        verdict: 'EXACT_MATCH' as const,
        possible_match: null,
        attribution_consumed: true,
      },
    ];
    const tx = makeTx();
    const dto = await submitPublicIntake(tx, {
      applicant: { fullName: 'A', phone: '0909123456' },
      hrpAffCookie: null,
      actorId: 'system:public-intake',
    });
    expect(dto.verdict).toBe('EXACT_MATCH');
    expect(dto.laborProfileId).toBe('lp-existing');
  });

  it('propagates RPC errors (defense in depth — never swallows)', async () => {
    mocks.rpcError = new Error('RPC_DOWN');
    const tx = makeTx();
    await expect(
      submitPublicIntake(tx, {
        applicant: { fullName: 'A', phone: '0909123456' },
        hrpAffCookie: null,
        actorId: 'system:public-intake',
      }),
    ).rejects.toThrow(/RPC_DOWN/);
  });

  it('throws when RPC returns 0 rows (defensive guard)', async () => {
    mocks.rpcResult = [];
    const tx = makeTx();
    await expect(
      submitPublicIntake(tx, {
        applicant: { fullName: 'A', phone: '0909123456' },
        hrpAffCookie: null,
        actorId: 'system:public-intake',
      }),
    ).rejects.toThrow(/returned 0 rows/);
  });

  it('throws when RPC returns NULL ids for verdict=EXACT_MATCH/NEW_PROFILE', async () => {
    mocks.rpcResult = [
      {
        labor_profile_id: null,
        candidate_submission_id: 'cs-1',
        placement_case_id: 'pc-1',
        verdict: 'NEW_PROFILE' as const,
        possible_match: null,
        attribution_consumed: false,
      },
    ];
    const tx = makeTx();
    await expect(
      submitPublicIntake(tx, {
        applicant: { fullName: 'A', phone: '0909123456' },
        hrpAffCookie: null,
        actorId: 'system:public-intake',
      }),
    ).rejects.toThrow(/NULL ids/);
  });
});
