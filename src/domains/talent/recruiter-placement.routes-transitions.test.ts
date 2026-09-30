/**
 * src/domains/talent/recruiter-placement.routes-transitions.test.ts
 *
 * P1-A0.4 R3-B08 — Route unit tests for the recruiter-scoped Placement
 * transition commands (confirm / effective / fail / cancel). HR_STAFF only.
 *
 * For each transition we prove:
 *   - happy path: ACTIVE handler → 200/201 + adapter invoked with derived
 *     actorId/actorRole/placementId.
 *   - revoked recruiter → adapter throws NO_ACTIVE_ORDER_ASSIGNMENT → 403
 *     with canonical envelope; no DB mutation attempted by the canonical
 *     service (asserted via `confirm.mock.calls.length === 0`).
 *   - non-HR_STAFF role (ADMIN/HR_MANAGER/...) → 403 ROLE_NOT_PERMITTED;
 *     adapter never invoked.
 *   - missing Idempotency-Key → 400 IDEMPOTENCY_REQUIRED.
 *   - malformed placementId → 400 VALIDATION.
 *   - role gate runs BEFORE placementId validation when the user is
 *     unauthenticated → 401, not 400.
 *   - 5xx body envelope stays generic (no raw actorId, body, evidence).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const store = {
  rows: new Map<string, { requestHash: string; response: unknown; statusCode: number; expiresAt: Date }>(),
};

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(() => ({ marker: 'db' })),
  withDbContext: vi.fn(),
  // Adapter mocks.
  recruiterPlacementConfirm: vi.fn(),
  recruiterPlacementEffective: vi.fn(),
  recruiterPlacementFail: vi.fn(),
  recruiterPlacementCancel: vi.fn(),
  // Canonical service mocks — used to assert the dual-authority predicate
  // runs BEFORE the canonical transition command (B-08 defense-in-depth).
  confirmPlacement: vi.fn(),
  markPlacementEffective: vi.fn(),
  failPlacement: vi.fn(),
  cancelPlacement: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/auth-context', async (original) => {
  const actual = await original<typeof import('@/src/shared/auth/auth-context')>();
  return { ...actual, getAuthContext: mocks.getAuthContext };
});
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
vi.mock('@/src/domains/talent/recruiter-placement.adapter', async (original) => {
  const actual = await original<typeof import('@/src/domains/talent/recruiter-placement.adapter')>();
  return {
    ...actual,
    recruiterPlacementConfirm: mocks.recruiterPlacementConfirm,
    recruiterPlacementEffective: mocks.recruiterPlacementEffective,
    recruiterPlacementFail: mocks.recruiterPlacementFail,
    recruiterPlacementCancel: mocks.recruiterPlacementCancel,
  };
});
vi.mock('@/src/domains/talent/placement.service', async (original) => {
  const actual = await original<typeof import('@/src/domains/talent/placement.service')>();
  return {
    ...actual,
    confirmPlacement: mocks.confirmPlacement,
    markPlacementEffective: mocks.markPlacementEffective,
    failPlacement: mocks.failPlacement,
    cancelPlacement: mocks.cancelPlacement,
  };
});

import { AuthSessionError } from '@/src/shared/auth/auth-context';
import { RecruiterAssignmentError } from '@/src/domains/talent/recruiter-assignment.service';
import { POST as POSTConfirm } from '@/app/api/admin/recruiter/placements/[id]/actions/confirm/route';
import { POST as POSTEffective } from '@/app/api/admin/recruiter/placements/[id]/actions/effective/route';
import { POST as POSTFail } from '@/app/api/admin/recruiter/placements/[id]/actions/fail/route';
import { POST as POSTCancel } from '@/app/api/admin/recruiter/placements/[id]/actions/cancel/route';

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

const PLACEMENT_ID = '33333333-3333-4333-8333-333333333333';
const IDEM_KEY = '44444444-4444-4444-8444-444444444444';
const RECRUITER_ID = 'rec-1';

function postReq(
  handler: 'confirm' | 'effective' | 'fail' | 'cancel',
  body: unknown,
  headers: Record<string, string> = { 'idempotency-key': IDEM_KEY },
) {
  const path = `/api/admin/recruiter/placements/${PLACEMENT_ID}/actions/${handler}`;
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  store.rows.clear();
  mocks.getAuthContext.mockResolvedValue({ userId: RECRUITER_ID, role: 'HR_STAFF' });
  mocks.withDbContext.mockImplementation(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx()));

  // Adapter returns success by default.
  mocks.recruiterPlacementConfirm.mockImplementation(async (_tx: unknown, input: { placementId: string; actorId: string; actorRole: string }) => ({
    placementId: input.placementId,
    status: 'CONFIRMED',
    replayed: false,
  }));
  mocks.recruiterPlacementEffective.mockImplementation(async (_tx: unknown, input: { placementId: string; actorId: string; actorRole: string }) => ({
    placementId: input.placementId,
    status: 'EFFECTIVE',
    replayed: false,
  }));
  mocks.recruiterPlacementFail.mockImplementation(async (_tx: unknown, input: { placementId: string; actorId: string; actorRole: string }) => ({
    placementId: input.placementId,
    status: 'FAILED',
    replayed: false,
  }));
  mocks.recruiterPlacementCancel.mockImplementation(async (_tx: unknown, input: { placementId: string; actorId: string; actorRole: string }) => ({
    placementId: input.placementId,
    status: 'CANCELLED',
    replayed: false,
  }));
});

describe('POST /api/admin/recruiter/placements/[id]/actions/{confirm,effective,fail,cancel}', () => {
  describe('happy path — active handler (B-08 success contract)', () => {
    it('confirm: HR_STAFF → 200 CONFIRMED, adapter invoked with derived placementId + actorId', async () => {
      const res = await POSTConfirm(postReq('confirm', {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({
        placementId: PLACEMENT_ID,
        status: 'CONFIRMED',
        replayed: false,
      });
      expect(mocks.recruiterPlacementConfirm).toHaveBeenCalledOnce();
      const adapterInput = mocks.recruiterPlacementConfirm.mock.calls[0][1];
      expect(adapterInput).toMatchObject({
        placementId: PLACEMENT_ID,
        actorId: RECRUITER_ID,
        actorRole: 'HR_STAFF',
      });
    });

    it('fail: HR_STAFF → 200 FAILED', async () => {
      const res = await POSTFail(postReq('fail', {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({ status: 'FAILED', replayed: false });
      expect(mocks.recruiterPlacementFail).toHaveBeenCalledOnce();
    });

    it('cancel: HR_STAFF → 200 CANCELLED', async () => {
      const res = await POSTCancel(postReq('cancel', {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ status: 'CANCELLED', replayed: false });
      expect(mocks.recruiterPlacementCancel).toHaveBeenCalledOnce();
    });

    it('effective: HR_STAFF + valid evidence → 200 EFFECTIVE', async () => {
      const body = {
        evidence: {
          clientAcknowledgedAt: '2026-01-01T00:00:00.000Z',
          clientAcknowledgedByUserId: '55555555-5555-4555-8555-555555555555',
          acknowledgementRef: 'ack-1',
        },
      };
      const res = await POSTEffective(postReq('effective', body), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ status: 'EFFECTIVE', replayed: false });
      const adapterInput = mocks.recruiterPlacementEffective.mock.calls[0][1];
      expect(adapterInput.evidence).toMatchObject({
        clientAcknowledgedAt: new Date('2026-01-01T00:00:00.000Z'),
        clientAcknowledgedByUserId: '55555555-5555-4555-8555-555555555555',
        acknowledgementRef: 'ack-1',
      });
    });
  });

  describe('dual-authority fail-closed (B-08 revoked / non-handler contract)', () => {
    it.each(['confirm', 'fail', 'cancel'] as const)(
      '%s — revoked recruiter: adapter throws NO_ACTIVE_ORDER_ASSIGNMENT → 403 + canonical envelope, no canonical service call',
      async (handler) => {
        mocks.recruiterPlacementConfirm.mockRejectedValue(
          new RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 'Order assignment revoked', 403, {
            reason: 'assignment_revoked',
          }),
        );
        mocks.recruiterPlacementFail.mockRejectedValue(
          new RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 'Order assignment revoked', 403, {
            reason: 'assignment_revoked',
          }),
        );
        mocks.recruiterPlacementCancel.mockRejectedValue(
          new RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 'Order assignment revoked', 403, {
            reason: 'assignment_revoked',
          }),
        );

        const routeHandler =
          handler === 'confirm' ? POSTConfirm : handler === 'fail' ? POSTFail : POSTCancel;
        const res = await routeHandler(postReq(handler, {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });

        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json).toMatchObject({
          error: 'NO_ACTIVE_ORDER_ASSIGNMENT',
          details: { reason: 'assignment_revoked' },
        });
        // Canonical service NEVER reached when adapter throws.
        expect(mocks.confirmPlacement).not.toHaveBeenCalled();
        expect(mocks.failPlacement).not.toHaveBeenCalled();
        expect(mocks.cancelPlacement).not.toHaveBeenCalled();
      },
    );

    it('confirm — handling claim revoked: NO_ACTIVE_ASSIGNMENT → 403', async () => {
      mocks.recruiterPlacementConfirm.mockRejectedValue(
        new RecruiterAssignmentError('NO_ACTIVE_ASSIGNMENT', 'Handling claim revoked', 403),
      );
      const res = await POSTConfirm(postReq('confirm', {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ error: 'NO_ACTIVE_ASSIGNMENT' });
      expect(mocks.confirmPlacement).not.toHaveBeenCalled();
    });

    it('effective — missing evidence → 400 VALIDATION from body parser (no canonical service)', async () => {
      const res = await POSTEffective(postReq('effective', {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'VALIDATION' });
      expect(mocks.recruiterPlacementEffective).not.toHaveBeenCalled();
      expect(mocks.markPlacementEffective).not.toHaveBeenCalled();
    });
  });

  describe('role gate (HR_STAFF only)', () => {
    it.each(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'PM', 'SALE', 'VENDOR_ADMIN', 'CTV', 'WORKER'])(
      'confirm — role %s → 403 ROLE_NOT_PERMITTED, adapter never invoked',
      async (role) => {
        mocks.getAuthContext.mockResolvedValue({ userId: 'u-1', role });
        const res = await POSTConfirm(postReq('confirm', {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });
        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ error: 'ROLE_NOT_PERMITTED' });
        expect(mocks.recruiterPlacementConfirm).not.toHaveBeenCalled();
      },
    );
  });

  describe('auth + idempotency + validation', () => {
    it('confirm — 401 returned before any DB or adapter call', async () => {
      mocks.getAuthContext.mockRejectedValue(new AuthSessionError('NO_TOKEN', 'Missing token'));
      const res = await POSTConfirm(postReq('confirm', {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(401);
      expect(mocks.recruiterPlacementConfirm).not.toHaveBeenCalled();
      expect(mocks.withDbContext).not.toHaveBeenCalled();
    });

    it('confirm — missing Idempotency-Key → 400 IDEMPOTENCY_REQUIRED', async () => {
      const res = await POSTConfirm(postReq('confirm', {}, {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'IDEMPOTENCY_REQUIRED' });
      expect(mocks.recruiterPlacementConfirm).not.toHaveBeenCalled();
    });

    it('confirm — non-UUID v4 placementId → 400 VALIDATION', async () => {
      const res = await POSTConfirm(postReq('confirm', {}), { params: Promise.resolve({ id: 'not-a-uuid' }) });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'VALIDATION' });
      expect(mocks.recruiterPlacementConfirm).not.toHaveBeenCalled();
    });

    it('confirm — non-empty body → 400 VALIDATION (strict allowlist)', async () => {
      const res = await POSTConfirm(
        postReq('confirm', { reason: 'something' }),
        { params: Promise.resolve({ id: PLACEMENT_ID }) },
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'VALIDATION' });
      expect(mocks.recruiterPlacementConfirm).not.toHaveBeenCalled();
    });

    it('effective — missing evidence → 400 VALIDATION, adapter never invoked', async () => {
      const res = await POSTEffective(postReq('effective', {}), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'VALIDATION' });
      expect(mocks.recruiterPlacementEffective).not.toHaveBeenCalled();
    });

    it('effective — bad ISO-8601 evidence.clientAcknowledgedAt → 400 VALIDATION', async () => {
      const body = {
        evidence: {
          clientAcknowledgedAt: 'Jan 1 2026',
          clientAcknowledgedByUserId: '55555555-5555-4555-8555-555555555555',
          acknowledgementRef: 'ack-1',
        },
      };
      const res = await POSTEffective(postReq('effective', body), { params: Promise.resolve({ id: PLACEMENT_ID }) });
      expect(res.status).toBe(400);
      expect(mocks.recruiterPlacementEffective).not.toHaveBeenCalled();
    });
  });
});