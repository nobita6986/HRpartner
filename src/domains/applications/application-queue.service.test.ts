/**
 * application-queue.service unit tests — MP-2 STEP-04 (RQ-05/RQ-06).
 *
 * Pure, in-memory mock tx (DEC-16 pattern). Covers:
 *  - DEC-06 role matrix (ADMIN/HR_MANAGER/DIRECTOR/SALE allowed; others 403)
 *  - pagination clamp (take 1..100, skip >= 0)
 *  - source filter shape (PUBLIC / VENDOR / CTV)
 *  - detail projection carries no forbidden internal field (4.3)
 *  - NEW <-> NEEDS_INFO state machine + append-only history (DEC-05)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listApplications,
  getApplicationDetail,
  transitionApplicationStatus,
  AdminApplicationError,
} from './application-queue.service';

interface Row { id: string; [k: string]: unknown; }

function makeStore() {
  const subs = new Map<string, Row>();
  const history: Row[] = [];
  let seq = 1;
  return { subs, history, nextId: () => `h-${seq++}` };
}

function makeMockTx(store: ReturnType<typeof makeStore>) {
  return {
    candidateSubmission: {
      findMany: vi.fn(async (_args: any) => Array.from(store.subs.values())),
      count: vi.fn(async (_args: any) => store.subs.size),
      findUnique: vi.fn(async (args: any) => {
        const r = store.subs.get(args.where?.id);
        if (!r) return null;
        // Emulate include: { statusHistory } (asc by createdAt).
        if (args.include?.statusHistory) {
          return { ...r, statusHistory: store.history.filter((h) => h.submissionId === r.id) };
        }
        return r;
      }),
      update: vi.fn(async (args: any) => {
        const r = store.subs.get(args.where?.id);
        if (!r) throw new Error('not found');
        const u = { ...r, ...args.data };
        store.subs.set(r.id, u);
        return u;
      }),
    },
    applicationStatusHistory: {
      create: vi.fn(async (args: any) => {
        const row: Row = { id: store.nextId(), createdAt: new Date(), ...args.data };
        store.history.push(row);
        return row;
      }),
    },
  };
}

const QUEUE = ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE'] as const;
const NON_QUEUE = ['HR_STAFF', 'WORKER', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'PM', 'ACCOUNTANT'] as const;

function ctxOf(role: string) {
  return { userId: `${role.toLowerCase()}-1`, role: role as any };
}

function seedSub(store: ReturnType<typeof makeStore>, over: Partial<Row> = {}): Row {
  const id = (over.id as string) ?? `sub-${store.subs.size + 1}`;
  const row: Row = {
    id,
    fullName: 'Nguyen Van A',
    phone: '0909123456',
    status: 'NEW',
    slotId: null,
    projectId: 'p-1',
    project: { name: 'Cong ty A' },
    publicTrackingCode: 'APP-AAAA-BBBB',
    vendorId: null,
    ctvId: null,
    createdAt: new Date('2026-08-20T00:00:00Z'),
    cccdNumber: '123456789012',
    dateOfBirth: null,
    gender: null,
    experience: null,
    cvFileName: null,
    cvMimeType: null,
    cvSizeBytes: null,
    consentAt: new Date('2026-08-20T00:00:00Z'),
    ...over,
  };
  store.subs.set(id, row);
  return row;
}

describe('application-queue.service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── DEC-06 role matrix ──────────────────────────────────────────────────
  describe('role matrix (DEC-06)', () => {
    for (const role of QUEUE) {
      it(`${role} may list`, async () => {
        const store = makeStore();
        seedSub(store);
        const tx = makeMockTx(store);
        const res = await listApplications(tx as any, ctxOf(role));
        expect(res.total).toBe(1);
        expect(res.rows).toHaveLength(1);
      });
    }
    for (const role of NON_QUEUE) {
      it(`${role} is FORBIDDEN on list/detail/transition`, async () => {
        const store = makeStore();
        seedSub(store, { id: 'sub-x' });
        const tx = makeMockTx(store);
        await expect(listApplications(tx as any, ctxOf(role))).rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
        await expect(getApplicationDetail(tx as any, ctxOf(role), 'sub-x')).rejects.toMatchObject({ code: 'FORBIDDEN' });
        await expect(transitionApplicationStatus(tx as any, ctxOf(role), 'sub-x', 'NEEDS_INFO', 'r')).rejects.toMatchObject({ code: 'FORBIDDEN' });
      });
    }
  });

  // ── listApplications ────────────────────────────────────────────────────
  describe('listApplications', () => {
    it('maps source + projectName; forbidden fields stay out of the row', async () => {
      const store = makeStore();
      seedSub(store, { id: 's-pub' });
      seedSub(store, { id: 's-ven', vendorId: 'v-1' });
      seedSub(store, { id: 's-ctv', ctvId: 'c-1' });
      const tx = makeMockTx(store);

      const { rows } = await listApplications(tx as any, ctxOf('ADMIN'));
      const bySrc = Object.fromEntries(rows.map((r) => [r.id, r.source]));
      expect(bySrc['s-pub']).toBe('PUBLIC');
      expect(bySrc['s-ven']).toBe('VENDOR');
      expect(bySrc['s-ctv']).toBe('CTV');
      expect(rows[0].projectName).toBe('Cong ty A');
      // vendorId/ctvId are internal — never projected onto the row.
      expect(rows[0]).not.toHaveProperty('vendorId');
      expect(rows[0]).not.toHaveProperty('ctvId');
    });

    it('clamps take (>100 -> 100) and floors negative skip to 0', async () => {
      const store = makeStore();
      seedSub(store);
      const tx = makeMockTx(store);
      await listApplications(tx as any, ctxOf('ADMIN'), { take: 5000, skip: -3 });
      const args = tx.candidateSubmission.findMany.mock.calls[0][0];
      expect(args.take).toBe(100);
      expect(args.skip).toBe(0);
    });

    it('defaults take to 20 when unset', async () => {
      const store = makeStore();
      seedSub(store);
      const tx = makeMockTx(store);
      await listApplications(tx as any, ctxOf('ADMIN'));
      expect(tx.candidateSubmission.findMany.mock.calls[0][0].take).toBe(20);
    });

    it('source=VENDOR filters on vendorId not null', async () => {
      const store = makeStore();
      seedSub(store);
      const tx = makeMockTx(store);
      await listApplications(tx as any, ctxOf('ADMIN'), { source: 'VENDOR' });
      const where = tx.candidateSubmission.findMany.mock.calls[0][0].where;
      expect(where.vendorId).toEqual({ not: null });
    });

    it('q builds an OR over fullName/phone/trackingCode', async () => {
      const store = makeStore();
      seedSub(store);
      const tx = makeMockTx(store);
      await listApplications(tx as any, ctxOf('ADMIN'), { q: '  Nguyen ' });
      const where = tx.candidateSubmission.findMany.mock.calls[0][0].where;
      expect(Array.isArray(where.OR)).toBe(true);
      expect(where.OR).toHaveLength(3);
    });
  });

  // ── getApplicationDetail ────────────────────────────────────────────────
  describe('getApplicationDetail', () => {
    it('NOT_FOUND when missing', async () => {
      const store = makeStore();
      const tx = makeMockTx(store);
      await expect(getApplicationDetail(tx as any, ctxOf('ADMIN'), 'nope')).rejects.toMatchObject({ code: 'NOT_FOUND', httpStatus: 404 });
    });

    it('returns contact PII + statusHistory, but no forbidden internal field', async () => {
      const store = makeStore();
      seedSub(store, { id: 'sub-d', vendorId: 'v-9' });
      store.history.push({ id: 'h0', submissionId: 'sub-d', fromStatus: null, toStatus: 'NEW', actorUserId: null, reason: null, createdAt: new Date('2026-08-20T00:00:00Z') });
      const tx = makeMockTx(store);

      const detail = await getApplicationDetail(tx as any, ctxOf('ADMIN'), 'sub-d');
      expect(detail.phone).toBe('0909123456');
      expect(detail.cccdNumber).toBe('123456789012');
      expect(detail.statusHistory).toHaveLength(1);
      expect(detail.statusHistory[0].toStatus).toBe('NEW');
      // 4.3 forbidden internal fields must never surface.
      expect(detail).not.toHaveProperty('vendorId');
      expect(detail).not.toHaveProperty('ctvId');
      expect(detail).not.toHaveProperty('cvStorageKey');
      expect(detail).not.toHaveProperty('reviewNote');
    });
  });

  // ── transitionApplicationStatus (DEC-05) ────────────────────────────────
  describe('transitionApplicationStatus', () => {
    it('NEW -> NEEDS_INFO updates status and appends an append-only history row', async () => {
      const store = makeStore();
      seedSub(store, { id: 'sub-t', status: 'NEW' });
      const tx = makeMockTx(store);

      const res = await transitionApplicationStatus(tx as any, ctxOf('HR_MANAGER'), 'sub-t', 'NEEDS_INFO', '  cần bổ sung CCCD  ');
      expect(res).toEqual({ id: 'sub-t', status: 'NEEDS_INFO' });
      expect(store.subs.get('sub-t')!.status).toBe('NEEDS_INFO');

      expect(tx.applicationStatusHistory.create).toHaveBeenCalledTimes(1);
      const data = tx.applicationStatusHistory.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        submissionId: 'sub-t',
        fromStatus: 'NEW',
        toStatus: 'NEEDS_INFO',
        actorUserId: 'hr_manager-1',
        reason: 'cần bổ sung CCCD',
      });
    });

    it('NEEDS_INFO -> NEW is allowed', async () => {
      const store = makeStore();
      seedSub(store, { id: 'sub-b', status: 'NEEDS_INFO' });
      const tx = makeMockTx(store);
      const res = await transitionApplicationStatus(tx as any, ctxOf('SALE'), 'sub-b', 'NEW', 'đã đủ');
      expect(res.status).toBe('NEW');
    });

    it('MP-3 target -> INVALID_TRANSITION 409, no mutation', async () => {
      const store = makeStore();
      seedSub(store, { id: 'sub-m', status: 'NEW' });
      const tx = makeMockTx(store);
      await expect(
        transitionApplicationStatus(tx as any, ctxOf('ADMIN'), 'sub-m', 'SCREENING', 'x'),
      ).rejects.toMatchObject({ code: 'INVALID_TRANSITION', httpStatus: 409 });
      expect(tx.candidateSubmission.update).not.toHaveBeenCalled();
      expect(tx.applicationStatusHistory.create).not.toHaveBeenCalled();
    });

    it('empty reason -> REASON_REQUIRED 400', async () => {
      const store = makeStore();
      seedSub(store, { id: 'sub-r', status: 'NEW' });
      const tx = makeMockTx(store);
      await expect(
        transitionApplicationStatus(tx as any, ctxOf('ADMIN'), 'sub-r', 'NEEDS_INFO', '   '),
      ).rejects.toMatchObject({ code: 'REASON_REQUIRED', httpStatus: 400 });
      expect(tx.candidateSubmission.update).not.toHaveBeenCalled();
    });

    it('NOT_FOUND when the submission does not exist', async () => {
      const store = makeStore();
      const tx = makeMockTx(store);
      await expect(
        transitionApplicationStatus(tx as any, ctxOf('ADMIN'), 'ghost', 'NEEDS_INFO', 'r'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', httpStatus: 404 });
    });
  });
});
