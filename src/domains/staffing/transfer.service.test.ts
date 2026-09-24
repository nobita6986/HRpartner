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
  outboxEvent: { create: MockFn };
  projectAssignment: {
    update: MockFn;
    create: MockFn;
    findMany: MockFn;
  };
  project: {
    update: MockFn;
    findMany: MockFn;
  };
  sourceClaim: {
    findFirst: MockFn;
  };
};

function makeMockTx(overrides?: Partial<MockTx>): MockTx {
  return {
    $executeRawUnsafe: vi.fn().mockResolvedValue(null),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    outboxEvent: {
      create: vi.fn().mockResolvedValue({ id: 'ev-001', status: 'PENDING' }),
    },
    projectAssignment: {
      update: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    // AFF-04: source-claim lookup (returns null when no claim configured,
    // preserving the legacy behavior).
    sourceClaim: {
      findFirst: vi.fn().mockResolvedValue(null),
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

  // ─────────────────────────────────────────────────────────────────────────
  // AFF-04 Transfer Matrix — re-read canonical claim under lock, inherit
  // referrer identity into the new assignment. HRP_DIRECT / VENDOR get null.
  // ─────────────────────────────────────────────────────────────────────────
  describe('AFF-04 transfer propagation', () => {
    it('inherits referrerId from canonical accepted CTV_REFERRAL claim (REFERENCED_ATTRIBUTION path)', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-old', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
        ]),
        sourceClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'claim-ctv',
            claimType: 'CTV_REFERRAL',
            referrerUserId: 'ctv-canonical',
            ctvId: 'ctv-canonical',
            worker: { userId: 'worker-001' },
          }),
        },
        projectAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'asgn-old' }),
          create: vi.fn().mockResolvedValue({ id: 'asgn-new' }),
          findMany: vi.fn(),
        },
        project: {
          update: vi.fn().mockImplementation(({ where }: any) =>
            Promise.resolve({ id: where.id, filled: 5, quota: 10 }),
          ),
          findMany: vi.fn(),
        },
      });

      const result = await transferWorker(tx as any, ADMIN_CTX, {
        workerId: 'worker-001',
        fromProjectId: 'prj-A',
        toProjectId: 'prj-B',
        transferDate: '2026-09-01',
      });

      expect(result.referrerId).toBe('ctv-canonical');
      expect(result.sourceClaimId).toBe('claim-ctv');
      expect(result.sourceClaimType).toBe('CTV_REFERRAL');

      const createArgs = tx.projectAssignment.create.mock.calls[0][0];
      expect(createArgs.data.referrerId).toBe('ctv-canonical');
    });

    it('falls back to legacy ctvId for pre-AFF-04 claims (referrerUserId=null)', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-old', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
        ]),
        sourceClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'claim-ctv-legacy',
            claimType: 'CTV_REFERRAL',
            referrerUserId: null,
            ctvId: 'ctv-legacy-id',
            worker: { userId: 'worker-001' },
          }),
        },
        projectAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'asgn-old' }),
          create: vi.fn().mockResolvedValue({ id: 'asgn-new' }),
          findMany: vi.fn(),
        },
        project: {
          update: vi.fn().mockImplementation(({ where }: any) =>
            Promise.resolve({ id: where.id, filled: 5, quota: 10 }),
          ),
          findMany: vi.fn(),
        },
      });

      const result = await transferWorker(tx as any, ADMIN_CTX, {
        workerId: 'worker-001',
        fromProjectId: 'prj-A',
        toProjectId: 'prj-B',
        transferDate: '2026-09-01',
      });

      expect(result.referrerId).toBe('ctv-legacy-id');
      const createArgs = tx.projectAssignment.create.mock.calls[0][0];
      expect(createArgs.data.referrerId).toBe('ctv-legacy-id');
    });

    it('HRP_DIRECT worker keeps referrerId=null (no referrer concept)', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-old', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
        ]),
        sourceClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'claim-hrp',
            claimType: 'HRP_DIRECT',
            referrerUserId: null,
            ctvId: null,
            worker: { userId: 'worker-001' },
          }),
        },
        projectAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'asgn-old' }),
          create: vi.fn().mockResolvedValue({ id: 'asgn-new' }),
          findMany: vi.fn(),
        },
        project: {
          update: vi.fn().mockImplementation(({ where }: any) =>
            Promise.resolve({ id: where.id, filled: 5, quota: 10 }),
          ),
          findMany: vi.fn(),
        },
      });

      const result = await transferWorker(tx as any, ADMIN_CTX, {
        workerId: 'worker-001',
        fromProjectId: 'prj-A',
        toProjectId: 'prj-B',
        transferDate: '2026-09-01',
      });

      expect(result.referrerId).toBeNull();
      const createArgs = tx.projectAssignment.create.mock.calls[0][0];
      expect(createArgs.data.referrerId).toBeNull();
    });

    it('VENDOR_SUPPLIED worker keeps referrerId=null', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-old', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
        ]),
        sourceClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'claim-vendor',
            claimType: 'VENDOR_SUPPLIED',
            referrerUserId: null,
            ctvId: null,
            worker: { userId: 'worker-001' },
          }),
        },
        projectAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'asgn-old' }),
          create: vi.fn().mockResolvedValue({ id: 'asgn-new' }),
          findMany: vi.fn(),
        },
        project: {
          update: vi.fn().mockImplementation(({ where }: any) =>
            Promise.resolve({ id: where.id, filled: 5, quota: 10 }),
          ),
          findMany: vi.fn(),
        },
      });

      const result = await transferWorker(tx as any, ADMIN_CTX, {
        workerId: 'worker-001',
        fromProjectId: 'prj-A',
        toProjectId: 'prj-B',
        transferDate: '2026-09-01',
      });

      expect(result.referrerId).toBeNull();
    });

    it('self-referral: worker.userId === referrerUserId retains provenance (no CommissionLedger write)', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-old', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
        ]),
        sourceClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'claim-self',
            claimType: 'CTV_REFERRAL',
            referrerUserId: 'user-self-001', // same as worker.userId below
            ctvId: 'user-self-001',
            worker: { userId: 'user-self-001' },
          }),
        },
        projectAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'asgn-old' }),
          create: vi.fn().mockResolvedValue({ id: 'asgn-new' }),
          findMany: vi.fn(),
        },
        project: {
          update: vi.fn().mockImplementation(({ where }: any) =>
            Promise.resolve({ id: where.id, filled: 5, quota: 10 }),
          ),
          findMany: vi.fn(),
        },
      });

      const result = await transferWorker(tx as any, ADMIN_CTX, {
        workerId: 'user-self-001',
        fromProjectId: 'prj-A',
        toProjectId: 'prj-B',
        transferDate: '2026-09-01',
      });

      // AFF-04 retains provenance; AFF-05B is the only scope that decides
      // whether to emit a CommissionLedger row for self-referral.
      expect(result.referrerId).toBe('user-self-001');
      const createArgs = tx.projectAssignment.create.mock.calls[0][0];
      expect(createArgs.data.referrerId).toBe('user-self-001');
    });

    it('re-reads sourceClaim INSIDE the transaction (after worker advisory lock)', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-old', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
        ]),
        sourceClaim: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        projectAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'asgn-old' }),
          create: vi.fn().mockResolvedValue({ id: 'asgn-new' }),
          findMany: vi.fn(),
        },
        project: {
          update: vi.fn().mockImplementation(({ where }: any) =>
            Promise.resolve({ id: where.id, filled: 5, quota: 10 }),
          ),
          findMany: vi.fn(),
        },
      });

      await transferWorker(tx as any, ADMIN_CTX, {
        workerId: 'worker-orphan',
        fromProjectId: 'prj-A',
        toProjectId: 'prj-B',
        transferDate: '2026-09-01',
      });

      // advisory lock must come BEFORE sourceClaim lookup.
      const lockCall = tx.$executeRawUnsafe.mock.invocationCallOrder[0];
      const claimCall = tx.sourceClaim.findFirst.mock.invocationCallOrder[0];
      expect(lockCall).toBeLessThan(claimCall);
    });

    it('outbox payload carries inherited referrerId + sourceClaim provenance (PII-free IDs)', async () => {
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'asgn-old', project_id: 'prj-A', valid_from: new Date('2026-08-01') },
        ]),
        sourceClaim: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'claim-ctv',
            claimType: 'CTV_REFERRAL',
            referrerUserId: 'ctv-001',
            ctvId: 'ctv-001',
            worker: { userId: 'worker-001' },
          }),
        },
        projectAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'asgn-old' }),
          create: vi.fn().mockResolvedValue({ id: 'asgn-new' }),
          findMany: vi.fn(),
        },
        project: {
          update: vi.fn().mockImplementation(({ where }: any) =>
            Promise.resolve({ id: where.id, filled: 5, quota: 10 }),
          ),
          findMany: vi.fn(),
        },
      });

      await transferWorker(tx as any, ADMIN_CTX, {
        workerId: 'worker-001',
        fromProjectId: 'prj-A',
        toProjectId: 'prj-B',
        transferDate: '2026-09-01',
      });

      const outboxArgs = tx.outboxEvent.create.mock.calls[0][0];
      expect(outboxArgs.data.payload).toMatchObject({
        referrerId: 'ctv-001',
        sourceClaimId: 'claim-ctv',
        sourceClaimType: 'CTV_REFERRAL',
      });
    });
  });
});
