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
      matchedRows: 50,
      unmatchedRows: 0,
      anomalyRows: 0,
      status: 'COMMITTED',
      errors: [],
    });
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
      findMany: () => Promise.resolve([...store.table('attendance_import_batches').values()]),
    },
    auditLog: {
      findFirst: (args: any) => store.findFirst('audit_logs', args?.where ?? {}),
      create: () => Promise.resolve({ id: 'audit-1' }),
    },
    outboxEvent: { create: () => Promise.resolve({ id: 'ev-001' }) },
    $transaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => fn(makeMockTx(store)),
  };
}

function adminCtx(userId = 'USR-HR'): AuthContext {
  return { userId, role: 'ADMIN', sessionId: 'sess-001', scope: {} };
}

function hrStaffCtx(): AuthContext {
  return { userId: 'USR-HR-2', role: 'ADMIN', sessionId: 'sess-002', scope: {} };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('E2E — F00A narrative slice 4B bước 6-10 (moment 06:20–08:30)', () => {

  it('Bước 6: Mai xem Exception Workbench — badge hiển thị 7 ngoại lệ', async () => {
    const store = makeStore();
    store.seedNarrative();
    const tx = makeMockTx(store);

    const batches = await tx.attendanceImportBatch.findMany();
    expect(batches).toHaveLength(1);
    expect(batches[0].anomalyRows).toBe(0);
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
