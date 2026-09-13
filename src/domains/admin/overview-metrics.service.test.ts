/**
 * overview-metrics.service.test.ts — unit test cho loadOverviewMetrics.
 *
 * Cover:
 *  - Permission matrix theo từng KPI (theo TASK.md §2):
 *    + ADMIN/HR_MANAGER/DIRECTOR/SALE → KPI-1 (JobOpening OPEN) có quyền
 *    + PM → KPI-1 có quyền
 *    + HR_STAFF/ACCOUNTANT → KPI-1 KHÔNG có quyền
 *    + ADMIN/HR_MANAGER/DIRECTOR/SALE/ACCOUNTANT → KPI-2 (CandidateSubmission NEW) có quyền
 *    + PM → KPI-2 có quyền
 *    + HR_STAFF → KPI-2 KHÔNG có quyền
 *    + ADMIN/HR_MANAGER/DIRECTOR/HR_STAFF → KPI-3 (Ticket PENDING) có quyền
 *    + PM → KPI-3 có quyền
 *    + ACCOUNTANT/SALE → KPI-3 KHÔNG có quyền
 *  - Scope label: ROOT roles → "toàn hệ thống"; PM → "trong phạm vi của bạn"
 *  - value 0 vs >0: render đúng, KHÔNG fallback "Không có quyền xem"
 *  - Prisma throw bubble-up (KHÔNG nuốt lỗi → KHÔNG trả 0 giả)
 *  - hasPermission=false KHÔNG query DB (tx.jobOpening/candidateSubmission/ticket.count không được gọi)
 */
import { describe, it, expect, vi } from 'vitest';
import type { Prisma, SystemRole } from '@prisma/client';
import { loadOverviewMetrics } from './overview-metrics.service';

// ═══════════════════════════════════════════════════════════════════════════
// Mock helper: tx có 3 method count, spy để đếm lần gọi
// ═══════════════════════════════════════════════════════════════════════════

interface MockTx {
  jobOpening: { count: ReturnType<typeof vi.fn> };
  candidateSubmission: { count: ReturnType<typeof vi.fn> };
  ticket: { count: ReturnType<typeof vi.fn> };
}

function makeMockTx(values: { jobOpening?: number; candidateSubmission?: number; ticket?: number } = {}): MockTx {
  return {
    jobOpening: { count: vi.fn().mockResolvedValue(values.jobOpening ?? 0) },
    candidateSubmission: { count: vi.fn().mockResolvedValue(values.candidateSubmission ?? 0) },
    ticket: { count: vi.fn().mockResolvedValue(values.ticket ?? 0) },
  };
}

// tx phải thoả mão Prisma.TransactionClient theo type-check, nhưng runtime chỉ dùng 3 method count.
// Cast an toàn vì mock đúng shape.
function asTx(mock: MockTx): Prisma.TransactionClient {
  return mock as unknown as Prisma.TransactionClient;
}

// ═══════════════════════════════════════════════════════════════════════════
// Test cases
// ═══════════════════════════════════════════════════════════════════════════

describe('loadOverviewMetrics — permission matrix', () => {
  describe('KPI-1 (JobOpening OPEN)', () => {
    it.each<SystemRole>(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE', 'PM'])(
      'role %s có quyền đọc JobOpening OPEN',
      async (role) => {
        const tx = makeMockTx({ jobOpening: 7 });
        const result = await loadOverviewMetrics({ role }, asTx(tx));
        const kpi = result.kpis.find((k) => k.key === 'JOB_OPENINGS_OPEN')!;
        expect(kpi.hasPermission).toBe(true);
        if (kpi.hasPermission) {
          expect(kpi.value).toBe(7);
          expect(kpi.href).toBe('/admin/jobs');
        }
      },
    );

    it.each<SystemRole>(['HR_STAFF', 'ACCOUNTANT'])(
      'role %s KHÔNG có quyền — trả fallback, KHÔNG query DB',
      async (role) => {
        const tx = makeMockTx();
        const result = await loadOverviewMetrics({ role }, asTx(tx));
        const kpi = result.kpis.find((k) => k.key === 'JOB_OPENINGS_OPEN')!;
        expect(kpi.hasPermission).toBe(false);
        if (!kpi.hasPermission) {
          expect(kpi.fallback).toBe('Không có quyền xem');
          expect(kpi.href).toBeNull();
        }
        expect(tx.jobOpening.count).not.toHaveBeenCalled();
      },
    );
  });

  describe('KPI-2 (CandidateSubmission NEW)', () => {
    it.each<SystemRole>(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE', 'ACCOUNTANT', 'PM'])(
      'role %s có quyền đọc CandidateSubmission NEW',
      async (role) => {
        const tx = makeMockTx({ candidateSubmission: 3 });
        const result = await loadOverviewMetrics({ role }, asTx(tx));
        const kpi = result.kpis.find((k) => k.key === 'CANDIDATE_SUBMISSIONS_NEW')!;
        expect(kpi.hasPermission).toBe(true);
        if (kpi.hasPermission) {
          expect(kpi.value).toBe(3);
          expect(kpi.href).toBe('/admin/applications');
        }
      },
    );

    it('HR_STAFF KHÔNG có quyền — trả fallback, KHÔNG query DB', async () => {
      const tx = makeMockTx();
      const result = await loadOverviewMetrics({ role: 'HR_STAFF' }, asTx(tx));
      const kpi = result.kpis.find((k) => k.key === 'CANDIDATE_SUBMISSIONS_NEW')!;
      expect(kpi.hasPermission).toBe(false);
      if (!kpi.hasPermission) {
        expect(kpi.fallback).toBe('Không có quyền xem');
        expect(kpi.href).toBeNull();
      }
      expect(tx.candidateSubmission.count).not.toHaveBeenCalled();
    });
  });

  describe('KPI-3 (Ticket PENDING)', () => {
    it.each<SystemRole>(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'PM'])(
      'role %s có quyền đọc Ticket PENDING',
      async (role) => {
        const tx = makeMockTx({ ticket: 12 });
        const result = await loadOverviewMetrics({ role }, asTx(tx));
        const kpi = result.kpis.find((k) => k.key === 'TICKETS_PENDING')!;
        expect(kpi.hasPermission).toBe(true);
        if (kpi.hasPermission) {
          expect(kpi.value).toBe(12);
          expect(kpi.href).toBe('/admin/tickets');
        }
      },
    );

    it.each<SystemRole>(['ACCOUNTANT', 'SALE'])(
      'role %s KHÔNG có quyền — trả fallback, KHÔNG query DB',
      async (role) => {
        const tx = makeMockTx();
        const result = await loadOverviewMetrics({ role }, asTx(tx));
        const kpi = result.kpis.find((k) => k.key === 'TICKETS_PENDING')!;
        expect(kpi.hasPermission).toBe(false);
        if (!kpi.hasPermission) {
          expect(kpi.fallback).toBe('Không có quyền xem');
          expect(kpi.href).toBeNull();
        }
        expect(tx.ticket.count).not.toHaveBeenCalled();
      },
    );
  });
});

describe('loadOverviewMetrics — scope label', () => {
  it.each<SystemRole>(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE', 'ACCOUNTANT', 'HR_STAFF'])(
    'role %s → scopeLabel = "toàn hệ thống"',
    async (role) => {
      const tx = makeMockTx({ jobOpening: 1, candidateSubmission: 1, ticket: 1 });
      const result = await loadOverviewMetrics({ role }, asTx(tx));
      for (const kpi of result.kpis) {
        if (kpi.hasPermission) {
          expect(kpi.scopeLabel).toBe('toàn hệ thống');
        }
      }
    },
  );

  it('role PM → scopeLabel = "trong phạm vi của bạn" (PM có quyền cả 3 KPI nhưng KHÔNG phải root)', async () => {
    const tx = makeMockTx({ jobOpening: 1, candidateSubmission: 1, ticket: 1 });
    const result = await loadOverviewMetrics({ role: 'PM' }, asTx(tx));
    for (const kpi of result.kpis) {
      if (kpi.hasPermission) {
        expect(kpi.scopeLabel).toBe('trong phạm vi của bạn');
      }
    }
  });
});

describe('loadOverviewMetrics — value semantics', () => {
  it('value 0 = query hợp lệ, KHÔNG fallback "Không có quyền xem"', async () => {
    const tx = makeMockTx({ jobOpening: 0, candidateSubmission: 0, ticket: 0 });
    const result = await loadOverviewMetrics({ role: 'ADMIN' }, asTx(tx));
    for (const kpi of result.kpis) {
      expect(kpi.hasPermission).toBe(true);
      if (kpi.hasPermission) {
        expect(kpi.value).toBe(0);
        expect(kpi.scopeLabel).toBe('toàn hệ thống');
      }
    }
  });

  it('value >0 hiển thị đúng', async () => {
    const tx = makeMockTx({ jobOpening: 5, candidateSubmission: 12, ticket: 99 });
    const result = await loadOverviewMetrics({ role: 'ADMIN' }, asTx(tx));
    const kpi1 = result.kpis.find((k) => k.key === 'JOB_OPENINGS_OPEN')!;
    const kpi2 = result.kpis.find((k) => k.key === 'CANDIDATE_SUBMISSIONS_NEW')!;
    const kpi3 = result.kpis.find((k) => k.key === 'TICKETS_PENDING')!;
    expect(kpi1.hasPermission && kpi1.value).toBe(5);
    expect(kpi2.hasPermission && kpi2.value).toBe(12);
    expect(kpi3.hasPermission && kpi3.value).toBe(99);
  });
});

describe('loadOverviewMetrics — error bubbling', () => {
  it('Prisma throw bubble-up — KHÔNG trả 0 giả', async () => {
    const tx: MockTx = {
      jobOpening: { count: vi.fn().mockRejectedValue(new Error('connection timeout')) },
      candidateSubmission: { count: vi.fn().mockResolvedValue(0) },
      ticket: { count: vi.fn().mockResolvedValue(0) },
    };
    await expect(loadOverviewMetrics({ role: 'ADMIN' }, asTx(tx))).rejects.toThrow('connection timeout');
  });
});

describe('loadOverviewMetrics — empty permission (HR_STAFF for KPI-1+2, SALE for KPI-3)', () => {
  it('HR_STAFF: KPI-1 + KPI-2 = no permission, KPI-3 = có quyền', async () => {
    const tx = makeMockTx({ ticket: 2 });
    const result = await loadOverviewMetrics({ role: 'HR_STAFF' }, asTx(tx));
    const k1 = result.kpis.find((k) => k.key === 'JOB_OPENINGS_OPEN')!;
    const k2 = result.kpis.find((k) => k.key === 'CANDIDATE_SUBMISSIONS_NEW')!;
    const k3 = result.kpis.find((k) => k.key === 'TICKETS_PENDING')!;
    expect(k1.hasPermission).toBe(false);
    expect(k2.hasPermission).toBe(false);
    expect(k3.hasPermission).toBe(true);
    if (k3.hasPermission) expect(k3.scopeLabel).toBe('toàn hệ thống');
  });

  it('SALE: KPI-1 + KPI-2 = có quyền (RLS mở all projects / all submissions), KPI-3 = no permission', async () => {
    const tx = makeMockTx({ jobOpening: 1, candidateSubmission: 2 });
    const result = await loadOverviewMetrics({ role: 'SALE' }, asTx(tx));
    const k1 = result.kpis.find((k) => k.key === 'JOB_OPENINGS_OPEN')!;
    const k2 = result.kpis.find((k) => k.key === 'CANDIDATE_SUBMISSIONS_NEW')!;
    const k3 = result.kpis.find((k) => k.key === 'TICKETS_PENDING')!;
    expect(k1.hasPermission).toBe(true);
    expect(k2.hasPermission).toBe(true);
    expect(k3.hasPermission).toBe(false);
  });

  it('ACCOUNTANT: KPI-1 = no, KPI-2 = có (toàn hệ thống), KPI-3 = no (PENDING ngoài quyền)', async () => {
    const tx = makeMockTx({ candidateSubmission: 4 });
    const result = await loadOverviewMetrics({ role: 'ACCOUNTANT' }, asTx(tx));
    const k1 = result.kpis.find((k) => k.key === 'JOB_OPENINGS_OPEN')!;
    const k2 = result.kpis.find((k) => k.key === 'CANDIDATE_SUBMISSIONS_NEW')!;
    const k3 = result.kpis.find((k) => k.key === 'TICKETS_PENDING')!;
    expect(k1.hasPermission).toBe(false);
    expect(k2.hasPermission).toBe(true);
    if (k2.hasPermission) expect(k2.scopeLabel).toBe('toàn hệ thống');
    expect(k3.hasPermission).toBe(false);
  });
});
