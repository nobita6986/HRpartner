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
    vendorId: null, ctvId: null, sourceClaims: [], ...over,
  };
}

function txFor(over: {
  current?: ReturnType<typeof application> | null;
  candidates?: Array<{ id: string; phone: string | null; cccdNumber: string | null }>;
  lockCount?: number;
  accepted?: { id: string; submissionId: string | null } | null;
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
      create: vi.fn().mockResolvedValue({ id: 'claim-new' }),
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
      id: 'sub-1', status: 'CONVERTED', workerId: 'worker-new', sourceClaimId: 'claim-new', version: 4, changed: true,
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
      }),
      select: { id: true },
    });
    expect(tx.candidateSubmission.update).toHaveBeenCalledWith({ where: { id: 'sub-1' }, data: { workerId: 'worker-new' } });
    expect(tx.applicationStatusHistory.create).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'APPLICATION_CONVERT' }) });
  });

  it('derives vendor attribution from the submission', async () => {
    const tx = txFor({ current: application({ vendorId: 'vendor-1' }) });
    await convertApplication(tx as any, ADMIN, 'sub-1', { reason: 'Convert' });
    expect(tx.sourceClaim.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ claimType: 'VENDOR_SUPPLIED', registrationChannel: 'VENDOR_ADDED', vendorId: 'vendor-1' }),
      select: { id: true },
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
      data: expect.objectContaining({ workerId: 'worker-existing', accepted: true }),
      select: { id: true },
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
});