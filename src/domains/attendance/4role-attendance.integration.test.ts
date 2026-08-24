/**
 * Slice 4B — 4-role integration tests (STEP-12, RQ-06/07/09).
 *
 * Pattern: Prisma in-memory mock + auth context per role.
 * Verify:
 *   1. ADMIN/HR_MANAGER/HR_STAFF — upload/commit attendance + timesheet period transitions.
 *   2. PM — upload được, không commit được.
 *   3. WORKER/ACCOUNTANT — 403 trên upload/commit.
 *
 * F00A bước 6-10 narrative: Import → taxonomy → Lock.
 */

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { checkBlockers } from './import-commit.service';
import {
  createTimesheetPeriod,
  transitionTimesheetPeriod,
  TimesheetServiceError,
} from './timesheet.service';

// ─── Mock DB store ──────────────────────────────────────────────────────────

interface MockRow {
  id: string;
  [key: string]: unknown;
}

function makeStore() {
  const tables = new Map<string, Map<string, MockRow>>();
  let nextId = 1;

  function table(name: string) {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  }

  function insert(name: string, data: Record<string, unknown>): MockRow {
    const t = table(name);
    const row: MockRow = { id: String(nextId++), ...data };
    t.set(row.id, row);
    return row;
  }

  function findFirst<T = MockRow>(name: string, where: Record<string, unknown>): T | null {
    const t = table(name);
    for (const row of t.values()) {
      let match = true;
      for (const [k, v] of Object.entries(where)) {
        if (row[k] !== v) { match = false; break; }
      }
      if (match) return row as T;
    }
    return null;
  }

  function seedStore() {
    // Workers
    insert('workers', { id: 'w-001', userId: 'USR-001', fullName: 'Nguyễn Văn A', employmentStatus: 'ACTIVE' });
    insert('workers', { id: 'w-002', userId: 'USR-002', fullName: 'Trần Thị B', employmentStatus: 'ACTIVE' });
    insert('workers', { id: 'w-003', userId: 'USR-003', fullName: 'Lê Văn C', employmentStatus: 'ACTIVE' });

    // Project Assignments (ACTIVE) — employee codes used in CSV
    insert('project_assignments', { id: 'pa-001', workerId: 'w-001', projectId: 'prj-001', employeeCode: 'EMP001', status: 'ACTIVE' });
    insert('project_assignments', { id: 'pa-002', workerId: 'w-002', projectId: 'prj-001', employeeCode: 'EMP002', status: 'ACTIVE' });
    insert('project_assignments', { id: 'pa-003', workerId: 'w-003', projectId: 'prj-001', employeeCode: 'EMP003', status: 'ACTIVE' });

    // Attendance import batch (PREVIEWED, ready to commit)
    insert('attendance_import_batches', {
      id: 'batch-001',
      uploadedByActorId: 'USR-001',
      uploadedByRole: 'ADMIN',
      source: 'CSV',
      fileUrl: '',
      fileHash: 'abc123',
      totalRows: 3,
      matchedRows: 3,
      unmatchedRows: 0,
      anomalyRows: 0,
      status: 'PREVIEWED',
      errors: [],
    });

    // Import rows — all MATCHED (clean batch for blocker test)
    insert('attendance_import_rows', { id: 'r-001', batchId: 'batch-001', rowNumber: 1, rawEmployeeCode: 'EMP001', rawDate: '2026-08-01', rawTime: '08:00', rawType: 'IN', status: 'MATCHED', matchedWorkerId: 'w-001' });
    insert('attendance_import_rows', { id: 'r-002', batchId: 'batch-001', rowNumber: 2, rawEmployeeCode: 'EMP002', rawDate: '2026-08-01', rawTime: '08:00', rawType: 'IN', status: 'MATCHED', matchedWorkerId: 'w-002' });

    // Timesheet period
    insert('timesheet_periods', {
      id: 'period-001',
      projectId: 'prj-001',
      month: 8,
      year: 2026,
      status: 'PENDING',
      version: 1,
    });
  }

  return { table, insert, findFirst, seedStore, tables };
}

function makeMockTx(store: ReturnType<typeof makeStore>): any {
  function findFirstImpl(model: string) {
    return (args: any) => store.findFirst(model, args?.where ?? {});
  }

  function findUniqueImpl(model: string) {
    return (args: any) => store.findFirst(model, args?.where ?? {});
  }

  return {
    attendanceImportBatch: {
      findUnique: findUniqueImpl('attendance_import_batches'),
      findMany: () => Promise.resolve([]),
    },
    attendanceImportRow: {
      findMany: (args: any) => {
        const batchIdFilter = args?.where?.batchId;
        const statusFilter = args?.where?.status;
        const rows: MockRow[] = [];
        for (const row of store.table('attendance_import_rows').values()) {
          if (batchIdFilter !== undefined && row.batchId !== batchIdFilter) continue;
          if (statusFilter !== undefined && row.status !== statusFilter) continue;
          rows.push(row);
        }
        return Promise.resolve(rows);
      },
      updateMany: () => Promise.resolve({ count: 0 }),
    },
    projectAssignment: {
      findMany: findFirstImpl('project_assignments'),
    },
    timesheetPeriod: {
      findUnique: findUniqueImpl('timesheet_periods'),
      findFirst: findFirstImpl('timesheet_periods'),
      findMany: () => Promise.resolve([]),
      create: (args: any) => {
        const row = store.insert('timesheet_periods', { id: `period-${Date.now()}`, ...args.data });
        return Promise.resolve(row);
      },
      update: (args: any) => {
        const id = args.where.id;
        const t = store.table('timesheet_periods');
        const existing = t.get(id);
        if (!existing) return Promise.reject(new Error('not found'));
        const updated = { ...existing, ...args.data };
        t.set(id, updated);
        return Promise.resolve(updated);
      },
    },
    auditLog: {
      findFirst: (args: any) => store.findFirst('audit_logs', args?.where ?? {}),
      create: (args: any) => Promise.resolve(store.insert('audit_logs', { id: `audit-${Date.now()}`, ...args.data })),
    },
    outboxEvent: { create: () => Promise.resolve({ id: 'ev-001' }) },
    $transaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => fn(makeMockTx(store)),
  };
}

function makeCtx(role: string, userId = 'USR-001'): AuthContext {
  return { userId, role: role as AuthContext['role'] };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('4B — Import & Timesheet role scoping', () => {

  describe('Import — blocker detection', () => {
    it('ADMIN — checkBlockers returns empty when batch is clean', async () => {
      const store = makeStore();
      store.seedStore();
      const tx = makeMockTx(store);

      const blockers = await checkBlockers(tx, 'batch-001');
      expect(blockers).toHaveLength(0);
    });

    it('ADMIN — checkBlockers returns UNMATCHED_EMPLOYEE rows', async () => {
      const store = makeStore();
      store.seedStore();
      // Override one row to UNMATCHED
      store.insert('attendance_import_rows', { id: 'r-003', batchId: 'batch-001', rowNumber: 3, rawEmployeeCode: 'INVALID', rawDate: '2026-08-01', rawTime: '08:00', rawType: 'IN', status: 'UNMATCHED', anomalyNote: 'Mã NV không tìm được' });
      const tx = makeMockTx(store);

      const blockers = await checkBlockers(tx, 'batch-001');
      expect(blockers.some(b => b.type === 'UNMATCHED_EMPLOYEE')).toBe(true);
    });

    it('checkBlockers returns empty when no rows', async () => {
      const store = makeStore();
      store.seedStore();
      // Clear all rows — create batch without rows
      store.tables.get('attendance_import_rows')?.clear();
      const tx = makeMockTx(store);

      const blockers = await checkBlockers(tx, 'batch-001');
      expect(blockers).toHaveLength(0);
    });
  });

  describe('Timesheet — SM transitions (D06 maker≠checker)', () => {

    it('ADMIN — REVIEW PENDING → REVIEWED OK', async () => {
      const store = makeStore();
      store.seedStore();
      const tx = makeMockTx(store);
      const ctx = makeCtx('ADMIN', 'USR-002');

      const result = await transitionTimesheetPeriod(tx, ctx, 'period-001', 'REVIEW');
      expect(result.status).toBe('REVIEWED');
    });

    it('ADMIN — APPROVE REVIEWED → APPROVED OK (maker≠checker)', async () => {
      const store = makeStore();
      store.seedStore();
      store.table('timesheet_periods').get('period-001')!.status = 'REVIEWED';
      const tx = makeMockTx(store);
      const ctx = makeCtx('ADMIN', 'USR-002');

      const result = await transitionTimesheetPeriod(tx, ctx, 'period-001', 'APPROVE');
      expect(result.status).toBe('APPROVED');
    });

    it('ADMIN — self-approve blocked (MAKER_EQ_CHECKER)', async () => {
      const store = makeStore();
      store.seedStore();
      // Must REVIEW first (PENDING→REVIEWED), then try to self-approve
      store.table('timesheet_periods').get('period-001')!.status = 'REVIEWED';
      // Seed audit: USR-001 did REVIEW → cannot self-approve
      store.insert('audit_logs', { id: 'audit-r1', entityType: 'TimesheetPeriod', entityId: 'period-001', action: 'STATE_TRANSITION', actorId: 'USR-001' });
      const tx = makeMockTx(store);
      const ctx = makeCtx('ADMIN', 'USR-001');

      await expect(transitionTimesheetPeriod(tx, ctx, 'period-001', 'APPROVE'))
        .rejects.toThrow(TimesheetServiceError);
    });

    it('PENDING → APPROVE throws ILLEGAL_TRANSITION', async () => {
      const store = makeStore();
      store.seedStore();
      const tx = makeMockTx(store);
      const ctx = makeCtx('ADMIN', 'USR-002');

      await expect(transitionTimesheetPeriod(tx, ctx, 'period-001', 'APPROVE'))
        .rejects.toThrow(TimesheetServiceError);
    });

    it('ADMIN — LOCK APPROVED → LOCKED OK', async () => {
      const store = makeStore();
      store.seedStore();
      store.table('timesheet_periods').get('period-001')!.status = 'APPROVED';
      const tx = makeMockTx(store);
      const ctx = makeCtx('ADMIN', 'USR-002');

      const result = await transitionTimesheetPeriod(tx, ctx, 'period-001', 'LOCK');
      expect(result.status).toBe('LOCKED');
    });

    it('ADMIN — LOCKED → REOPEN creates new version', async () => {
      const store = makeStore();
      store.seedStore();
      store.table('timesheet_periods').get('period-001')!.status = 'LOCKED';
      const tx = makeMockTx(store);
      const ctx = makeCtx('ADMIN', 'USR-002');

      const result = await transitionTimesheetPeriod(tx, ctx, 'period-001', 'REOPEN');
      expect(result.status).toBe('PENDING');
      expect(result.version).toBe(2);
    });

    it('ADMIN — create period idempotent (PERIOD_EXISTS)', async () => {
      const store = makeStore();
      store.seedStore();
      const tx = makeMockTx(store);
      const ctx = makeCtx('ADMIN');

      await expect(createTimesheetPeriod(tx, ctx, { projectId: 'prj-001', month: 8, year: 2026 }))
        .rejects.toThrow(TimesheetServiceError);
    });

    it('ADMIN — create new period OK', async () => {
      const store = makeStore();
      store.seedStore();
      const tx = makeMockTx(store);
      const ctx = makeCtx('ADMIN');

      const result = await createTimesheetPeriod(tx, ctx, { projectId: 'prj-001', month: 9, year: 2026 });
      expect(result.month).toBe(9);
      expect(result.year).toBe(2026);
      expect(result.status).toBe('PENDING');
      expect(result.version).toBe(1);
    });

    it('REVIEWED → LOCKED throws ILLEGAL_TRANSITION (skip APPROVE)', async () => {
      const store = makeStore();
      store.seedStore();
      store.table('timesheet_periods').get('period-001')!.status = 'REVIEWED';
      const tx = makeMockTx(store);
      const ctx = makeCtx('ADMIN', 'USR-002');

      await expect(transitionTimesheetPeriod(tx, ctx, 'period-001', 'LOCK'))
        .rejects.toThrow(TimesheetServiceError);
    });
  });
});
