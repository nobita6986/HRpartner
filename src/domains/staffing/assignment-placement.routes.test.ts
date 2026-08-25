/**
 * Assignment placement route tests — MP-3C STEP-03/04 (RQ-02/03/07; AC-06, AC-07).
 *
 * The real `withIdempotency` runs against a stateful fake transaction client, so
 * replay and payload-mismatch behaviour is exercised for real (no database). Auth,
 * the DEC-04 role gate, the pre-lock permission resolution and error mapping are
 * asserted directly on the route handlers.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const store = { rows: new Map<string, { requestHash: string; response: unknown; statusCode: number; expiresAt: Date }>() };

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(() => ({ marker: 'db' })),
  withDbContext: vi.fn(),
  resolvePerms: vi.fn(),
  preview: vi.fn(),
  activate: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/auth-context', async (original) => {
  const actual = await original<typeof import('@/src/shared/auth/auth-context')>();
  return { ...actual, getAuthContext: mocks.getAuthContext };
});
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
vi.mock('@/src/shared/auth/permission-resolver', () => ({ resolveEffectivePermissions: mocks.resolvePerms }));
vi.mock('@/src/domains/staffing/assignment-placement.service', async (original) => {
  const actual = await original<typeof import('./assignment-placement.service')>();
  return { ...actual, previewPlacement: mocks.preview, activatePlacement: mocks.activate };
});

import { AuthSessionError } from '@/src/shared/auth/auth-context';
import { PlacementError } from './assignment-placement.service';
import { POST as PREVIEW } from '@/app/api/admin/assignments/preview/route';
import { POST as ACTIVATE } from '@/app/api/admin/assignments/route';

/** Fake tx that only needs the idempotencyKey delegate used by withIdempotency. */
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

const BODY = {
  submissionId: 'sub-1',
  employeeCode: 'PRJ1-001',
  employmentType: 'OUTSOURCED',
  validFrom: '2026-08-25T00:00:00.000Z',
  reason: 'Placement approved',
};
const RESULT = {
  assignmentId: 'assign-1', status: 'ACTIVE', submissionId: 'sub-1', workerId: 'worker-1',
  slotId: 'slot-1', staffingOrderId: 'order-1', projectId: 'project-1', employeeCode: 'PRJ1-001',
  counters: { slotsFilled: 1, slotsNeeded: 2, projectFilled: 1, projectQuota: 5 }, overrideApplied: false,
};

function activateReq(body: unknown, headers: Record<string, string> = { 'idempotency-key': 'key-1' }) {
  return new NextRequest('http://localhost/api/admin/assignments', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers },
  });
}
function previewReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/assignments/preview', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  store.rows.clear();
  mocks.getAuthContext.mockResolvedValue({ userId: 'hr-1', role: 'HR_MANAGER' });
  mocks.withDbContext.mockImplementation(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx()));
  mocks.resolvePerms.mockResolvedValue(new Set<string>());
  mocks.preview.mockResolvedValue({ canActivate: true, conflicts: [], submissionId: 'sub-1' });
  mocks.activate.mockResolvedValue(RESULT);
});

describe('POST /api/admin/assignments/preview', () => {
  it('returns the projection for an authorised caller', async () => {
    const res = await PREVIEW(previewReq(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ preview: { canActivate: true } });
    expect(mocks.withDbContext).toHaveBeenCalledOnce();
  });

  it('derives only whitelisted attributes and drops client-supplied canonical IDs (DEC-01)', async () => {
    await PREVIEW(previewReq({ ...BODY, workerId: 'evil', slotId: 'evil', projectId: 'evil', staffingOrderId: 'evil' }));
    const forwarded = mocks.preview.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.keys(forwarded).sort()).toEqual(
      ['employeeCode', 'employmentType', 'submissionId', 'validFrom', 'validTo', 'workSetting'],
    );
  });

  it('returns 401 before opening a DB context', async () => {
    mocks.getAuthContext.mockRejectedValue(new AuthSessionError('NO_TOKEN', 'Missing token'));
    const res = await PREVIEW(previewReq(BODY));
    expect(res.status).toBe(401);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('rejects a malformed body with 400', async () => {
    const req = new NextRequest('http://localhost/api/admin/assignments/preview', {
      method: 'POST', body: 'not-json', headers: { 'content-type': 'application/json' },
    });
    const res = await PREVIEW(req);
    expect(res.status).toBe(400);
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it('maps a service FORBIDDEN to 403 (DIRECTOR/SALE cannot preview)', async () => {
    mocks.preview.mockRejectedValue(new PlacementError('FORBIDDEN', 403, 'Role DIRECTOR cannot preview or activate assignments'));
    const res = await PREVIEW(previewReq(BODY));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'FORBIDDEN' });
  });

  it('passes conflict details through unchanged', async () => {
    mocks.preview.mockRejectedValue(new PlacementError('NOT_FOUND', 404, 'Application not found', { submissionId: 'sub-x' }));
    const res = await PREVIEW(previewReq(BODY));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'NOT_FOUND', details: { submissionId: 'sub-x' } });
  });
});

describe('POST /api/admin/assignments — auth and role boundary (AC-07)', () => {
  it('returns 401 before the role gate and before any DB work', async () => {
    mocks.getAuthContext.mockRejectedValue(new AuthSessionError('INVALID_TOKEN', 'bad'));
    const res = await ACTIVATE(activateReq(BODY));
    expect(res.status).toBe(401);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
    expect(mocks.activate).not.toHaveBeenCalled();
  });

  it.each(['DIRECTOR', 'SALE', 'HR_STAFF', 'PM', 'VENDOR_ADMIN', 'CTV', 'WORKER'])(
    'returns 403 for %s without reading the body or the DB', async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u-1', role });
      const res = await ACTIVATE(activateReq(BODY));
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ error: 'FORBIDDEN' });
      expect(mocks.withDbContext).not.toHaveBeenCalled();
    },
  );

  it.each(['ADMIN', 'HR_MANAGER'])('allows %s', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-1', role });
    const res = await ACTIVATE(activateReq(BODY));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/admin/assignments — idempotency (DEC-08 / AC-06)', () => {
  it('rejects a missing Idempotency-Key with 400 IDEMPOTENCY_REQUIRED', async () => {
    const res = await ACTIVATE(activateReq(BODY, {}));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'IDEMPOTENCY_REQUIRED' });
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('accepts the legacy x-idempotency-key header', async () => {
    const res = await ACTIVATE(activateReq(BODY, { 'x-idempotency-key': 'legacy-1' }));
    expect(res.status).toBe(200);
  });

  it('returns the assignment with replayed=false on first use', async () => {
    const res = await ACTIVATE(activateReq(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ assignment: RESULT, replayed: false });
    expect(mocks.activate).toHaveBeenCalledOnce();
  });

  it('replays the same key+payload without re-running the command', async () => {
    await ACTIVATE(activateReq(BODY));
    const res = await ACTIVATE(activateReq(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ assignment: RESULT, replayed: true });
    expect(mocks.activate).toHaveBeenCalledOnce();
  });

  it('is insensitive to JSON key order when hashing the payload', async () => {
    await ACTIVATE(activateReq(BODY));
    const reordered = { reason: BODY.reason, validFrom: BODY.validFrom, employmentType: BODY.employmentType, employeeCode: BODY.employeeCode, submissionId: BODY.submissionId };
    const res = await ACTIVATE(activateReq(reordered));
    expect(await res.json()).toMatchObject({ replayed: true });
    expect(mocks.activate).toHaveBeenCalledOnce();
  });

  it('returns 409 IDEMPOTENCY_CONFLICT for the same key with a different payload', async () => {
    await ACTIVATE(activateReq(BODY));
    const res = await ACTIVATE(activateReq({ ...BODY, employeeCode: 'PRJ1-002' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'IDEMPOTENCY_CONFLICT' });
    expect(mocks.activate).toHaveBeenCalledOnce();
  });

  it('does not burn the key when the command fails', async () => {
    mocks.activate.mockRejectedValueOnce(new PlacementError('SLOT_UNAVAILABLE', 409, 'Slot is full'));
    const failed = await ACTIVATE(activateReq(BODY));
    expect(failed.status).toBe(409);
    expect(store.rows.size).toBe(0);

    mocks.activate.mockResolvedValue(RESULT);
    const retry = await ACTIVATE(activateReq(BODY));
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({ replayed: false });
  });

  it('scopes the key per actor', async () => {
    await ACTIVATE(activateReq(BODY));
    mocks.getAuthContext.mockResolvedValue({ userId: 'admin-2', role: 'ADMIN' });
    const res = await ACTIVATE(activateReq(BODY));
    expect(await res.json()).toMatchObject({ replayed: false });
    expect(mocks.activate).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/admin/assignments — override and error mapping', () => {
  it('resolves CAN_OVERRIDE_REFERRAL_GUARD BEFORE opening the transaction (4.4)', async () => {
    const order: string[] = [];
    mocks.resolvePerms.mockImplementation(async () => { order.push('resolvePerms'); return new Set(['CAN_OVERRIDE_REFERRAL_GUARD']); });
    mocks.withDbContext.mockImplementation(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => { order.push('withDbContext'); return fn(fakeTx()); });

    const res = await ACTIVATE(activateReq({ ...BODY, override: { overrideCase: 'S1', reason: 'Approved by client' } }));
    expect(res.status).toBe(200);
    expect(order).toEqual(['resolvePerms', 'withDbContext']);
    const input = mocks.activate.mock.calls[0][2] as { hasOverridePermission: boolean; override: unknown };
    expect(input.hasOverridePermission).toBe(true);
    expect(input.override).toMatchObject({ overrideCase: 'S1', reason: 'Approved by client' });
  });

  it('returns 403 OVERRIDE_DENIED without touching the DB when the permission is missing', async () => {
    mocks.resolvePerms.mockResolvedValue(new Set<string>());
    const res = await ACTIVATE(activateReq({ ...BODY, override: { overrideCase: 'S1', reason: 'x' } }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'OVERRIDE_DENIED' });
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('does not resolve permissions when no override is requested', async () => {
    await ACTIVATE(activateReq(BODY));
    expect(mocks.resolvePerms).not.toHaveBeenCalled();
  });

  it('never forwards client-supplied canonical IDs to the service (DEC-01)', async () => {
    await ACTIVATE(activateReq({ ...BODY, workerId: 'evil', slotId: 'evil', projectId: 'evil', staffingOrderId: 'evil' }));
    const input = mocks.activate.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.keys(input).sort()).toEqual([
      'employeeCode', 'employmentType', 'hasOverridePermission', 'override',
      'reason', 'submissionId', 'validFrom', 'validTo', 'workSetting',
    ]);
  });

  it.each([
    ['ACTIVE_ASSIGNMENT_CONFLICT', 409],
    ['SLOT_UNAVAILABLE', 409],
    ['PROJECT_QUOTA_FULL', 409],
    ['EMPLOYEE_CODE_CONFLICT', 409],
    ['REFERRAL_GUARD_BLOCKED', 409],
    ['ASSIGNMENT_EXISTS', 409],
    ['CONVERSION_INVARIANT_BROKEN', 409],
    ['VALIDATION', 400],
    ['NOT_FOUND', 404],
  ] as const)('maps %s to HTTP %i with a stable code', async (code, status) => {
    mocks.activate.mockRejectedValue(new PlacementError(code, status, `${code} happened`, { hint: 1 }));
    const res = await ACTIVATE(activateReq(BODY));
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ error: code, details: { hint: 1 } });
  });

  it('maps an unexpected failure to 500 without leaking internals', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.activate.mockRejectedValue(new Error('connection reset by peer at 10.0.0.5'));
    const res = await ACTIVATE(activateReq(BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: 'INTERNAL', message: 'Failed to activate assignment' });
    spy.mockRestore();
  });
});
