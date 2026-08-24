import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeScreeningAction, ScreeningCommandError } from './screening.service';

const ctx = (role: string) => ({ userId: `${role.toLowerCase()}-1`, role: role as any });

function txFor(over: { status?: string; version?: number; updateCount?: number; missing?: boolean } = {}) {
  const current = over.missing ? null : {
    id: 'sub-1',
    status: over.status ?? 'NEW',
    version: over.version ?? 0,
  };
  return {
    candidateSubmission: {
      findUnique: vi.fn().mockResolvedValue(current),
      updateMany: vi.fn().mockResolvedValue({ count: over.updateCount ?? 1 }),
    },
    applicationStatusHistory: { create: vi.fn().mockResolvedValue({ id: 'h-1' }) },
    auditLog: { create: vi.fn().mockResolvedValue({ id: 'a-1' }) },
  };
}

describe('MP-3A screening commands', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['ADMIN', 'HR_MANAGER', 'SALE'])('%s may screen NEW', async (role) => {
    const tx = txFor();
    const result = await executeScreeningAction(tx as any, ctx(role), 'sub-1', 'screen', { reason: 'Initial review' });
    expect(result).toEqual({ id: 'sub-1', status: 'SCREENING', version: 1, changed: true });
  });

  it('screen writes optimistic update, history and audit atomically', async () => {
    const tx = txFor({ status: 'NEEDS_INFO', version: 4 });
    await executeScreeningAction(tx as any, ctx('HR_MANAGER'), 'sub-1', 'screen', {
      reason: '  Documents completed  ',
      expectedVersion: 4,
    });
    expect(tx.candidateSubmission.updateMany).toHaveBeenCalledWith({
      where: { id: 'sub-1', status: 'NEEDS_INFO', version: 4 },
      data: {
        status: 'SCREENING',
        version: { increment: 1 },
        reviewedBy: 'hr_manager-1',
        reviewNote: 'Documents completed',
      },
    });
    expect(tx.applicationStatusHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      fromStatus: 'NEEDS_INFO', toStatus: 'SCREENING', reason: 'Documents completed',
    }) });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'APPLICATION_SCREEN', actorId: 'hr_manager-1',
    }) });
  });

  it('qualify only accepts SCREENING and SALE cannot qualify', async () => {
    const valid = txFor({ status: 'SCREENING' });
    await expect(executeScreeningAction(valid as any, ctx('HR_MANAGER'), 'sub-1', 'qualify', { reason: 'Pass' }))
      .resolves.toMatchObject({ status: 'QUALIFIED' });
    const invalid = txFor({ status: 'NEW' });
    await expect(executeScreeningAction(invalid as any, ctx('HR_MANAGER'), 'sub-1', 'qualify', { reason: 'Pass' }))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION', httpStatus: 409 });
    await expect(executeScreeningAction(valid as any, ctx('SALE'), 'sub-1', 'qualify', { reason: 'Pass' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
  });

  it('reject requires HR role and a non-empty reason', async () => {
    const tx = txFor({ status: 'QUALIFIED' });
    await expect(executeScreeningAction(tx as any, ctx('HR_MANAGER'), 'sub-1', 'reject', { reason: '   ' }))
      .rejects.toMatchObject({ code: 'REASON_REQUIRED', httpStatus: 400 });
    await expect(executeScreeningAction(tx as any, ctx('SALE'), 'sub-1', 'reject', { reason: 'Not fit' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
  });

  it('repeating an already reached action is an idempotent no-op', async () => {
    const tx = txFor({ status: 'SCREENING', version: 2 });
    const result = await executeScreeningAction(tx as any, ctx('ADMIN'), 'sub-1', 'screen', { reason: 'Replay' });
    expect(result).toEqual({ id: 'sub-1', status: 'SCREENING', version: 2, changed: false });
    expect(tx.candidateSubmission.updateMany).not.toHaveBeenCalled();
    expect(tx.applicationStatusHistory.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects stale client versions and update races without audit residue', async () => {
    const stale = txFor({ version: 3 });
    await expect(executeScreeningAction(stale as any, ctx('ADMIN'), 'sub-1', 'screen', {
      reason: 'Review', expectedVersion: 2,
    })).rejects.toMatchObject({ code: 'STALE_VERSION', httpStatus: 409 } satisfies Partial<ScreeningCommandError>);

    const raced = txFor({ updateCount: 0 });
    await expect(executeScreeningAction(raced as any, ctx('ADMIN'), 'sub-1', 'screen', { reason: 'Review' }))
      .rejects.toMatchObject({ code: 'STALE_VERSION' });
    expect(raced.applicationStatusHistory.create).not.toHaveBeenCalled();
    expect(raced.auditLog.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the submission is absent', async () => {
    await expect(executeScreeningAction(txFor({ missing: true }) as any, ctx('ADMIN'), 'missing', 'screen', { reason: 'x' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND', httpStatus: 404 });
  });
});