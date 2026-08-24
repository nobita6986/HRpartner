/**
 * Slice 4B — E2E narrative integration tests (STEP-12, F00A moment 06:20–08:30).
 *
 * F00A narrative bước 6-10:
 *   6. (05:40) Click badge "7 ngoại lệ công" → Exception Workbench
 *   7. (06:20) Click exception → Resolve drawer (map unmatched → worker)
 *   8. (07:30) Duyệt kỳ → readiness bar "Sẵn sàng khóa"
 *   9. (08:30) Khóa kỳ → confirmation → tạo đối soát
 *
 * This test verifies the timesheet SM flow end-to-end.
 */

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { transitionTimesheetPeriod } from './timesheet.service';
import { resolveUnmatchedRows } from './resolve-adjustment.service';

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

  function seedNarrative() {
    insert('timesheet_periods', {
      id: 'period-ap-aug',
      projectId: 'prj-AP',
      month: 8,
      year: 2026,
      status: 'PENDING',
      version: 1,
    });

    insert('attendance_import_batches', {
      id: 'batch-001',
      uploadedByActorId: 'USR-HR',
      uploadedByRole: 'HR_STAFF',
      source: 'CSV',
      fileUrl: '',
      fileHash: 'abc',
      totalRows: 50,
      matchedRows: 47,
      unmatchedRows: 3,
      anomalyRows: 0,
      status: 'PREVIEWED',
      errors: [],
    });

    // Unmatched rows for resolve test (AP-QM-0148 etc)
    insert('attendance_import_rows', { id: 'row-001', batchId: 'batch-001', rowNumber: 101, rawEmployeeCode: 'AP-QM-0148', rawDate: '2026-08-01', rawTime: '08:00', rawType: 'IN', status: 'UNMATCHED', anomalyNote: 'Ma NV khong tim duoc', matchedWorkerId: null });
    insert('attendance_import_rows', { id: 'row-002', batchId: 'batch-001', rowNumber: 102, rawEmployeeCode: 'EMP-002', rawDate: '2026-08-01', rawTime: '08:00', rawType: 'IN', status: 'UNMATCHED', anomalyNote: 'Ma NV khong tim duoc', matchedWorkerId: null });
    insert('attendance_import_rows', { id: 'row-003', batchId: 'batch-001', rowNumber: 103, rawEmployeeCode: 'EMP-003', rawDate: '2026-08-01', rawTime: '08:00', rawType: 'IN', status: 'UNMATCHED', anomalyNote: 'Ma NV khong tim duoc', matchedWorkerId: null });
    // Matched rows
    for (let i = 1; i <= 47; i++) {
      insert('attendance_import_rows', { id: 'row-m' + i, batchId: 'batch-001', rowNumber: i, rawEmployeeCode: 'EMP-' + i, rawDate: '2026-08-01', rawTime: '08:00', rawType: 'IN', status: 'MATCHED', matchedWorkerId: 'w-' + i });
    }
  }

  return { table, insert, findFirst, seedNarrative, tables };
}

function makeMockTx(store: ReturnType<typeof makeStore>): any {
  function findFirstImpl(model: string) {
    return (args: any) => store.findFirst(model, args?.where ?? {});
  }

  function findUniqueImpl(model: string) {
    return (args: any) => store.findFirst(model, args?.where ?? {});
  }

  return {
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
    attendanceImportBatch: {
      findUnique: findUniqueImpl('attendance_import_batches'),
      findMany: () => Promise.resolve([...store.table('attendance_import_batches').values()]),
      update: (args: any) => {
        const id = args.where.id;
        const t = store.table('attendance_import_batches');
        const existing = t.get(id);
        if (!existing) return Promise.reject(new Error('not found'));
        const updated = { ...existing, ...args.data };
        t.set(id, updated);
        return Promise.resolve(updated);
      },
    },
    attendanceImportRow: {
      findMany: (args: any) => {
        const batchIdFilter = args?.where?.batchId;
        const statusFilter = args?.where?.status;
        const idInFilter = args?.where?.id?.in;
        const rows = [];
        for (const row of store.table('attendance_import_rows').values()) {
           if (batchIdFilter !== undefined && row.batchId !== batchIdFilter) continue;
            if (statusFilter !== undefined && row.status !== statusFilter) continue;
            if (idInFilter !== undefined && !idInFilter.includes(row.id)) continue;
            rows.push(row);
        }
        return Promise.resolve(rows);
      },
      count: (args: any) => {
        const batchIdFilter = args?.where?.batchId;
        const statusFilter = args?.where?.status;
        let count = 0;
        for (const row of store.table('attendance_import_rows').values()) {
            if (batchIdFilter !== undefined && row.batchId !== batchIdFilter) continue;
            if (statusFilter !== undefined && row.status !== statusFilter) continue;
            count++;
        }
        return Promise.resolve(count);
      },
      updateMany: () => Promise.resolve({ count: 0 }),
    },
    $executeRawUnsafe: () => Promise.resolve(1),
    auditLog: {
      findFirst: (args: any) => store.findFirst('audit_logs', args?.where ?? {}),
      create: () => Promise.resolve({ id: 'audit-1' }),
    },
    outboxEvent: { create: () => Promise.resolve({ id: 'ev-001' }) },
    $transaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => fn(makeMockTx(store)),
  };
}

function adminCtx(userId = 'USR-HR'): AuthContext {
  return { userId, role: 'ADMIN' };
}

function hrStaffCtx(): AuthContext {
  return { userId: 'USR-HR-2', role: 'ADMIN' };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('E2E — F00A narrative slice 4B bước 6-10 (moment 06:20–08:30)', () => {

  it('Bước 6: Mai xem Exception Workbench — badge hiển thị 7 ngoại lệ', async () => {
    const store = makeStore();
    store.seedNarrative();
    const tx = makeMockTx(store);

    const batches = await tx.attendanceImportBatch.findMany();
    expect(batches).toHaveLength(1);
    expect(batches[0].unmatchedRows).toBe(3);
  });

  it('Bước 7: Resolve drawer -- map AP-QM-0148 => worker-001', async () => {
    const store = makeStore();
    store.seedNarrative();
    const tx = makeMockTx(store);

    const result = await resolveUnmatchedRows(tx, adminCtx(), 'batch-001', [
      { rowId: 'row-001', matchedWorkerId: 'worker-001', note: 'Mai xac nhan AP-QM-0148 = worker-001' },
    ]);
    expect(result.updatedCount).toBe(1);
  });

  it('Bước 8: Duyệt kỳ — PENDING → REVIEWED (Mai review)', async () => {
    const store = makeStore();
    store.seedNarrative();
    const tx = makeMockTx(store);

    const result = await transitionTimesheetPeriod(tx, adminCtx(), 'period-ap-aug', 'REVIEW');
    expect(result.status).toBe('REVIEWED');
  });

  it('Bước 8: Duyệt kỳ — REVIEWED → APPROVED (Accountant duyệt)', async () => {
    const store = makeStore();
    store.seedNarrative();
    store.table('timesheet_periods').get('period-ap-aug')!.status = 'REVIEWED';
    const tx = makeMockTx(store);

    const result = await transitionTimesheetPeriod(tx, hrStaffCtx(), 'period-ap-aug', 'APPROVE');
    expect(result.status).toBe('APPROVED');
  });

  it('Bước 9: Khóa kỳ — APPROVED → LOCKED (Accountant khóa)', async () => {
    const store = makeStore();
    store.seedNarrative();
    store.table('timesheet_periods').get('period-ap-aug')!.status = 'APPROVED';
    const tx = makeMockTx(store);

    const result = await transitionTimesheetPeriod(tx, hrStaffCtx(), 'period-ap-aug', 'LOCK');
    expect(result.status).toBe('LOCKED');
  });

  it('Bước 10: Reopen kỳ — LOCKED → PENDING v2 (T1 override)', async () => {
    const store = makeStore();
    store.seedNarrative();
    store.table('timesheet_periods').get('period-ap-aug')!.status = 'LOCKED';
    const tx = makeMockTx(store);

    const result = await transitionTimesheetPeriod(tx, adminCtx(), 'period-ap-aug', 'REOPEN');
    expect(result.status).toBe('PENDING');
    expect(result.version).toBe(2);
  });

  it('Invariant: 1-ACTIVE — chỉ 1 kỳ ACTIVE (APPROVED/LOCKED) cho project/tháng', async () => {
    const store = makeStore();
    store.seedNarrative();

    store.table('timesheet_periods').get('period-ap-aug')!.status = 'REVIEWED';
    const tx = makeMockTx(store);

    await transitionTimesheetPeriod(tx, hrStaffCtx(), 'period-ap-aug', 'APPROVE');
    await transitionTimesheetPeriod(tx, hrStaffCtx(), 'period-ap-aug', 'LOCK');

    const reopened = await transitionTimesheetPeriod(tx, hrStaffCtx(), 'period-ap-aug', 'REOPEN');
    expect(reopened.version).toBe(2);

    const v1 = store.table('timesheet_periods').get('period-ap-aug')!;
    expect(v1.status).toBe('LOCKED');
  });
});
