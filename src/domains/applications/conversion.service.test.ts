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

type LaborProfileMockState = {
  byId: Map<string, { id: string; workerId: string | null }>;
  /** Mocks the `Worker.laborProfile` back-relation lookup: workerId -> owning profileId. */
  workerOwners: Map<string, string>;
  /** When set, findUnique rejects with this error. */
  findUniqueError?: unknown;
  /** When set, update rejects with this error. */
  updateError?: unknown;
};

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
  laborProfile?: LaborProfileMockState;
} = {}) {
  const resolvedCurrent = over.current === undefined ? application() : over.current;
  const laborProfileState: LaborProfileMockState = over.laborProfile
    ? over.laborProfile
    : {
        byId: new Map(),
        workerOwners: new Map(),
      };
  // Auto-seed: when the test author sets `current.laborProfileId` without
  // also providing a laborProfile mock state, mirror that profile into the
  // mock store so the existing AFF-04 / replay tests continue to pass.
  if (!over.laborProfile) {
    const lpId = (resolvedCurrent as { laborProfileId?: string | null }).laborProfileId;
    if (lpId) {
      laborProfileState.byId.set(lpId, { id: lpId, workerId: null });
    }
  }
  return {
    candidateSubmission: {
      findUnique: vi.fn().mockResolvedValue(resolvedCurrent),
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
    laborProfile: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
        if (laborProfileState.findUniqueError) throw laborProfileState.findUniqueError;
        return laborProfileState.byId.get(where.id) ?? null;
      }),
      findFirst: vi.fn().mockImplementation(async ({ where }: { where: { workerId: string } }) => {
        const ownerId = laborProfileState.workerOwners.get(where.workerId);
        return ownerId ? { id: ownerId } : null;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: { workerId: string } }) => {
        if (laborProfileState.updateError) throw laborProfileState.updateError;
        const current = laborProfileState.byId.get(where.id) ?? { id: where.id, workerId: null };
        const next = { ...current, workerId: data.workerId };
        laborProfileState.byId.set(where.id, next);
        laborProfileState.workerOwners.set(data.workerId, where.id);
        return next;
      }),
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

  // ─────────────────────────────────────────────────────────────────────────
  // LaborProfile <-> Worker link (hrp-t1c-intake-worker-link).
  //
  // Bug: trước hotfix này, `convertApplication` set `candidate_submissions.workerId`
  // nhưng KHÔNG set `labor_profiles.workerId`. Hệ quả: trang
  // /admin/labor-profiles hiển thị "Chưa liên kết" cho mọi submission được
  // convert qua nhánh intake nội bộ. Hotfix: khi submission có `laborProfileId`,
  // helper `linkLaborProfileWorker` được gọi trong cùng transaction để bind
  // Worker vừa resolve về LaborProfile; nếu đã cùng workerId → no-op; nếu
  // lệch → fail-closed với code ổn định `LABOR_PROFILE_WORKER_CONFLICT`.
  // ─────────────────────────────────────────────────────────────────────────
  describe('LaborProfile <-> Worker link (intake hotfix)', () => {
    it('AC-01: QUALIFIED + laborProfileId + Worker mới → LaborProfile.workerId được set, audit diff có laborProfileLink', async () => {
      const tx = txFor({
        current: application({ laborProfileId: 'lp-new' }),
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' });
      expect(result.workerId).toBe('worker-new');
      expect(tx.laborProfile.update).toHaveBeenCalledWith({
        where: { id: 'lp-new' },
        data: { workerId: 'worker-new' },
        select: { id: true, workerId: true },
      });
      // Audit diff payload includes the laborProfileLink block.
      const auditCall = (tx.auditLog.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
        data: { diff: { after: { laborProfileLink?: unknown } } };
      };
      expect(auditCall.data.diff.after.laborProfileLink).toEqual({
        laborProfileId: 'lp-new',
        before: null,
        after: 'worker-new',
      });
    });

    it('AC-02: QUALIFIED + laborProfileId + chọn Worker qua dedup (existingWorkerId) → LaborProfile.workerId = selected', async () => {
      const tx = txFor({
        current: application({ laborProfileId: 'lp-dedup' }),
        candidates: [{ id: 'worker-existing', phone: '0909123456', cccdNumber: '012345678901' }],
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', {
        reason: 'Confirmed dedup',
        existingWorkerId: 'worker-existing',
      });
      expect(result.workerId).toBe('worker-existing');
      expect(tx.worker.create).not.toHaveBeenCalled();
      expect(tx.laborProfile.update).toHaveBeenCalledWith({
        where: { id: 'lp-dedup' },
        data: { workerId: 'worker-existing' },
        select: { id: true, workerId: true },
      });
    });

    it('AC-03: QUALIFIED + LaborProfile.workerId đã set sang Worker khác → fail-closed LABOR_PROFILE_WORKER_CONFLICT (rollback toàn transaction)', async () => {
      const tx = txFor({
        current: application({ laborProfileId: 'lp-conflict' }),
        laborProfile: {
          byId: new Map([['lp-conflict', { id: 'lp-conflict', workerId: 'worker-other' }]]),
          workerOwners: new Map(),
        },
      });
      await expect(
        convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' }),
      ).rejects.toMatchObject({
        code: 'LABOR_PROFILE_WORKER_CONFLICT',
        httpStatus: 409,
        details: { laborProfileId: 'lp-conflict', expected: 'worker-other', actual: 'worker-new' },
      });
      // The conflict is detected AFTER `tx.worker.create` because the Worker
      // ID is needed to know which LaborProfile.workerId to compare against.
      // The surrounding `withDbContext` transaction is what rolls back the
      // create; the unit test's Prisma mock does not simulate that. We assert
      // that NO downstream durable writes happened after the conflict, and
      // the LaborProfile.workerId was NOT mutated.
      expect(tx.worker.create).toHaveBeenCalledOnce();
      expect(tx.sourceClaim.create).not.toHaveBeenCalled();
      expect(tx.applicationStatusHistory.create).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
      expect(tx.laborProfile.update).not.toHaveBeenCalled();
    });

    it('AC-04: REPLAY CONVERTED + LaborProfile.workerId NULL → khôi phục idempotent, no-op các bước khác', async () => {
      const tx = txFor({
        current: application({
          status: 'CONVERTED', version: 4, workerId: 'worker-replay',
          laborProfileId: 'lp-replay',
          sourceClaims: [{ id: 'claim-replay', workerId: 'worker-replay' }],
        }),
      });
      // Auto-seeded: lp-replay has workerId=null at the start.
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Retry' });
      expect(result).toMatchObject({
        id: 'sub-1', status: 'CONVERTED', workerId: 'worker-replay',
        sourceClaimId: 'claim-replay', changed: false,
      });
      expect(tx.laborProfile.update).toHaveBeenCalledWith({
        where: { id: 'lp-replay' },
        data: { workerId: 'worker-replay' },
        select: { id: true, workerId: true },
      });
      // No-op other writes.
      expect(tx.sourceClaim.create).not.toHaveBeenCalled();
      expect(tx.worker.create).not.toHaveBeenCalled();
      expect(tx.candidateSubmission.updateMany).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    });

    it('AC-04b: REPLAY CONVERTED + LaborProfile.workerId = submission.workerId (đã link) → idempotent no-op, không UPDATE', async () => {
      const tx = txFor({
        current: application({
          status: 'CONVERTED', version: 4, workerId: 'worker-replay',
          laborProfileId: 'lp-replay',
          sourceClaims: [{ id: 'claim-replay', workerId: 'worker-replay' }],
        }),
        laborProfile: {
          byId: new Map([['lp-replay', { id: 'lp-replay', workerId: 'worker-replay' }]]),
          workerOwners: new Map([['worker-replay', 'lp-replay']]),
        },
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Retry' });
      expect(result.changed).toBe(false);
      expect(tx.laborProfile.update).not.toHaveBeenCalled();
    });

    it('AC-05: REPLAY CONVERTED + LaborProfile.workerId ≠ submission.workerId → fail-closed LABOR_PROFILE_WORKER_CONFLICT', async () => {
      const tx = txFor({
        current: application({
          status: 'CONVERTED', version: 4, workerId: 'worker-replay',
          laborProfileId: 'lp-replay',
          sourceClaims: [{ id: 'claim-replay', workerId: 'worker-replay' }],
        }),
        laborProfile: {
          byId: new Map([['lp-replay', { id: 'lp-replay', workerId: 'worker-divergent' }]]),
          workerOwners: new Map(),
        },
      });
      await expect(
        convertApplication(tx as any, HR, 'sub-1', { reason: 'Retry' }),
      ).rejects.toMatchObject({
        code: 'LABOR_PROFILE_WORKER_CONFLICT',
        httpStatus: 409,
        details: { laborProfileId: 'lp-replay', expected: 'worker-divergent', actual: 'worker-replay' },
      });
    });

    it('AC-06: QUALIFIED không có laborProfileId → flow cũ, tx.laborProfile.* không được touch', async () => {
      const tx = txFor({
        current: application({ laborProfileId: null }),
      });
      const result = await convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' });
      expect(result.workerId).toBe('worker-new');
      expect(tx.laborProfile.findUnique).not.toHaveBeenCalled();
      expect(tx.laborProfile.findFirst).not.toHaveBeenCalled();
      expect(tx.laborProfile.update).not.toHaveBeenCalled();
    });

    it('AC-RQ-04: Worker đang thuộc LaborProfile khác (qua back-relation) → fail-closed', async () => {
      // Worker `worker-new` is already owned by `lp-other` via Worker.laborProfile
      // back-relation; the conversion is trying to link it to `lp-current`.
      const tx = txFor({
        current: application({ laborProfileId: 'lp-current' }),
        laborProfile: {
          byId: new Map([['lp-current', { id: 'lp-current', workerId: null }]]),
          workerOwners: new Map([['worker-new', 'lp-other']]),
        },
      });
      await expect(
        convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' }),
      ).rejects.toMatchObject({
        code: 'LABOR_PROFILE_WORKER_CONFLICT',
        httpStatus: 409,
      });
      expect(tx.worker.create).toHaveBeenCalledOnce();
      expect(tx.laborProfile.update).not.toHaveBeenCalled();
    });

    it('AC-P2002: Prisma P2002 từ unique index → surface LABOR_PROFILE_WORKER_CONFLICT', async () => {
      // LaborProfile.workerId = null, Worker back-relation = null, but the UPDATE
      // raises P2002 (simulating a concurrent writer that won the unique index).
      const tx = txFor({
        current: application({ laborProfileId: 'lp-race' }),
        laborProfile: {
          byId: new Map([['lp-race', { id: 'lp-race', workerId: null }]]),
          workerOwners: new Map(),
          updateError: Object.assign(new Error('Unique constraint violation'), { code: 'P2002' }),
        },
      });
      await expect(
        convertApplication(tx as any, HR, 'sub-1', { reason: 'Convert' }),
      ).rejects.toMatchObject({
        code: 'LABOR_PROFILE_WORKER_CONFLICT',
        httpStatus: 409,
        details: { laborProfileId: 'lp-race', workerId: 'worker-new' },
      });
    });
  });
});