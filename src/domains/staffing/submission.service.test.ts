/**
 * submission.service unit tests — Phase 4 slice 4D (Job Board).
 *
 * Pattern: in-memory Prisma mock (DEC-16, like ticket.service.test.ts).
 * Tests: applyForJob, listPublicJobs, accept/reject SourceClaim, list submissions/claims.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  listPublicJobs,
  applyForJob,
  listSubmissions,
  listClaims,
  acceptSourceClaim,
  rejectSourceClaim,
  SubmissionServiceError,
} from './submission.service';

// ═══════════════════════════════════════════════════════════════════════════
// In-memory mock Prisma
// ═══════════════════════════════════════════════════════════════════════════

interface MockRow { id: string; [key: string]: unknown; }

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
        if (typeof v === 'object' && v !== null && 'not' in (v as any)) {
          // Handle { id: { not: value } }
          if (row[k] === (v as any).not) { match = false; break; }
        } else if (k === 'accepted' && typeof v === 'boolean') {
          if ((row[k] as boolean) !== v) { match = false; break; }
        } else if (row[k] !== v) { match = false; break; }
      }
      if (match) return row as T;
    }
    return null;
  }
  function findMany(name: string, args?: { where?: Record<string, unknown>; include?: Record<string, boolean> }): MockRow[] {
    const t = table(name);
    const results: MockRow[] = [];
    for (const row of t.values()) {
      let match = true;
      if (args?.where) {
        for (const [k, v] of Object.entries(args.where)) {
          if (k === 'accepted' && typeof v === 'boolean') {
            if ((row[k] as boolean) !== v) { match = false; break; }
          } else if (Array.isArray(v) && k === 'id' && v[0] && (v[0] as any).not) {
            // Handle { not: id }
            if (row[k] === (v[0] as any).not) { match = false; break; }
          } else if (row[k] !== v) { match = false; break; }
        }
      }
      if (match) {
        results.push(row);
      }
    }
    return results;
  }
  function clear() { tables.clear(); nextId = 1; }
  return { table, insert, findFirst, findMany, clear };
}

function makeMockTx(store: ReturnType<typeof makeStore>) {
  const tx = {
    ...store,
    project: {
      findMany: vi.fn(async (args: any) => store.findMany('projects', args)),
      findUnique: vi.fn(async (args: any) => store.table('projects').get(args.where?.id) ?? null),
    },
    candidateSubmission: {
      create: vi.fn(async (args: any) => store.insert('candidate_submissions', args.data)),
      findUnique: vi.fn(async (args: any) => store.table('candidate_submissions').get(args.where?.id) ?? null),
      findMany: vi.fn(async (args: any) => store.findMany('candidate_submissions', args)),
      count: vi.fn(async (args: any) => store.findMany('candidate_submissions', args).length),
      update: vi.fn(async (args: any) => {
        const r = store.table('candidate_submissions').get(args.where?.id);
        if (!r) throw new Error('not found');
        const u = { ...r, ...args.data };
        store.table('candidate_submissions').set(r.id, u);
        return u;
      }),
    },
    sourceClaim: {
      create: vi.fn(async (args: any) => store.insert('source_claims', args.data)),
      findUnique: vi.fn(async (args: any) => store.table('source_claims').get(args.where?.id) ?? null),
      findFirst: vi.fn(async (args: any) => store.findFirst('source_claims', args.where ?? {})),
      findMany: vi.fn(async (args: any) => store.findMany('source_claims', args)),
      count: vi.fn(async (args: any) => store.findMany('source_claims', args).length),
      update: vi.fn(async (args: any) => {
        const r = store.table('source_claims').get(args.where?.id);
        if (!r) throw new Error('not found');
        const u = { ...r, ...args.data };
        store.table('source_claims').set(r.id, u);
        return u;
      }),
    },
    worker: {
      findUnique: vi.fn(async (args: any) => store.table('workers').get(args.where?.id) ?? null),
    },
    // MP-2 (DEC-01/DEC-08): the anonymous apply path delegates to the
    // SECURITY DEFINER function via $queryRawUnsafe. Default: one NEW row.
    $queryRawUnsafe: vi.fn(async (..._args: unknown[]) => [{ tracking_code: 'APP-TEST-CODE', status: 'NEW' }]),
    $transaction: vi.fn(async function(_fn: (tx: any) => Promise<unknown>) {
      // Sequential awaits - no $transaction wrapper needed
    }),
  };
  return tx;
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

function adminCtx() {
  return { userId: 'admin-001', role: 'ADMIN' as const, permissions: [], dbLabel: null };
}
function hrCtx() {
  return { userId: 'hr-001', role: 'HR_STAFF' as const, permissions: [], dbLabel: null };
}
function workerCtx() {
  return { userId: 'worker-001', role: 'WORKER' as const, permissions: [], dbLabel: null, workerId: 'wkr-001' };
}
function vendorCtx() {
  return { userId: 'vendor-001', role: 'VENDOR_ADMIN' as const, permissions: [], dbLabel: null, vendorId: 'v-001' };
}

// ─── Seed fixture ────────────────────────────────────────────────────────────

function seed(store: ReturnType<typeof makeStore>) {
  // Public project with slots
  store.insert('projects', { id: 'p-1', name: 'Cong ty A', isPublic: true, status: 'ACTIVE', vendorId: null });
  // Project with vendor
  store.insert('projects', { id: 'p-2', name: 'Cong ty B', isPublic: true, status: 'ACTIVE', vendorId: 'v-001' });
  // Private project (should not appear)
  store.insert('projects', { id: 'p-3', name: 'Cong ty C', isPublic: false, status: 'ACTIVE', vendorId: null });
  // Worker
  store.insert('workers', { id: 'wkr-001', fullName: 'Nguyen Van A', status: 'ACTIVE' });
}

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe('submission.service — Job Board (4D)', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  // ── listPublicJobs ────────────────────────────────────────────────────────

  describe('listPublicJobs', () => {
    it('tra ve chi project isPublic=true', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);

      const jobs = await listPublicJobs(tx as any);
      expect(jobs.length).toBeGreaterThanOrEqual(2);
      expect(jobs.every(j => j.isPublic)).toBe(true);
    });

    it('tra ve rong khi khong co project public', async () => {
      const store = makeStore();
      const tx = makeMockTx(store);

      const jobs = await listPublicJobs(tx as any);
      // No projects seeded
      expect(jobs).toHaveLength(0);
    });
  });

  // ── applyForJob (MP-2 DEC-01: legacy wrapper → definer boundary) ──────────
  //
  // The legacy entry point MUST NOT create a Worker/SourceClaim. It delegates to
  // the SECURITY DEFINER apply function (mocked here via $queryRawUnsafe) and
  // returns the stored tracking result.

  describe('applyForJob', () => {
    it('delegates to the definer apply function and returns { trackingCode, status }', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      tx.$queryRawUnsafe.mockResolvedValueOnce([{ tracking_code: 'APP-ABCD-EFGH', status: 'NEW' }]);
      const ctx = workerCtx();

      const result = await applyForJob(tx as any, ctx, {
        projectId: 'p-1',
        fullName: 'Tran Van B',
        phone: '0909123456',
        cccdNumber: '123456789012',
      });

      expect(result).toEqual({ trackingCode: 'APP-ABCD-EFGH', status: 'NEW' });

      // Delegation happened through the definer boundary.
      expect(tx.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      const [sql] = tx.$queryRawUnsafe.mock.calls[0];
      expect(sql).toContain('hrp_public_apply_submission');

      // DEC-01/EV-08: anonymous apply must NEVER create a Worker or SourceClaim.
      expect(tx.sourceClaim.create).not.toHaveBeenCalled();
      expect(tx.candidateSubmission.create).not.toHaveBeenCalled();
      expect(store.table('source_claims').size).toBe(0);
      expect(store.table('candidate_submissions').size).toBe(0);
    });

    it('throw VALIDATION khi thieu required fields (khong cham DB)', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = workerCtx();

      await expect(applyForJob(tx as any, ctx, {
        projectId: 'p-1',
        fullName: '',
        phone: '0909123456',
      })).rejects.toThrow(SubmissionServiceError);

      await expect(applyForJob(tx as any, ctx, {
        projectId: 'p-1',
        fullName: 'Tran Van B',
        phone: '',
      })).rejects.toThrow(SubmissionServiceError);

      expect(tx.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('throw PROJECT_NOT_PUBLIC khi definer raise JOB_NOT_AVAILABLE (P0011)', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = workerCtx();

      tx.$queryRawUnsafe.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('raw failed', {
          code: 'P2010',
          clientVersion: 'test',
          meta: { code: 'P0011' },
        }),
      );

      await expect(applyForJob(tx as any, ctx, {
        projectId: 'p-nonexistent',
        fullName: 'Tran Van B',
        phone: '0909123456',
      })).rejects.toMatchObject({ code: 'PROJECT_NOT_PUBLIC' });
    });
  });

  // ── acceptSourceClaim ─────────────────────────────────────────────────────

  describe('acceptSourceClaim', () => {
    it('dat accepted=true, cap nhat submission thanh SCREENING', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = hrCtx();

      // Pre-seed submission + claim
      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'Ung Vien 1', phone: '0909111111', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-1', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: false });

      await acceptSourceClaim(tx as any, ctx, 'clm-1');

      const claim = store.table('source_claims').get('clm-1') as any;
      expect(claim.accepted).toBe(true);
      expect(claim.acceptedBy).toBe('hr-001');

      const sub = store.table('candidate_submissions').get('sub-1') as any;
      expect(sub.status).toBe('SCREENING');
    });

    it('throw ALREADY_ACCEPTED khi claim da accepted', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = hrCtx();

      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-1', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: true });

      await expect(acceptSourceClaim(tx as any, ctx, 'clm-1')).rejects.toThrow(SubmissionServiceError);
    });

    it('throw DUPLICATE_WORKER_ACCEPTED khi worker da co claim accepted khac', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = hrCtx();

      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'QUALIFIED' });
      store.insert('candidate_submissions', { id: 'sub-2', projectId: 'p-2', fullName: 'UV2', phone: '0909222222', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-old', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: true });
      store.insert('source_claims', { id: 'clm-new', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-2', accepted: false });

      await expect(acceptSourceClaim(tx as any, ctx, 'clm-new')).rejects.toThrow(SubmissionServiceError);
    });

    it('throw FORBIDDEN khi worker role', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = workerCtx();

      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-1', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: false });

      await expect(acceptSourceClaim(tx as any, ctx, 'clm-1')).rejects.toThrow(SubmissionServiceError);
    });
  });

  // ── rejectSourceClaim ─────────────────────────────────────────────────────

  describe('rejectSourceClaim', () => {
    it('dat accepted=false, cap nhat submission thanh REJECTED', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = hrCtx();

      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-1', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: false });

      await rejectSourceClaim(tx as any, ctx, 'clm-1');

      const claim = store.table('source_claims').get('clm-1') as any;
      expect(claim.accepted).toBe(false);

      const sub = store.table('candidate_submissions').get('sub-1') as any;
      expect(sub.status).toBe('REJECTED');
    });

    it('throw FORBIDDEN khi worker role', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = workerCtx();

      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-1', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: false });

      await expect(rejectSourceClaim(tx as any, ctx, 'clm-1')).rejects.toThrow(SubmissionServiceError);
    });
  });

  // ── listSubmissions ───────────────────────────────────────────────────────

  describe('listSubmissions', () => {
    it('ADMIN thay tat ca submissions', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = adminCtx();

      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'NEW' });
      store.insert('candidate_submissions', { id: 'sub-2', projectId: 'p-2', fullName: 'UV2', phone: '0909222222', status: 'SCREENING' });

      const result = await listSubmissions(tx as any, ctx);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('WORKER bi FORBIDDEN', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = workerCtx();

      await expect(listSubmissions(tx as any, ctx)).rejects.toThrow(SubmissionServiceError);
    });
  });

  // ── listClaims ────────────────────────────────────────────────────────────

  describe('listClaims', () => {
    it('ADMIN thay tat ca claims', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = adminCtx();

      store.insert('source_claims', { id: 'clm-1', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: false });
      store.insert('source_claims', { id: 'clm-2', workerId: 'wkr-002', claimType: 'VENDOR_SUPPLIED', submissionId: 'sub-2', accepted: true });

      const result = await listClaims(tx as any, ctx);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('WORKER bi FORBIDDEN', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      const ctx = workerCtx();

      await expect(listClaims(tx as any, ctx)).rejects.toThrow(SubmissionServiceError);
    });
  });
});
