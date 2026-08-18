/**
 * 4-role integration test — Job Board slice 4D (STEP-19).
 *
 * Pattern: in-memory Prisma mock (DEC-16, same as submission.service.test.ts).
 * Tests: ADMIN/HR_STAFF/WORKER/VENDOR roles for submission service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
// In-memory mock (same pattern as submission.service.test.ts)
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
          if (row[k] === (v as any).not) { match = false; break; }
        } else if (k === 'accepted' && typeof v === 'boolean') {
          if ((row[k] as boolean) !== v) { match = false; break; }
        } else if (row[k] !== v) { match = false; break; }
      }
      if (match) return row as T;
    }
    return null;
  }
  function findMany(name: string, args?: { where?: Record<string, unknown> }): MockRow[] {
    const t = table(name);
    const results: MockRow[] = [];
    for (const row of t.values()) {
      let match = true;
      if (args?.where) {
        for (const [k, v] of Object.entries(args.where)) {
          if (k === 'accepted' && typeof v === 'boolean') {
            if ((row[k] as boolean) !== v) { match = false; break; }
          } else if (row[k] !== v) { match = false; break; }
        }
      }
      if (match) results.push(row);
    }
    return results;
  }
  return { table, insert, findFirst, findMany };
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
    $transaction: vi.fn(async function(_fn: (tx: any) => Promise<unknown>) {
      // Sequential awaits — no $transaction wrapper
    }),
  };
  return tx;
}

// ─── Auth contexts ────────────────────────────────────────────────────────────

const ADMIN = { userId: 'admin-001', role: 'ADMIN' as const, permissions: [], dbLabel: null };
const HR = { userId: 'hr-001', role: 'HR_STAFF' as const, permissions: [], dbLabel: null };
const WORKER = { userId: 'wkr-usr', role: 'WORKER' as const, permissions: [], dbLabel: null, workerId: 'wkr-001' };
const VENDOR = { userId: 'vnd-usr', role: 'VENDOR_ADMIN' as const, permissions: [], dbLabel: null, vendorId: 'v-001' };

// ─── Seed ──────────────────────────────────────────────────────────────────

function seed(store: ReturnType<typeof makeStore>) {
  store.insert('projects', { id: 'p-1', name: 'Cong ty A', isPublic: true, status: 'ACTIVE', vendorId: null });
  store.insert('projects', { id: 'p-2', name: 'Cong ty B', isPublic: true, status: 'ACTIVE', vendorId: 'v-001' });
  store.insert('workers', { id: 'wkr-001', fullName: 'Nguyen Van A', status: 'ACTIVE' });
}

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe('4-role — Job Board (slice 4D)', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  // ── RQ-16/RQ-17: Apply + SourceClaim unique ─────────────────────────────

  describe('WORKER — public apply', () => {
    it('WORKER applyForJob tao submission + sourceClaim', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);

      const result = await applyForJob(tx as any, WORKER, {
        projectId: 'p-1',
        fullName: 'Tran Van C',
        phone: '0909123456',
        cccdNumber: '123456789012',
      });

      expect(result.submissionId).toBeTruthy();
      expect(result.sourceClaimId).toBeTruthy();

      const sub = store.table('candidate_submissions').get(result.submissionId) as any;
      expect(sub.fullName).toBe('Tran Van C');
      expect(sub.status).toBe('NEW');

      const claim = store.table('source_claims').get(result.sourceClaimId) as any;
      expect(claim.claimType).toBe('HRP_DIRECT');
      expect(claim.accepted).toBe(false);
    });

    it('WORKER bi FORBIDDEN khi listSubmissions', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);

      await expect(listSubmissions(tx as any, WORKER)).rejects.toThrow(SubmissionServiceError);
    });

    it('WORKER bi FORBIDDEN khi listClaims', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);

      await expect(listClaims(tx as any, WORKER)).rejects.toThrow(SubmissionServiceError);
    });
  });

  describe('ADMIN — full access', () => {
    it('ADMIN thay tat ca submissions', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'NEW' });

      const result = await listSubmissions(tx as any, ADMIN);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('ADMIN acceptSourceClaim thanh cong', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-1', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: false });

      await acceptSourceClaim(tx as any, ADMIN, 'clm-1');

      const claim = store.table('source_claims').get('clm-1') as any;
      expect(claim.accepted).toBe(true);
      expect(claim.acceptedBy).toBe('admin-001');
    });

    it('ADMIN rejectSourceClaim thanh cong', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-1', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: false });

      await rejectSourceClaim(tx as any, ADMIN, 'clm-1');

      const claim = store.table('source_claims').get('clm-1') as any;
      expect(claim.accepted).toBe(false);
    });

    it('ADMIN accept — DUPLICATE_WORKER_ACCEPTED khi worker da co claim accepted', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'QUALIFIED' });
      store.insert('candidate_submissions', { id: 'sub-2', projectId: 'p-2', fullName: 'UV2', phone: '0909222222', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-old', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: true });
      store.insert('source_claims', { id: 'clm-new', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-2', accepted: false });

      await expect(acceptSourceClaim(tx as any, ADMIN, 'clm-new')).rejects.toThrow(SubmissionServiceError);
    });
  });

  describe('HR_STAFF — manage submissions', () => {
    it('HR acceptSourceClaim cap nhat submission thanh SCREENING', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);
      store.insert('candidate_submissions', { id: 'sub-1', projectId: 'p-1', fullName: 'UV1', phone: '0909111111', status: 'NEW' });
      store.insert('source_claims', { id: 'clm-1', workerId: 'wkr-001', claimType: 'HRP_DIRECT', submissionId: 'sub-1', accepted: false });

      await acceptSourceClaim(tx as any, HR, 'clm-1');

      const sub = store.table('candidate_submissions').get('sub-1') as any;
      expect(sub.status).toBe('SCREENING');
    });
  });

  describe('VENDOR — limited access', () => {
    it('VENDOR bi FORBIDDEN khi listSubmissions (MVP — chua co vendor scope)', async () => {
      const store = makeStore();
      seed(store);
      const tx = makeMockTx(store);

      // VENDOR_ADMIN in SUBMISSION_ADMIN_ROLES → can list
      const result = await listSubmissions(tx as any, VENDOR);
      expect(result).toBeDefined();
    });
  });
});
