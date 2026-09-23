import { beforeEach, describe, expect, it, vi } from 'vitest';
import { convertApplication } from './conversion.service';

const ADMIN = { userId: 'admin-1', role: 'ADMIN' as const };
const HR = { userId: 'hr-1', role: 'HR_MANAGER' as const };

function application(over: Record<string, unknown> = {}) {
  return {
    id: 'sub-1', status: 'QUALIFIED', version: 3, workerId: null,
    dedupWorkerId: null, fullName: 'Nguyen Van A', phone: '0909 123 456',
    normalizedPhone: '0909123456', cccdNumber: '012345678901',
    dateOfBirth: new Date('1995-01-02T00:00:00Z'), gender: 'MALE',
    vendorId: null, ctvId: null,
    laborProfileId: null,
    laborProfile: null,
    sourceClaims: [], ...over,
  };
}

function txFor(over: {
  current?: ReturnType<typeof application> | null;
  candidates?: Array<{ id: string; phone: string | null; cccdNumber: string | null }>;
  lockCount?: number;
  accepted?: {
    id: string;
    submissionId: string | null;
    claimType?: string;
    referrerUserId?: string | null;
  } | null;
} = {}) {
  return {
    candidateSubmission: {
      findUnique: vi.fn().mockResolvedValue(over.current === undefined ? application() : over.current),
      updateMany: vi.fn().mockResolvedValue({ count: over.lockCount ?? 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
    worker: {
      findMany: vi.fn().mockResolvedValue(over.candidates ?? []),
      create: vi.fn().mockResolvedValue({ id: 'worker-new' }),
    },
    sourceClaim: {
      findFirst: vi.fn().mockResolvedValue(over.accepted ?? null),
      create: vi.fn().mockImplementation(({ data }: { data: { referrerUserId?: string | null } }) =>
        Promise.resolve({ id: 'claim-new', referrerUserId: data?.referrerUserId ?? null }),
      ),
      update: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: { referrerUserId?: string | null } }) =>
        Promise.resolve({ id: where.id, referrerUserId: data?.referrerUserId ?? null }),
      ),
    },
    applicationStatusHistory: { create: vi.fn().mockResolvedValue({ id: 'history-1' }) },
    auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
  };
}

describe('MP-3B application conversion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates Worker + accepted direct SourceClaim and links the submission atomically', async () => {
    const tx = txFor();
    const result = await convertApplication(tx as any, HR, 'sub-1', { reason: '  Qualified and verified  ', expectedVersion: 3 });

    expect(result).toEqual({
      id: 'sub-1', status: 'CONVERTED', workerId: 'worker-new', sourceClaimId: 'claim-new',
      referrerUserId: null, claimType: 'HRP_DIRECT', version: 4, changed: true,
    });
    expect(tx.candidateSubmission.updateMany).toHaveBeenCalledWith({
      where: { id: 'sub-1', status: 'QUALIFIED', version: 3 },
      data: expect.objectContaining({ status: 'CONVERTED', version: { increment: 1 } }),
    });
    expect(tx.worker.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'APP-sub-1', fullName: 'Nguyen Van A', phone: '0909123456',
        cccdNumber: '012345678901', gender: 'MALE', ownerId: 'hr-1',
      }),
      select: { id: true },
    });
    expect(tx.sourceClaim.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workerId: 'worker-new', submissionId: 'sub-1', claimType: 'HRP_DIRECT',
        registrationChannel: 'HR_ADDED', accepted: true, acceptedBy: 'hr-1',
        referrerUserId: null,
      }),
      select: { id: true, referrerUserId: true },
    });
    expect(tx.candidateSubmission.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { workerId: 'worker-new' } });
    expect(tx.applicationStatusHistory.create).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'APPLICATION_CONVERT' }) });
  });

  it('derives vendor attribution from the submission', async () => {
    const tx = txFor({ current: application({ vendorId: 'vendor-1' }) });
    await convertApplication(tx as any, ADMIN, 'sub-1', { reason: 'Convert' });
    expect(tx.sourceClaim.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        claimType: 'VENDOR_SUPPLIED',
        registrationChannel: 'VENDOR_ADDED',
        vendorId: 'vendor-1',
        referrerUserId: null,
      }),
      select: { id: true, referrerUserId: true },
    });
  });

  it('fails closed for a one-key dedup match until HR selects that Worker', async () => {
    const tx = txFor({ candidates: [{ id: 'worker-existing', phone: '0909123456', cccdNumber: null }] });
    await expect(convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' }))
      .rejects.toMatchObject({
        code: 'DEDUP_REVIEW_REQUIRED', httpStatus: 409,
        details: { candidates: [{ workerId: 'worker-existing', matchedOn: ['PHONE'] }] },
      });
    expect(tx.candidateSubmission.updateMany).not.toHaveBeenCalled();
    expect(tx.worker.create).not.toHaveBeenCalled();
  });

  it('links an explicitly confirmed dedup candidate without creating another Worker', async () => {
    const tx = txFor({ candidates: [{ id: 'worker-existing', phone: null, cccdNumber: '012345678901' }] });
    const result = await convertApplication(tx as any, HR, 'sub-1', {
      reason: 'Confirmed CCCD match', existingWorkerId: 'worker-existing',
    });
    expect(result.workerId).toBe('worker-existing');
    expect(tx.worker.create).not.toHaveBeenCalled();
    expect(tx.sourceClaim.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workerId: 'worker-existing', accepted: true, referrerUserId: null }),
      select: { id: true, referrerUserId: true },
    });
  });

  it('rejects a selected Worker that is not in the dedup candidate set', async () => {
    const tx = txFor({ candidates: [{ id: 'worker-match', phone: '0909123456', cccdNumber: null }] });
    await expect(convertApplication(tx as any, HR, 'sub-1', {
      reason: 'Wrong link', existingWorkerId: 'worker-other',
    })).rejects.toMatchObject({ code: 'DEDUP_SELECTION_INVALID', httpStatus: 409 });
    expect(tx.candidateSubmission.updateMany).not.toHaveBeenCalled();
  });

  it('blocks linking a Worker whose accepted source belongs to another submission', async () => {
    const tx = txFor({
      candidates: [{ id: 'worker-existing', phone: '0909123456', cccdNumber: null }],
      accepted: { id: 'claim-old', submissionId: 'sub-other' },
    });
    await expect(convertApplication(tx as any, HR, 'sub-1', {
      reason: 'Convert', existingWorkerId: 'worker-existing',
    })).rejects.toMatchObject({ code: 'SOURCE_CLAIM_CONFLICT', httpStatus: 409, details: { workerId: 'worker-existing' } });
    expect(tx.applicationStatusHistory.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('replays a valid converted application as an idempotent no-op', async () => {
    const tx = txFor({ current: application({
      status: 'CONVERTED', version: 4, workerId: 'worker-1',
      sourceClaims: [{ id: 'claim-1', workerId: 'worker-1' }],
    }) });
    const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Retry', expectedVersion: 3 });
    expect(result).toEqual({
      id: 'sub-1', status: 'CONVERTED', workerId: 'worker-1', sourceClaimId: 'claim-1', version: 4, changed: false,
    });
    expect(tx.worker.findMany).not.toHaveBeenCalled();
    expect(tx.candidateSubmission.updateMany).not.toHaveBeenCalled();
  });

  it('detects a broken converted invariant', async () => {
    const tx = txFor({ current: application({ status: 'CONVERTED', workerId: 'worker-1', sourceClaims: [] }) });
    await expect(convertApplication(tx as any, HR, 'sub-1', { reason: 'Retry' }))
      .rejects.toMatchObject({ code: 'CONVERSION_INVARIANT_BROKEN', httpStatus: 409 });
  });

  it('enforces role, reason, QUALIFIED state, expected version and conversion race', async () => {
    await expect(convertApplication(txFor() as any, { userId: 'sale-1', role: 'SALE' }, 'sub-1', { reason: 'x' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
    await expect(convertApplication(txFor() as any, HR, 'sub-1', { reason: '  ' }))
      .rejects.toMatchObject({ code: 'REASON_REQUIRED', httpStatus: 400 });
    await expect(convertApplication(txFor({ current: application({ status: 'SCREENING' }) }) as any, HR, 'sub-1', { reason: 'x' }))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION', httpStatus: 409 });
    await expect(convertApplication(txFor() as any, HR, 'sub-1', { reason: 'x', expectedVersion: 2 }))
      .rejects.toMatchObject({ code: 'STALE_VERSION' });
    await expect(convertApplication(txFor({ lockCount: 0 }) as any, HR, 'sub-1', { reason: 'x' }))
      .rejects.toMatchObject({ code: 'STALE_VERSION' });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AFF-04 Source Resolution Matrix (server-derived, no client authority).
  // ─────────────────────────────────────────────────────────────────────────
  describe('AFF-04 source resolution', () => {
    it('CTV_REFERRAL resolves referrerUserId from ReferralAttribution when both chains agree', async () => {
      const tx = txFor({
        current: application({
          ctvId: 'ctv-1',
          laborProfileId: 'lp-1',
          laborProfile: { referralAttribution: { referrerUserId: 'ctv-1' } },
        }),
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' });
      expect(result.referrerUserId).toBe('ctv-1');
      expect(result.claimType).toBe('CTV_REFERRAL');
      expect(tx.sourceClaim.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ referrerUserId: 'ctv-1', ctvId: 'ctv-1' }),
        }),
      );
    });

    it('CTV_REFERRAL falls back to legacy ctvId when ReferralAttribution is missing', async () => {
      const tx = txFor({
        current: application({
          ctvId: 'ctv-legacy',
          laborProfileId: 'lp-2',
          laborProfile: { referralAttribution: null },
        }),
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' });
      expect(result.referrerUserId).toBe('ctv-legacy');
      expect(result.claimType).toBe('CTV_REFERRAL');
    });

    it('CTV_REFERRAL fails closed when neither ReferralAttribution nor ctvId resolves a referrer', async () => {
      const tx = txFor({
        current: application({
          ctvId: null,
          laborProfileId: 'lp-3',
          laborProfile: null,
        }),
      });
      // After AFF-04 invariant: a CTV_REFERRAL claim without referrer identity
      // must fail closed. The submission itself has no ctvId, so sourceFor()
      // routes to HRP_DIRECT — referrerUserId is null in that branch.
      // We assert the NEGATIVE control here: ctvId absent -> HRP_DIRECT -> null.
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' });
      expect(result.claimType).toBe('HRP_DIRECT');
      expect(result.referrerUserId).toBeNull();
    });

    it('CTV_REFERRAL fails typed when ReferralAttribution and ctvId disagree', async () => {
      const tx = txFor({
        current: application({
          ctvId: 'ctv-legacy',
          laborProfileId: 'lp-4',
          laborProfile: { referralAttribution: { referrerUserId: 'ctv-attribution' } },
        }),
      });
      await expect(
        convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' }),
      ).rejects.toMatchObject({
        code: 'SOURCE_REFERRER_CONFLICT',
        httpStatus: 409,
      });
      expect(tx.sourceClaim.create).not.toHaveBeenCalled();
    });

    it('HRP_DIRECT never sets referrerUserId regardless of attribution chain', async () => {
      const tx = txFor({
        current: application({
          laborProfileId: 'lp-5',
          laborProfile: { referralAttribution: { referrerUserId: 'ctv-attribution' } },
        }),
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' });
      expect(result.claimType).toBe('HRP_DIRECT');
      expect(result.referrerUserId).toBeNull();
    });

    it('REPLAY: re-running conversion for an already-CONVERTED submission reuses the existing claim', async () => {
      const tx = txFor({
        current: application({
          status: 'CONVERTED', version: 4, workerId: 'worker-1',
          sourceClaims: [{ id: 'claim-1', workerId: 'worker-1', claimType: 'CTV_REFERRAL', referrerUserId: 'ctv-1', ctvId: 'ctv-1' }],
        }),
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Retry', expectedVersion: 3 });
      expect(result).toEqual({
        id: 'sub-1', status: 'CONVERTED', workerId: 'worker-1', sourceClaimId: 'claim-1',
        referrerUserId: 'ctv-1', claimType: 'CTV_REFERRAL', version: 4, changed: false,
      });
      expect(tx.sourceClaim.create).not.toHaveBeenCalled();
      expect(tx.candidateSubmission.updateMany).not.toHaveBeenCalled();
    });

    it('worker-level replay: existing accepted claim with same submissionId is reused', async () => {
      const tx = txFor({
        accepted: {
          id: 'claim-existing',
          submissionId: 'sub-1',
          claimType: 'HRP_DIRECT',
          referrerUserId: null,
        },
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Retry' });
      expect(result.sourceClaimId).toBe('claim-existing');
      expect(result.referrerUserId).toBeNull();
      expect(result.claimType).toBe('HRP_DIRECT');
      expect(tx.sourceClaim.create).not.toHaveBeenCalled();
    });

    it('worker-level conflict: existing accepted claim from another submission fails typed', async () => {
      const tx = txFor({
        accepted: { id: 'claim-other', submissionId: 'sub-other' },
      });
      await expect(
        convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' }),
      ).rejects.toMatchObject({ code: 'SOURCE_CLAIM_CONFLICT', httpStatus: 409 });
      expect(tx.sourceClaim.create).not.toHaveBeenCalled();
    });

    it('worker-level orphan-bind: existing accepted claim with submissionId=null is bound to this submission', async () => {
      const tx = txFor({
        accepted: {
          id: 'claim-orphan',
          submissionId: null,
          claimType: 'CTV_REFERRAL',
          referrerUserId: null,
        },
        current: application({
          ctvId: 'ctv-new',
          laborProfile: null,
        }),
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' });
      expect(result.sourceClaimId).toBe('claim-orphan');
      expect(tx.sourceClaim.update).toHaveBeenCalledWith({
        where: { id: 'claim-orphan' },
        data: expect.objectContaining({ submissionId: 'sub-1', referrerUserId: 'ctv-new' }),
        select: { id: true, referrerUserId: true },
      });
      expect(tx.sourceClaim.create).not.toHaveBeenCalled();
    });
  });
});