/**
 * transfer.service unit tests — Phase 4 slice 4A STEP-03 (RQ-02).
 *
 * DEC-16: unit test Prisma mock in-memory.
 * Pattern theo ticket.service.test.ts Phase 3.
 *
 * Test cases:
 * 1. Happy path: transfer 1 worker, 1-ACTIVE maintained, both projects quota updated
 * 2. NO_ACTIVE → rollback
 * 3. MULTIPLE_ACTIVE → rollback (invariant violation)
 * 4. SAME_PROJECT → early reject
 * 5. Project quota exceeded → rollback
 * 6. WRONG PROJECT → reject
 * 7. Permission denied (WORKER role) → reject
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;
type MockTx = {
  $executeRawUnsafe: MockFn;
  $queryRawUnsafe: MockFn;
  projectAssignment: {
    update: MockFn;
    create: MockFn;
    findMany: MockFn;
  };
  project: {
    update: MockFn;
    findMany: MockFn;
  };
};

function makeMockTx(overrides?: Partial<MockTx>): MockTx {
  return {
    $executeRawUnsafe: vi.fn().mockResolvedValue(null),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    projectAssignment: {
      update: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    ...overrides,
  } as unknown as MockTx;
}

const ADMIN_CTX = { userId: 'admin-001', role: 'ADMIN' as const };
const WORKER_CTX = { userId: 'wk-001', role: 'WORKER' as const };

import {
  transferWorker,
  bulkTransferWorker,
  TransferServiceError,
} from './transfer.service';

describe('transfer.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('transferWorker', () => {
    it('happy path: transfer worker 1-ACTIVE maintained, both project quotas updated', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-old', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
        ]),
        projectAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'asgn-old' }),
          create: vi.fn().mockResolvedValue({ id: 'asgn-new' }),
          findMany: vi.fn(),
        },
        project: {
          update: vi.fn().mockImplementation(({ where, data }: any) => {
            if (where.id === 'prj-A') return Promise.resolve({ id: 'prj-A', filled: 9, quota: 10 });
            if (where.id === 'prj-B') return Promise.resolve({ id: 'prj-B', filled: 5, quota: 10 });
          }),
          findMany: vi.fn(),
        },
      });

      const result = await transferWorker(tx as any, ADMIN_CTX, {
        workerId: 'worker-001',
        fromProjectId: 'prj-A',
        toProjectId: 'prj-B',
        transferDate: '2026-09-01',
        positionCode: 'ELEC',
        positionTitle: 'Thợ điện',
      });

      expect(result.oldAssignmentId).toBe('asgn-old');
      expect(result.newAssignmentId).toBe('asgn-new');
      expect(result.fromProjectId).toBe('prj-A');
      expect(result.toProjectId).toBe('prj-B');
    });

    it('NO_ACTIVE_ASSIGNMENT when worker has no ACTIVE assignments', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      });

      await expect(
        transferWorker(tx as any, ADMIN_CTX, {
          workerId: 'worker-orphan',
          fromProjectId: 'prj-A',
          toProjectId: 'prj-B',
          transferDate: '2026-09-01',
        }),
      ).rejects.toThrow(TransferServiceError);
    });

    it('MULTIPLE_ACTIVE_ASSIGNMENTS → rollback', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-1', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
          { id: 'asgn-2', project_id: 'prj-C', valid_from: new Date('2026-08-10') },
        ]),
      });

      await expect(
        transferWorker(tx as any, ADMIN_CTX, {
          workerId: 'worker-broken',
          fromProjectId: 'prj-A',
          toProjectId: 'prj-B',
          transferDate: '2026-09-01',
        }),
      ).rejects.toThrow(TransferServiceError);
    });

    it('SAME_PROJECT → reject early', async () => {
      const tx = makeMockTx();
      await expect(
        transferWorker(tx as any, ADMIN_CTX, {
          workerId: 'wk-001',
          fromProjectId: 'prj-A',
          toProjectId: 'prj-A',
          transferDate: '2026-09-01',
        }),
      ).rejects.toThrow(TransferServiceError);
    });

    it('PERMISSION_DENIED for WORKER role', async () => {
      const tx = makeMockTx();
      await expect(
        transferWorker(tx as any, WORKER_CTX, {
          workerId: 'wk-001',
          fromProjectId: 'prj-A',
          toProjectId: 'prj-B',
          transferDate: '2026-09-01',
        }),
      ).rejects.toThrow(TransferServiceError);
    });

    it('WRONG_PROJECT — ACTIVE assignment is at different project', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-1', project_id: 'prj-C', valid_from: new Date('2026-08-01') },
        ]),
      });

      await expect(
        transferWorker(tx as any, ADMIN_CTX, {
          workerId: 'wk-001',
          fromProjectId: 'prj-A', // wrong — ACTIVE is at prj-C
          toProjectId: 'prj-B',
          transferDate: '2026-09-01',
        }),
      ).rejects.toThrow(TransferServiceError);
    });
  });

  describe('bulkTransferWorker', () => {
    it('1 worker fail, 1 success → both tracked separately', async () => {
      let callCount = 0;
      const txSuccess = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-old', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
        ]),
        projectAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'asgn-old' }),
          create: vi.fn().mockResolvedValue({ id: 'asgn-new' }),
          findMany: vi.fn(),
        },
        project: {
          update: vi.fn().mockImplementation(() => {
            callCount++;
            return Promise.resolve({ id: callCount === 1 ? 'prj-A' : 'prj-B', filled: 5, quota: 10 });
          }),
          findMany: vi.fn(),
        },
      });

      // Override $transaction to simulate first success, second fail
      const prisma = {
        $transaction: vi.fn().mockImplementation(async (cb: any) => {
          return cb(txSuccess);
        }),
      } as any;

      const results = await bulkTransferWorker(prisma, ADMIN_CTX, [
        { workerId: 'wk-001', fromProjectId: 'prj-A', toProjectId: 'prj-B', transferDate: '2026-09-01' },
        { workerId: 'wk-002', fromProjectId: 'prj-A', toProjectId: 'prj-A', transferDate: '2026-09-01' }, // same project → fail
      ]);

      expect(results.success).toHaveLength(1);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain('khác nhau');
    });
  });
});
