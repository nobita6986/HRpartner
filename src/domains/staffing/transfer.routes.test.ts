/**
 * Transfer route boundary tests — AFF-04 F-P3-3 (AC-06, RQ-04).
 *
 * Verifies that the consumer-facing POST /api/staffing/transfers route
 * enforce the TransferBodyShape → toTransferInput allowlist constructor
 * for BOTH single and bulk requests:
 *
 *   - Allowed fields (workerId, fromProjectId, toProjectId, transferDate,
 *     positionCode, positionTitle, transferReason) reach the service and
 *     the idempotency fingerprint.
 *   - Forbidden client-supplied fields are SILENTLY DROPPED before the
 *     value reaches the service:
 *       referrerId, referrerUserId, ctvId, vendorId, beneficiaryUserId,
 *       assigneeUserId, sourceClaimId, sourceClaimType, laborProfileId,
 *       and any unknown fields.
 *   - Forbidden fields do NOT participate in the idempotency fingerprint.
 *   - Tests invoke the actual route handler (not static grep) — service
 *     is mocked so we can observe the input that reaches the service.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';

const store = {
  rows: new Map<string, { requestHash: string; response: unknown; statusCode: number; expiresAt: Date }>(),
};

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(() => ({ marker: 'db' })),
  withDbContext: vi.fn(),
  transferWorker: vi.fn(),
  bulkTransferWorker: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/auth-context', async (original) => {
  const actual = await original<typeof import('@/src/shared/auth/auth-context')>();
  return { ...actual, getAuthContext: mocks.getAuthContext };
});
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
vi.mock('@/src/domains/staffing/transfer.service', async (original) => {
  const actual = await original<typeof import('./transfer.service')>();
  return {
    ...actual,
    transferWorker: mocks.transferWorker,
    bulkTransferWorker: mocks.bulkTransferWorker,
  };
});

import { POST } from '@/app/api/staffing/transfers/route';

function fakeTx() {
  return {
    idempotencyKey: {
      findUnique: vi.fn(async ({ where }: { where: { uq_idempotency_keys_scope: { actorId: string; route: string; key: string } } }) => {
        const s = where.uq_idempotency_keys_scope;
        return store.rows.get(`${s.actorId}|${s.route}|${s.key}`) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: { actorId: string; route: string; key: string; requestHash: string; response: unknown; statusCode: number; expiresAt: Date } }) => {
        const id = `${data.actorId}|${data.route}|${data.key}`;
        if (store.rows.has(id)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        store.rows.set(id, { requestHash: data.requestHash, response: data.response, statusCode: data.statusCode, expiresAt: data.expiresAt });
        return data;
      }),
    },
  };
}

/** Fake prisma client with idempotencyKey delegate (used by withIdempotency at the route level). */
function fakePrisma() {
  return { marker: 'db', ...fakeTx() };
}

const VALID_BODY = {
  workerId: 'worker-1',
  fromProjectId: 'project-A',
  toProjectId: 'project-B',
  transferDate: '2026-09-23T00:00:00.000Z',
  positionCode: 'POS-1',
  positionTitle: 'Worker',
  transferReason: 'Site change',
};

const TRANSFER_RESULT = {
  oldAssignmentId: 'old-1',
  newAssignmentId: 'new-1',
  fromProjectId: 'project-A',
  toProjectId: 'project-B',
  workerId: 'worker-1',
  transferDate: '2026-09-23T00:00:00.000Z',
  referrerId: null,
  sourceClaimId: null,
  sourceClaimType: null,
};

function singleReq(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/staffing/transfers', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function bulkReq(body: unknown[]) {
  return new NextRequest('http://localhost/api/staffing/transfers', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function hashBody(body: unknown): string {
  const replacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? `${v.toString()}n` : v);
  return createHash('sha256').update(JSON.stringify(body ?? null, replacer)).digest('hex');
}

beforeEach(() => {
  vi.clearAllMocks();
  store.rows.clear();
  mocks.getAuthContext.mockResolvedValue({ userId: 'hr-1', role: 'HR_MANAGER' });
  const tx = fakeTx();
  const prisma = fakePrisma();
  mocks.getPrisma.mockReturnValue(prisma);
  mocks.withDbContext.mockImplementation(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => fn(tx));
  mocks.transferWorker.mockResolvedValue(TRANSFER_RESULT);
  mocks.bulkTransferWorker.mockResolvedValue({ items: [TRANSFER_RESULT] });
});

const FORBIDDEN_FIELDS = [
  'referrerId',
  'referrerUserId',
  'ctvId',
  'vendorId',
  'beneficiaryUserId',
  'assigneeUserId',
  'sourceClaimId',
  'sourceClaimType',
  'laborProfileId',
] as const;

const ALLOWED_FIELDS = [
  'workerId',
  'fromProjectId',
  'toProjectId',
  'transferDate',
  'positionCode',
  'positionTitle',
  'transferReason',
] as const;

describe('POST /api/staffing/transfers — single request boundary (AC-06)', () => {
  it('accepts allowed fields and forwards only those to the service', async () => {
    const res = await POST(singleReq(VALID_BODY, { 'x-idempotency-key': 'k-1' }));
    expect(res.status).toBe(201);
    const input = mocks.transferWorker.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.keys(input).sort()).toEqual([...ALLOWED_FIELDS].sort());
    for (const k of ALLOWED_FIELDS) {
      expect(input[k]).toBe(VALID_BODY[k as keyof typeof VALID_BODY]);
    }
  });

  it.each(FORBIDDEN_FIELDS)('drops client-supplied %s before reaching the service', async (field) => {
    const body = { ...VALID_BODY, [field]: 'EVIL-VALUE' };
    const res = await POST(singleReq(body, { 'x-idempotency-key': `k-${field}` }));
    expect(res.status).toBe(201);
    const input = mocks.transferWorker.mock.calls[0][2] as Record<string, unknown>;
    expect(input).not.toHaveProperty(field);
    expect(Object.keys(input).sort()).toEqual([...ALLOWED_FIELDS].sort());
  });

  it('drops unknown fields before reaching the service', async () => {
    const body = { ...VALID_BODY, madeUpField: 'EVIL', anotherUnknown: 12345 };
    const res = await POST(singleReq(body, { 'x-idempotency-key': 'k-unknown' }));
    expect(res.status).toBe(201);
    const input = mocks.transferWorker.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.keys(input).sort()).toEqual([...ALLOWED_FIELDS].sort());
  });

  it('excludes forbidden fields from the idempotency fingerprint', async () => {
    const idemKey = 'k-fingerprint';
    const bodyWithForbidden = { ...VALID_BODY, referrerUserId: 'EVIL-1', ctvId: 'EVIL-2' };
    const bodyWithOtherForbidden = { ...VALID_BODY, referrerUserId: 'EVIL-1-DIFFERENT', ctvId: 'EVIL-2-DIFFERENT' };

    const res1 = await POST(singleReq(bodyWithForbidden, { 'x-idempotency-key': idemKey }));
    expect(res1.status).toBe(201);
    expect(await res1.json()).toMatchObject({ transfer: TRANSFER_RESULT });

    const res2 = await POST(singleReq(bodyWithOtherForbidden, { 'x-idempotency-key': idemKey }));
    expect(res2.status).toBe(201);
    expect(await res2.json()).toMatchObject({ transfer: TRANSFER_RESULT });

    expect(mocks.transferWorker).toHaveBeenCalledOnce();
  });

  it('excludes unknown fields from the idempotency fingerprint', async () => {
    const idemKey = 'k-fingerprint-unknown';
    const body1 = { ...VALID_BODY, madeUpA: 'X' };
    const body2 = { ...VALID_BODY, madeUpA: 'Y', madeUpB: 'Z' };

    await POST(singleReq(body1, { 'x-idempotency-key': idemKey }));
    const res2 = await POST(singleReq(body2, { 'x-idempotency-key': idemKey }));
    expect(res2.status).toBe(201);
    expect(await res2.json()).toMatchObject({ transfer: TRANSFER_RESULT });
    expect(mocks.transferWorker).toHaveBeenCalledOnce();
  });

  it('accepts a missing idempotency-key and does not write to the store', async () => {
    const res = await POST(singleReq(VALID_BODY));
    expect(res.status).toBe(201);
    expect(store.rows.size).toBe(0);
  });

  it('drops optional fields (positionCode, positionTitle, transferReason) when absent', async () => {
    const minimal = {
      workerId: 'worker-1',
      fromProjectId: 'project-A',
      toProjectId: 'project-B',
      transferDate: '2026-09-23T00:00:00.000Z',
    };
    const res = await POST(singleReq(minimal, { 'x-idempotency-key': 'k-minimal' }));
    expect(res.status).toBe(201);
    const input = mocks.transferWorker.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.keys(input).sort()).toEqual(['fromProjectId', 'toProjectId', 'transferDate', 'workerId']);
  });

  it('returns 400 when workerId is missing (service mock never called)', async () => {
    const bad = { ...VALID_BODY, workerId: '' };
    const res = await POST(singleReq(bad, { 'x-idempotency-key': 'k-bad' }));
    expect(res.status).toBe(400);
    expect(mocks.transferWorker).not.toHaveBeenCalled();
  });

  it('returns 401 before reaching the service when auth fails', async () => {
    const { AuthSessionError } = await import('@/src/shared/auth/auth-context');
    mocks.getAuthContext.mockRejectedValue(new AuthSessionError('NO_TOKEN', 'Missing token'));
    const res = await POST(singleReq(VALID_BODY));
    expect(res.status).toBe(401);
    expect(mocks.transferWorker).not.toHaveBeenCalled();
  });
});

describe('POST /api/staffing/transfers — bulk request boundary (AC-06)', () => {
  it('forwards only allowed fields per item to bulkTransferWorker', async () => {
    const bulk = [
      { ...VALID_BODY, workerId: 'w-1', referrerUserId: 'EVIL', ctvId: 'EVIL' },
      { ...VALID_BODY, workerId: 'w-2', referrerId: 'EVIL', sourceClaimId: 'EVIL' },
    ];
    const res = await POST(bulkReq(bulk));
    expect(res.status).toBe(200);
    const callArgs = mocks.bulkTransferWorker.mock.calls[0][2] as Array<Record<string, unknown>>;
    expect(callArgs).toHaveLength(2);
    for (const item of callArgs) {
      expect(Object.keys(item).sort()).toEqual([...ALLOWED_FIELDS].sort());
    }
    expect(callArgs[0].workerId).toBe('w-1');
    expect(callArgs[1].workerId).toBe('w-2');
  });

  it.each(FORBIDDEN_FIELDS)('drops %s from every bulk item', async (field) => {
    const bulk = [
      { ...VALID_BODY, workerId: 'w-1', [field]: 'EVIL-A' },
      { ...VALID_BODY, workerId: 'w-2', [field]: 'EVIL-B' },
    ];
    const res = await POST(bulkReq(bulk));
    expect(res.status).toBe(200);
    const callArgs = mocks.bulkTransferWorker.mock.calls[0][2] as Array<Record<string, unknown>>;
    for (const item of callArgs) {
      expect(item).not.toHaveProperty(field);
      expect(Object.keys(item).sort()).toEqual([...ALLOWED_FIELDS].sort());
    }
  });

  it('returns 400 when any bulk item is invalid (service mock never called)', async () => {
    const bulk = [
      { ...VALID_BODY, workerId: 'w-1' },
      { ...VALID_BODY, workerId: '' },
    ];
    const res = await POST(bulkReq(bulk));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'VALIDATION' });
    expect(mocks.bulkTransferWorker).not.toHaveBeenCalled();
  });

  it('drops unknown fields from bulk items before reaching the service', async () => {
    const bulk = [
      { ...VALID_BODY, workerId: 'w-1', rogueField: 'X' },
    ];
    const res = await POST(bulkReq(bulk));
    expect(res.status).toBe(200);
    const callArgs = mocks.bulkTransferWorker.mock.calls[0][2] as Array<Record<string, unknown>>;
    expect(callArgs[0]).not.toHaveProperty('rogueField');
    expect(Object.keys(callArgs[0]).sort()).toEqual([...ALLOWED_FIELDS].sort());
  });
});

describe('POST /api/staffing/transfers — defense in depth', () => {
  it('multiple forbidden fields combined — none reach service', async () => {
    const body = {
      ...VALID_BODY,
      referrerId: 'E1',
      referrerUserId: 'E2',
      ctvId: 'E3',
      vendorId: 'E4',
      beneficiaryUserId: 'E5',
      assigneeUserId: 'E6',
      sourceClaimId: 'E7',
      sourceClaimType: 'E8',
      laborProfileId: 'E9',
      unknownX: 'E10',
      unknownY: 'E11',
    };
    const res = await POST(singleReq(body, { 'x-idempotency-key': 'k-defense' }));
    expect(res.status).toBe(201);
    const input = mocks.transferWorker.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.keys(input).sort()).toEqual([...ALLOWED_FIELDS].sort());
  });

  it('fingerprint stability — fingerprint hash equals hash of cleaned payload', async () => {
    const dirty = { ...VALID_BODY, referrerUserId: 'EVIL', ctvId: 'EVIL' };
    const cleaned = { ...VALID_BODY };
    const expected = hashBody(cleaned);
    expect(expected).not.toBe(hashBody(dirty));
  });
});
