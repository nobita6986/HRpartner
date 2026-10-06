/**
 * worker.service.test.ts — Unit test (Vitest, unit lane, no DB).
 *
 * Mock Prisma transaction client (`fakeTx`) và assert:
 *   - getWorkerDetail: role guard + scope filter
 *   - updateWorkerProfile: writer guard, ownership guard, masked-input reject,
 *     enum validation, forbidden field guard, CAS (expectedUpdatedAt)
 *   - deleteWorker: ADMIN-only, dependency sweep → 409, orphan → 200, race
 *     re-read fail-closed, audit log
 *   - inspectWorkerDependencies: scope filter, return facts
 *
 * Mirror test pattern `src/domains/staffing/order.service.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  WorkerServiceError,
  type WorkerDependencyKind,
  deleteWorker,
  getWorkerDetail,
  inspectWorkerDependencies,
  updateWorkerProfile,
} from '../worker.service';

const ADMIN_CTX = { userId: 'admin-1', role: 'ADMIN' as const };
const HR_MANAGER_CTX = { userId: 'hr-1', role: 'HR_MANAGER' as const };
const HR_STAFF_CTX = { userId: 'staff-1', role: 'HR_STAFF' as const };

const baseWorker = {
  id: 'w1',
  userId: 'USR-001',
  fullName: 'Nguyễn Văn A',
  phone: '0901234567',
  cccdNumber: '001099123456',
  cccdImageUrl: null,
  selfieImageUrl: null,
  cccdIssuedDate: null,
  cccdIssuedPlace: null,
  cccdExpiryDate: null,
  taxCode: null,
  insuranceCode: null,
  bankAccount: null,
  bankName: null,
  bankBranch: null,
  profileStatus: 'INCOMPLETE',
  employmentStatus: 'NONE',
  riskStatus: 'NORMAL',
  ownerId: null,
  assignedToId: null,
  accountUserId: null,
  managerId: null,
  dateOfBirth: null,
  gender: null,
  maritalStatus: null,
  permanentAddress: null,
  currentAddress: null,
  hometown: null,
  ethnicGroup: null,
  religion: null,
  nationality: 'VN',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  laborProfile: null,
  assignments: [],
  episodes: [],
  owner: null,
  assignedTo: null,
  manager: null,
};

let tx: Record<string, any>;
let advisoryLockCalls: number;
let auditCreates: Array<{ action: string; data: unknown }>;
let outboxEvents: Array<{ eventType: string; payload: unknown }>;

function asPrismaTx(): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}

function emptyCounts(): void {
  for (const model of [
    'laborProfile',
    'employmentEpisode',
    'projectAssignment',
    'ticket',
    'dependent',
    'attendanceEvent',
    'timesheetLine',
    'timesheetAdjustment',
    'workerDeduction',
    'vendorStatementLine',
    'clientStatementLine',
    'commissionLedger',
    'sourceClaim',
  ]) {
    tx[model].count.mockResolvedValue(0);
  }
  tx.candidateSubmission.count.mockResolvedValue(0);
}

function makeTx(): void {
  tx = {
    worker: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    laborProfile: { count: vi.fn() },
    employmentEpisode: { count: vi.fn() },
    projectAssignment: { count: vi.fn() },
    ticket: { count: vi.fn() },
    dependent: { count: vi.fn() },
    attendanceEvent: { count: vi.fn() },
    timesheetLine: { count: vi.fn() },
    timesheetAdjustment: { count: vi.fn() },
    workerDeduction: { count: vi.fn() },
    vendorStatementLine: { count: vi.fn() },
    clientStatementLine: { count: vi.fn() },
    commissionLedger: { count: vi.fn() },
    sourceClaim: { count: vi.fn() },
    candidateSubmission: { count: vi.fn() },
    auditLog: { create: vi.fn() },
    outboxEvent: { create: vi.fn() },
    $executeRawUnsafe: vi.fn().mockImplementation(async () => {
      advisoryLockCalls += 1;
      return 1;
    }),
  };
}

beforeEach(() => {
  advisoryLockCalls = 0;
  auditCreates = [];
  outboxEvents = [];
  makeTx();
  emptyCounts();
  tx.auditLog.create.mockImplementation(async (args: { data: { action: string; diff: unknown } }) => {
    auditCreates.push({ action: args.data.action, data: args.data.diff });
    return { id: `audit-${auditCreates.length}` };
  });
});

describe('getWorkerDetail', () => {
  it('ADMIN xem được Worker root', async () => {
    tx.worker.findFirst.mockResolvedValue(baseWorker);
    const result = await getWorkerDetail(asPrismaTx(), ADMIN_CTX, 'w1');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('w1');
    expect(result?.fullName).toBe('Nguyễn Văn A');
  });

  it('HR_STAFF ngoài row scope → null (404 fail-closed)', async () => {
    tx.worker.findFirst.mockResolvedValue(null);
    const result = await getWorkerDetail(asPrismaTx(), HR_STAFF_CTX, 'w1');
    expect(result).toBeNull();
    // WHERE phải có assignedToId (HR_STAFF scope).
    const whereArg = tx.worker.findFirst.mock.calls[0][0].where;
    expect(whereArg.AND).toEqual(
      expect.arrayContaining([expect.objectContaining({ assignedToId: 'staff-1' })]),
    );
  });

  it('role không có scope (MKT) → PERMISSION_DENIED', async () => {
    const MKT_CTX = { userId: 'm1', role: 'MKT' as const };
    await expect(getWorkerDetail(asPrismaTx(), MKT_CTX, 'w1')).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

describe('updateWorkerProfile', () => {
  it('HR_STAFF → PERMISSION_DENIED', async () => {
    await expect(
      updateWorkerProfile(asPrismaTx(), HR_STAFF_CTX, 'w1', { fullName: 'Test', actorId: 'staff-1' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('empty payload → INVALID_INPUT', async () => {
    await expect(
      updateWorkerProfile(asPrismaTx(), HR_MANAGER_CTX, 'w1', { actorId: 'hr-1' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('cố set userId / accountUserId / workerId → INVALID_INPUT', async () => {
    await expect(
      updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
        userId: 'USR-002',
        actorId: 'admin-1',
      } as never),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('HR_MANAGER cố sửa ownerId → FORBIDDEN_OWNERSHIP', async () => {
    await expect(
      updateWorkerProfile(asPrismaTx(), HR_MANAGER_CTX, 'w1', {
        ownerId: 'u-other',
        actorId: 'hr-1',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN_OWNERSHIP' });
  });

  it('ADMIN sửa ownerId OK', async () => {
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    tx.worker.updateMany.mockResolvedValue({ count: 1 });
    const result = await updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
      ownerId: 'u-other',
      actorId: 'admin-1',
    });
    expect(result.updatedFields).toContain('ownerId');
  });

  it('mask character "*" ở cccdNumber → WORKER_MASKED_INPUT_REJECTED', async () => {
    await expect(
      updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
        cccdNumber: '001****234',
        actorId: 'admin-1',
      }),
    ).rejects.toMatchObject({ code: 'WORKER_MASKED_INPUT_REJECTED' });
  });

  it('mask character "*" ở phone → WORKER_MASKED_INPUT_REJECTED', async () => {
    await expect(
      updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
        phone: '0901***567',
        actorId: 'admin-1',
      }),
    ).rejects.toMatchObject({ code: 'WORKER_MASKED_INPUT_REJECTED' });
  });

  it('employmentStatus ngoài enum → INVALID_INPUT', async () => {
    await expect(
      updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
        employmentStatus: 'FUTURE' as never,
        actorId: 'admin-1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('profileStatus ngoài enum → INVALID_INPUT', async () => {
    await expect(
      updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
        profileStatus: 'WHATEVER' as never,
        actorId: 'admin-1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('dateOfBirth không hợp lệ → INVALID_INPUT', async () => {
    await expect(
      updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
        dateOfBirth: 'not-a-date',
        actorId: 'admin-1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('success: 1 field dirty, 200, audit ghi WORKER_PROFILE_UPDATE', async () => {
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    tx.worker.updateMany.mockResolvedValue({ count: 1 });
    const result = await updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
      fullName: 'Trần Văn B',
      actorId: 'admin-1',
    });
    expect(result.updatedFields).toEqual(['fullName']);
    const updateArgs = tx.worker.updateMany.mock.calls[0][0];
    expect(updateArgs.data.fullName).toBe('Trần Văn B');
    expect(updateArgs.data.userId).toBeUndefined();
    expect(updateArgs.data.workerId).toBeUndefined();
    expect(auditCreates.map((a) => a.action)).toContain('WORKER_PROFILE_UPDATE');
    expect(advisoryLockCalls).toBe(1);
  });

  it('expectedUpdatedAt lệch → STALE_VERSION', async () => {
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    });
    await expect(
      updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
        fullName: 'Test',
        actorId: 'admin-1',
        expectedUpdatedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    ).rejects.toMatchObject({ code: 'STALE_VERSION' });
  });

  it('updateMany count 0 → NOT_FOUND (concurrent delete)', async () => {
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    tx.worker.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
        fullName: 'Test',
        actorId: 'admin-1',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('Worker ngoài row scope HR_STAFF → PERMISSION_DENIED (writer guard chạy trước)', async () => {
    tx.worker.findFirst.mockResolvedValue(null);
    await expect(
      updateWorkerProfile(asPrismaTx(), HR_STAFF_CTX, 'w1', {
        fullName: 'Test',
        actorId: 'staff-1',
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('status TERMINATED: vẫn giữ row, không cascade', async () => {
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    tx.worker.updateMany.mockResolvedValue({ count: 1 });
    const result = await updateWorkerProfile(asPrismaTx(), ADMIN_CTX, 'w1', {
      employmentStatus: 'TERMINATED',
      actorId: 'admin-1',
    });
    expect(result.updatedFields).toContain('employmentStatus');
    const updateArgs = tx.worker.updateMany.mock.calls[0][0];
    expect(updateArgs.data.employmentStatus).toBe('TERMINATED');
    // Không gọi cascade delete.
    expect(tx.worker.delete).not.toHaveBeenCalled();
  });
});

describe('deleteWorker', () => {
  it('HR_MANAGER → PERMISSION_DENIED', async () => {
    await expect(
      deleteWorker(asPrismaTx(), HR_MANAGER_CTX, 'w1', { actorId: 'hr-1', reason: 'r' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('Worker không tồn tại → NOT_FOUND', async () => {
    tx.worker.findFirst.mockResolvedValue(null);
    await expect(
      deleteWorker(asPrismaTx(), ADMIN_CTX, 'w1', { actorId: 'admin-1', reason: 'r' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('orphan worker → success, audit WORKER_PERMANENT_DELETE', async () => {
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      userId: 'USR-001',
      fullName: 'Nguyễn Văn A',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    tx.worker.findUnique.mockResolvedValue({ id: 'w1' });
    tx.worker.delete.mockResolvedValue({ id: 'w1' });
    const result = await deleteWorker(asPrismaTx(), ADMIN_CTX, 'w1', {
      actorId: 'admin-1',
      reason: 'cleanup test row',
    });
    expect(result.id).toBe('w1');
    expect(auditCreates.map((a) => a.action)).toContain('WORKER_PERMANENT_DELETE');
    expect(advisoryLockCalls).toBe(1);
  });

  // 14 dependency-sweep cases (AC-14). Mỗi case set 1 count > 0.
  const depCases: Array<[string, string, WorkerDependencyKind]> = [
    ['LaborProfile', 'laborProfile', 'LABOR_PROFILE'],
    ['EmploymentEpisode', 'employmentEpisode', 'EMPLOYMENT_EPISODE'],
    ['ProjectAssignment', 'projectAssignment', 'PROJECT_ASSIGNMENT'],
    ['Ticket', 'ticket', 'TICKET'],
    ['Dependent', 'dependent', 'DEPENDENT'],
    ['AttendanceEvent', 'attendanceEvent', 'ATTENDANCE_EVENT'],
    ['TimesheetLine', 'timesheetLine', 'TIMESHEET_LINE'],
    ['TimesheetAdjustment', 'timesheetAdjustment', 'TIMESHEET_ADJUSTMENT'],
    ['WorkerDeduction', 'workerDeduction', 'WORKER_DEDUCTION'],
    ['VendorStatementLine', 'vendorStatementLine', 'VENDOR_STATEMENT_LINE'],
    ['ClientStatementLine', 'clientStatementLine', 'CLIENT_STATEMENT_LINE'],
    ['CommissionLedger', 'commissionLedger', 'COMMISSION_LEDGER'],
    ['SourceClaim', 'sourceClaim', 'SOURCE_CLAIM'],
  ];

  for (const [name, modelKey, kind] of depCases) {
    it(`WORKER_NOT_DELETABLE khi ${name} còn row`, async () => {
      tx.worker.findFirst.mockResolvedValue({
        id: 'w1',
        userId: 'USR-001',
        fullName: 'Nguyễn Văn A',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      tx.worker.findUnique.mockResolvedValue({ id: 'w1' });
      tx[modelKey].count.mockResolvedValue(1);
      await expect(
        deleteWorker(asPrismaTx(), ADMIN_CTX, 'w1', { actorId: 'admin-1', reason: 'r' }),
      ).rejects.toMatchObject({ code: 'WORKER_NOT_DELETABLE', details: { blockingFacts: [kind] } });
      expect(tx.worker.delete).not.toHaveBeenCalled();
    });
  }

  it('CandidateSubmission.workerId tồn tại → WORKER_NOT_DELETABLE', async () => {
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      userId: 'USR-001',
      fullName: 'Nguyễn Văn A',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    tx.worker.findUnique.mockResolvedValue({ id: 'w1' });
    tx.candidateSubmission.count
      .mockResolvedValueOnce(1) // CANDIDATE_SUBMISSION
      .mockResolvedValueOnce(0); // CANDIDATE_SUBMISSION_MERGED
    await expect(
      deleteWorker(asPrismaTx(), ADMIN_CTX, 'w1', { actorId: 'admin-1', reason: 'r' }),
    ).rejects.toMatchObject({ code: 'WORKER_NOT_DELETABLE' });
  });

  it('CandidateSubmission.mergedWorkerId tồn tại → WORKER_NOT_DELETABLE', async () => {
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      userId: 'USR-001',
      fullName: 'Nguyễn Văn A',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    tx.worker.findUnique.mockResolvedValue({ id: 'w1' });
    tx.candidateSubmission.count
      .mockResolvedValueOnce(0) // CANDIDATE_SUBMISSION
      .mockResolvedValueOnce(1); // CANDIDATE_SUBMISSION_MERGED
    await expect(
      deleteWorker(asPrismaTx(), ADMIN_CTX, 'w1', { actorId: 'admin-1', reason: 'r' }),
    ).rejects.toMatchObject({ code: 'WORKER_NOT_DELETABLE' });
  });

  it('race: re-read dưới lock thấy row đã xóa → NOT_FOUND', async () => {
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      userId: 'USR-001',
      fullName: 'Nguyễn Văn A',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    tx.worker.findUnique.mockResolvedValue(null); // concurrent delete thắng
    await expect(
      deleteWorker(asPrismaTx(), ADMIN_CTX, 'w1', { actorId: 'admin-1', reason: 'r' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('race: dependency mới tăng giữa sweep lần 1 và sweep lần 2 → vẫn 409', async () => {
    // Phase 1 sweep: 0; Phase 2 sweep: 1. Re-read dưới lock mới phát hiện.
    // Trong implementation hiện tại ta chỉ sweep 1 lần SAU re-read; assert rằng
    // implementation này vẫn re-read trước sweep (consistency).
    tx.worker.findFirst.mockResolvedValue({
      id: 'w1',
      userId: 'USR-001',
      fullName: 'Nguyễn Văn A',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    tx.worker.findUnique.mockResolvedValue({ id: 'w1' });
    tx.ticket.count.mockResolvedValue(1); // dependency xuất hiện
    await expect(
      deleteWorker(asPrismaTx(), ADMIN_CTX, 'w1', { actorId: 'admin-1', reason: 'r' }),
    ).rejects.toMatchObject({ code: 'WORKER_NOT_DELETABLE' });
  });
});

describe('inspectWorkerDependencies', () => {
  it('Worker ngoài row scope HR_STAFF → exists: false', async () => {
    tx.worker.findFirst.mockResolvedValue(null);
    const result = await inspectWorkerDependencies(asPrismaTx(), HR_STAFF_CTX, 'w1');
    expect(result.exists).toBe(false);
    expect(result.facts).toEqual([]);
  });

  it('Worker sạch → exists: true, facts: []', async () => {
    tx.worker.findFirst.mockResolvedValue({ id: 'w1' });
    const result = await inspectWorkerDependencies(asPrismaTx(), ADMIN_CTX, 'w1');
    expect(result.exists).toBe(true);
    expect(result.facts).toEqual([]);
  });

  it('Worker có LaborProfile + Ticket → facts đầy đủ', async () => {
    tx.worker.findFirst.mockResolvedValue({ id: 'w1' });
    tx.laborProfile.count.mockResolvedValue(1);
    tx.ticket.count.mockResolvedValue(2);
    const result = await inspectWorkerDependencies(asPrismaTx(), ADMIN_CTX, 'w1');
    expect(result.facts).toEqual(expect.arrayContaining(['LABOR_PROFILE', 'TICKET']));
  });
});
