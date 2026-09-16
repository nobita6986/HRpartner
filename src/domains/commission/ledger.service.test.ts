import { describe, it, expect, vi } from 'vitest';
import { listLedger, ledgerToDTO } from './ledger.service';

const mocks = vi.hoisted(() => ({
  findManyCommission: vi.fn(),
  countCommission: vi.fn(),
  findManyUser: vi.fn(),
  findManyWorker: vi.fn(),
}));

const fakePrisma = {
  commissionLedger: {
    findMany: mocks.findManyCommission,
    count: mocks.countCommission,
  },
  user: {
    findMany: mocks.findManyUser,
  },
  worker: {
    findMany: mocks.findManyWorker,
  }
} as any;

describe('ledger.service.ts - listLedger', () => {
  it('enriches ctvName and workerName correctly with existing records', async () => {
    mocks.findManyCommission.mockResolvedValue([
      { id: '1', ctvId: 'ctv-1', workerId: 'worker-1' }
    ]);
    mocks.countCommission.mockResolvedValue(1);
    mocks.findManyUser.mockResolvedValue([{ id: 'ctv-1', name: 'CTV One' }]);
    mocks.findManyWorker.mockResolvedValue([{ id: 'worker-1', fullName: 'Worker One' }]);

    const result = await listLedger(fakePrisma, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].ctvName).toBe('CTV One');
    expect(result.items[0].workerName).toBe('Worker One');
  });

  it('leaves ctvName null for orphan CTV and workerName null for hidden/orphan Worker', async () => {
    mocks.findManyCommission.mockResolvedValue([
      { id: '2', ctvId: 'ctv-orphan', workerId: 'worker-hidden' }
    ]);
    mocks.countCommission.mockResolvedValue(1);
    mocks.findManyUser.mockResolvedValue([]); // orphan
    mocks.findManyWorker.mockResolvedValue([]); // hidden by RLS or orphan

    const result = await listLedger(fakePrisma, {});
    expect(result.items[0].ctvName).toBeNull();
    expect(result.items[0].workerName).toBeNull();
  });

  it('handles empty ID/null input gracefully', async () => {
    mocks.findManyCommission.mockResolvedValue([
      { id: '3', ctvId: '', workerId: null }
    ]);
    mocks.countCommission.mockResolvedValue(1);
    mocks.findManyUser.mockResolvedValue([]); 
    mocks.findManyWorker.mockResolvedValue([]); 

    const result = await listLedger(fakePrisma, {});
    expect(result.items[0].ctvName).toBeNull();
    expect(result.items[0].workerName).toBeNull();
    // Verify that we do not query DB with empty array if there are no valid IDs
    expect(mocks.findManyWorker).not.toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: [] } }
    }));
  });

  it('ledgerToDTO retains ctvId and workerId while adding ctvName and workerName', () => {
    const raw = {
      id: 'L1',
      ctvId: 'ctv-123',
      ctvName: 'Mock CTV',
      workerId: 'w-123',
      workerName: 'Mock Worker',
      assignmentId: null,
      policyId: 'P1',
      milestone: 'M1',
      amount: 1000n,
      direction: 'CREDIT',
      reversalOfId: null,
      month: 9,
      year: 2026,
      status: 'PENDING',
      createdAt: new Date(),
      approvedAt: null,
      paidAt: null,
      rejectedAt: null,
      rejectionReason: null,
    } as any;

    const dto = ledgerToDTO(raw);
    expect(dto.ctvId).toBe('ctv-123');
    expect(dto.workerId).toBe('w-123');
    expect(dto.ctvName).toBe('Mock CTV');
    expect(dto.workerName).toBe('Mock Worker');
  });
});
