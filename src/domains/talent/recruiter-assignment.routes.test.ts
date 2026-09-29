/**
 * recruiter-assignment.routes.test.ts — P1-A0.4 (F-08) route-level unit tests.
 *
 * Lane: unit (no DB). The service layer is mocked so the route layer alone is
 * exercised end-to-end (auth, role gate, idempotency, validation, status codes,
 * safe error envelopes).
 *
 * Covers three canonical routes:
 *   1. POST /api/admin/staffing/orders/[orderId]/recruiters
 *      (assignRecruiterToOrder)
 *   2. POST /api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke
 *      (revokeRecruiterFromOrder)
 *   3. POST /api/admin/applications/[submissionId]/claim
 *      (claimCandidateSubmission)
 *
 * AC mapping (F-08 contract):
 *   - auth-first behavior (no auth → 401)
 *   - role gate (HR_STAFF on assign/revoke → 403; ADMIN/HR_MANAGER on claim → 403)
 *   - UUID v4 idempotency header required (missing → 400)
 *   - cross-order revoke mismatch (assignmentId belongs to another order)
 *     → privacy-safe 404 with zero mutation
 *   - claim race loser → stable 409 HANDLING_ALREADY_CLAIMED
 *   - safe error envelopes: no raw stack / no PII (phone, CCCD, name) in body
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/src/lib/db', () => ({
  getPrisma: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  AuthSessionError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'AuthSessionError';
      this.code = code;
    }
  },
  getAuthContext: vi.fn(),
}));

vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: vi.fn(),
}));

vi.mock('@/src/shared/integrity/idempotency', () => ({
  IdempotencyConflictError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'IdempotencyConflictError';
    }
  },
  withIdempotency: vi.fn(async ({ handler }: { handler: () => Promise<{ body: unknown; statusCode: number }> }) => {
    const out = await handler();
    return { body: out.body, replayed: false, statusCode: out.statusCode };
  }),
}));

vi.mock('@/src/domains/talent/recruiter-assignment.service', () => {
  class RecruiterAssignmentError extends Error {
    code: string;
    httpStatus: number;
    details?: Record<string, unknown>;
    constructor(code: string, message: string, httpStatus: number, details?: Record<string, unknown>) {
      super(message);
      this.name = 'RecruiterAssignmentError';
      this.code = code;
      this.httpStatus = httpStatus;
      this.details = details;
    }
  }
  return {
    RecruiterAssignmentError,
    assignRecruiterToOrder: vi.fn(),
    revokeRecruiterFromOrder: vi.fn(),
    claimCandidateSubmission: vi.fn(),
    listOrderRecruiterAssignments: vi.fn(),
    listMyClaimedCandidates: vi.fn(),
    listMaskedUnclaimedCandidatesForOrder: vi.fn(),
  };
});

// Import AFTER mocks.
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  assignRecruiterToOrder,
  revokeRecruiterFromOrder,
  claimCandidateSubmission,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';

import { POST as POST_ASSIGN } from '@/app/api/admin/staffing/orders/[orderId]/recruiters/route';
import { POST as POST_REVOKE } from '@/app/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke/route';
import { POST as POST_CLAIM } from '@/app/api/admin/applications/[submissionId]/claim/route';

const ORDER_X = '11111111-1111-4111-8111-111111111111';
const ORDER_Y = '22222222-2222-4222-8222-222222222222';
const RECRUITER = '33333333-3333-4333-8333-333333333333';
const ASSIGNMENT_ON_Y = '44444444-4444-4444-8444-444444444444';
const SUBMISSION = '55555555-5555-4555-8555-555555555555';
const IDEMPOTENCY = '66666666-6666-4666-8666-666666666666';
const OTHER_IDEMPOTENCY = '77777777-7777-4777-8777-777777777777';

function paramsPromise<T extends Record<string, string>>(obj: T): Promise<T> {
  return Promise.resolve(obj);
}

function makeReq(url: string, init: { method?: string; body?: unknown; idempotency?: string; token?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (init.idempotency) headers['idempotency-key'] = init.idempotency;
  if (init.token) headers['authorization'] = `Bearer ${init.token}`;
  return new NextRequest(url, {
    method: init.method ?? 'POST',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

describe('P1-A0.4 F-08 route layer — assign / revoke / claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // withDbContext just calls fn(tx) so route handlers execute their inner code.
    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, fn) => fn({} as any));
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 1. POST /api/admin/staffing/orders/[orderId]/recruiters
  // ═══════════════════════════════════════════════════════════════════════
  describe('POST .../staffing/orders/[orderId]/recruiters (assign)', () => {
    it('returns 401 when auth context is missing (auth-first)', async () => {
      vi.mocked(getAuthContext).mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'no session'));
      const req = makeReq(`http://x/api/admin/staffing/orders/${ORDER_X}/recruiters`, {
        body: { recruiterUserId: RECRUITER },
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_ASSIGN(req, { params: paramsPromise({ orderId: ORDER_X }) });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'NO_TOKEN', message: 'no session' });
      expect(assignRecruiterToOrder).not.toHaveBeenCalled();
    });

    it('returns 403 when actor is HR_STAFF (role gate)', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: RECRUITER, role: 'HR_STAFF' } as any);
      const req = makeReq(`http://x/api/admin/staffing/orders/${ORDER_X}/recruiters`, {
        body: { recruiterUserId: RECRUITER },
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_ASSIGN(req, { params: paramsPromise({ orderId: ORDER_X }) });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('ROLE_NOT_PERMITTED');
      // Must NOT leak the order id or user id in the role gate error message body.
      expect(JSON.stringify(body)).not.toContain(ORDER_X);
      expect(JSON.stringify(body)).not.toContain(RECRUITER);
      expect(assignRecruiterToOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when Idempotency-Key header is missing', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'admin1', role: 'ADMIN' } as any);
      const req = makeReq(`http://x/api/admin/staffing/orders/${ORDER_X}/recruiters`, {
        body: { recruiterUserId: RECRUITER },
      });
      const res = await POST_ASSIGN(req, { params: paramsPromise({ orderId: ORDER_X }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('IDEMPOTENCY_KEY_REQUIRED');
      expect(assignRecruiterToOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when Idempotency-Key is not UUID v4', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'admin1', role: 'ADMIN' } as any);
      const req = makeReq(`http://x/api/admin/staffing/orders/${ORDER_X}/recruiters`, {
        body: { recruiterUserId: RECRUITER },
        idempotency: 'not-a-uuid',
      });
      const res = await POST_ASSIGN(req, { params: paramsPromise({ orderId: ORDER_X }) });
      expect(res.status).toBe(400);
      expect(assignRecruiterToOrder).not.toHaveBeenCalled();
    });

    it('returns 201 on success with ADMIN role and passes through service result', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'admin1', role: 'ADMIN' } as any);
      vi.mocked(assignRecruiterToOrder).mockResolvedValueOnce({
        id: 'a-1',
        staffingOrderId: ORDER_X,
        recruiterUserId: RECRUITER,
        assignedByUserId: 'admin1',
        source: 'HR_MANAGER_ASSIGN',
        status: 'ACTIVE',
        assignedAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      } as any);
      const req = makeReq(`http://x/api/admin/staffing/orders/${ORDER_X}/recruiters`, {
        body: { recruiterUserId: RECRUITER },
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_ASSIGN(req, { params: paramsPromise({ orderId: ORDER_X }) });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.replayed).toBe(false);
      expect(body.assignment.id).toBe('a-1');
      expect(assignRecruiterToOrder).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          staffingOrderId: ORDER_X,
          recruiterUserId: RECRUITER,
          actorRole: 'ADMIN',
          actorId: 'admin1',
        }),
      );
    });

    it('returns 200 on HR_MANAGER idempotent replay (existing ACTIVE row)', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'mgr1', role: 'HR_MANAGER' } as any);
      vi.mocked(assignRecruiterToOrder).mockResolvedValueOnce({
        id: 'a-2',
        staffingOrderId: ORDER_X,
        recruiterUserId: RECRUITER,
        assignedByUserId: 'mgr1',
        source: 'HR_MANAGER_ASSIGN',
        status: 'ACTIVE',
        assignedAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      } as any);
      const req = makeReq(`http://x/api/admin/staffing/orders/${ORDER_X}/recruiters`, {
        body: { recruiterUserId: RECRUITER },
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_ASSIGN(req, { params: paramsPromise({ orderId: ORDER_X }) });
      expect(res.status).toBe(201);
      expect(assignRecruiterToOrder).toHaveBeenCalledTimes(1);
    });

    it('returns 404 with safe envelope when service throws STAFFING_ORDER_NOT_FOUND', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'admin1', role: 'ADMIN' } as any);
      vi.mocked(assignRecruiterToOrder).mockRejectedValueOnce(
        new RecruiterAssignmentError('STAFFING_ORDER_NOT_FOUND', `StaffingOrder ${ORDER_X} not found`, 404),
      );
      const req = makeReq(`http://x/api/admin/staffing/orders/${ORDER_X}/recruiters`, {
        body: { recruiterUserId: RECRUITER },
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_ASSIGN(req, { params: paramsPromise({ orderId: ORDER_X }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('STAFFING_ORDER_NOT_FOUND');
      // Safe envelope: must not echo raw PII back.
      expect(JSON.stringify(body)).not.toContain('phone');
      expect(JSON.stringify(body)).not.toContain('cccd');
    });

    it('returns 400 INVALID_INPUT when body lacks recruiterUserId', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'admin1', role: 'ADMIN' } as any);
      const req = makeReq(`http://x/api/admin/staffing/orders/${ORDER_X}/recruiters`, {
        body: {},
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_ASSIGN(req, { params: paramsPromise({ orderId: ORDER_X }) });
      expect(res.status).toBe(400);
      expect(assignRecruiterToOrder).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. POST /api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke
  // ═══════════════════════════════════════════════════════════════════════
  describe('POST .../recruiters/[assignmentId]/revoke (revoke)', () => {
    it('returns 401 when auth context is missing (auth-first)', async () => {
      vi.mocked(getAuthContext).mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'no session'));
      const req = makeReq(
        `http://x/api/admin/staffing/orders/${ORDER_X}/recruiters/${ASSIGNMENT_ON_Y}/revoke`,
        { body: { reason: 'duplicate' }, idempotency: IDEMPOTENCY },
      );
      const res = await POST_REVOKE(req, {
        params: paramsPromise({ orderId: ORDER_X, assignmentId: ASSIGNMENT_ON_Y }),
      });
      expect(res.status).toBe(401);
      expect(revokeRecruiterFromOrder).not.toHaveBeenCalled();
    });

    it('returns 403 when actor is HR_STAFF (role gate)', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: RECRUITER, role: 'HR_STAFF' } as any);
      const req = makeReq(
        `http://x/api/admin/staffing/orders/${ORDER_X}/recruiters/${ASSIGNMENT_ON_Y}/revoke`,
        { body: { reason: 'duplicate' }, idempotency: IDEMPOTENCY },
      );
      const res = await POST_REVOKE(req, {
        params: paramsPromise({ orderId: ORDER_X, assignmentId: ASSIGNMENT_ON_Y }),
      });
      expect(res.status).toBe(403);
      expect(revokeRecruiterFromOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when reason is missing', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'admin1', role: 'ADMIN' } as any);
      const req = makeReq(
        `http://x/api/admin/staffing/orders/${ORDER_X}/recruiters/${ASSIGNMENT_ON_Y}/revoke`,
        { body: {}, idempotency: IDEMPOTENCY },
      );
      const res = await POST_REVOKE(req, {
        params: paramsPromise({ orderId: ORDER_X, assignmentId: ASSIGNMENT_ON_Y }),
      });
      expect(res.status).toBe(400);
      expect(revokeRecruiterFromOrder).not.toHaveBeenCalled();
    });

    it('returns 404 privacy-safe envelope on cross-order mismatch (F-01)', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'admin1', role: 'ADMIN' } as any);
      // Service guards the binding and throws NO_ACTIVE_ASSIGNMENT for cross-order mismatch.
      vi.mocked(revokeRecruiterFromOrder).mockImplementationOnce(async (_tx, input: any) => {
        expect(input.staffingOrderId).toBe(ORDER_X);
        expect(input.assignmentId).toBe(ASSIGNMENT_ON_Y);
        throw new RecruiterAssignmentError(
          'NO_ACTIVE_ASSIGNMENT',
          `Assignment ${input.assignmentId} is not on order ${input.staffingOrderId}`,
          404,
        );
      });
      const req = makeReq(
        `http://x/api/admin/staffing/orders/${ORDER_X}/recruiters/${ASSIGNMENT_ON_Y}/revoke`,
        { body: { reason: 'duplicate' }, idempotency: IDEMPOTENCY },
      );
      const res = await POST_REVOKE(req, {
        params: paramsPromise({ orderId: ORDER_X, assignmentId: ASSIGNMENT_ON_Y }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('NO_ACTIVE_ASSIGNMENT');
      // Safe envelope: must NOT leak the actual parent order id.
      expect(JSON.stringify(body)).not.toContain(ORDER_Y);
      expect(JSON.stringify(body)).not.toContain('phone');
      expect(JSON.stringify(body)).not.toContain('cccd');
    });

    it('returns 200 on successful revoke', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'mgr1', role: 'HR_MANAGER' } as any);
      vi.mocked(revokeRecruiterFromOrder).mockResolvedValueOnce({
        id: ASSIGNMENT_ON_Y,
        staffingOrderId: ORDER_X,
        recruiterUserId: RECRUITER,
        assignedByUserId: 'mgr1',
        source: 'HR_MANAGER_ASSIGN',
        status: 'REVOKED',
        assignedAt: new Date(),
        revokedAt: new Date(),
        createdAt: new Date(),
      } as any);
      const req = makeReq(
        `http://x/api/admin/staffing/orders/${ORDER_X}/recruiters/${ASSIGNMENT_ON_Y}/revoke`,
        { body: { reason: 'duplicate' }, idempotency: IDEMPOTENCY },
      );
      const res = await POST_REVOKE(req, {
        params: paramsPromise({ orderId: ORDER_X, assignmentId: ASSIGNMENT_ON_Y }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.assignment.status).toBe('REVOKED');
      // Route MUST pass both staffingOrderId (URL-derived) and assignmentId to the service.
      expect(revokeRecruiterFromOrder).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          staffingOrderId: ORDER_X,
          assignmentId: ASSIGNMENT_ON_Y,
          actorRole: 'HR_MANAGER',
          actorId: 'mgr1',
          reason: 'duplicate',
        }),
      );
    });

    it('returns 409 on Idempotency-Key reuse with conflicting body (safe envelope)', async () => {
      vi.mocked(getAuthContext).mockResolvedValueOnce({ userId: 'admin1', role: 'ADMIN' } as any);
      // Override the withIdempotency mock to throw IdempotencyConflictError for this test.
      const idempotencyMod = await import('@/src/shared/integrity/idempotency');
      const { IdempotencyConflictError } = idempotencyMod as any;
      vi.mocked(idempotencyMod.withIdempotency).mockImplementationOnce(async () => {
        throw new IdempotencyConflictError('key reused with different payload');
      });
      const req = makeReq(
        `http://x/api/admin/staffing/orders/${ORDER_X}/recruiters/${ASSIGNMENT_ON_Y}/revoke`,
        { body: { reason: 'duplicate' }, idempotency: OTHER_IDEMPOTENCY },
      );
      const res = await POST_REVOKE(req, {
        params: paramsPromise({ orderId: ORDER_X, assignmentId: ASSIGNMENT_ON_Y }),
      });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('IDEMPOTENCY_CONFLICT');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. POST /api/admin/applications/[submissionId]/claim
  // ═══════════════════════════════════════════════════════════════════════
  describe('POST .../applications/[submissionId]/claim (claim)', () => {
    beforeEach(() => {
      vi.mocked(getAuthContext).mockReset();
    });

    it('returns 400 when submissionId is not UUID v4', async () => {
      vi.mocked(getAuthContext).mockResolvedValue({ userId: RECRUITER, role: 'HR_STAFF' } as any);
      const req = makeReq(`http://x/api/admin/applications/not-a-uuid/claim`, {
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_CLAIM(req, { params: paramsPromise({ submissionId: 'not-a-uuid' }) });
      expect(res.status).toBe(400);
      expect(claimCandidateSubmission).not.toHaveBeenCalled();
    });

    it('returns 401 when auth context is missing (auth-first)', async () => {
      vi.mocked(getAuthContext).mockRejectedValue(new AuthSessionError('NO_TOKEN', 'no session'));
      const req = makeReq(`http://x/api/admin/applications/${SUBMISSION}/claim`, {
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_CLAIM(req, { params: paramsPromise({ submissionId: SUBMISSION }) });
      expect(res.status).toBe(401);
      expect(claimCandidateSubmission).not.toHaveBeenCalled();
    });

    it('returns 403 when actor is ADMIN (role gate — only HR_STAFF may claim)', async () => {
      vi.mocked(getAuthContext).mockResolvedValue({ userId: 'admin1', role: 'ADMIN' } as any);
      const req = makeReq(`http://x/api/admin/applications/${SUBMISSION}/claim`, {
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_CLAIM(req, { params: paramsPromise({ submissionId: SUBMISSION }) });
      expect(res.status).toBe(403);
      expect(claimCandidateSubmission).not.toHaveBeenCalled();
    });

    it('returns 400 when Idempotency-Key is missing', async () => {
      vi.mocked(getAuthContext).mockResolvedValue({ userId: RECRUITER, role: 'HR_STAFF' } as any);
      const req = makeReq(`http://x/api/admin/applications/${SUBMISSION}/claim`, {});
      const res = await POST_CLAIM(req, { params: paramsPromise({ submissionId: SUBMISSION }) });
      expect(res.status).toBe(400);
      expect(claimCandidateSubmission).not.toHaveBeenCalled();
    });

    it('returns 201 on successful claim', async () => {
      vi.mocked(getAuthContext).mockResolvedValue({ userId: RECRUITER, role: 'HR_STAFF' } as any);
      vi.mocked(claimCandidateSubmission).mockResolvedValueOnce({
        handlingAssignmentId: 'ha-1',
        submissionId: SUBMISSION,
        staffingOrderId: ORDER_X,
        slotId: 'slot-1',
        laborProfileId: 'lp-1',
        assigneeUserId: RECRUITER,
        source: 'ORDER_RECRUITER_CLAIM',
        startsAt: new Date(),
        expiresAt: new Date(),
      } as any);
      const req = makeReq(`http://x/api/admin/applications/${SUBMISSION}/claim`, {
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_CLAIM(req, { params: paramsPromise({ submissionId: SUBMISSION }) });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.claim.source).toBe('ORDER_RECRUITER_CLAIM');
      expect(claimCandidateSubmission).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          submissionId: SUBMISSION,
          actorRole: 'HR_STAFF',
          actorId: RECRUITER,
        }),
      );
    });

    it('returns stable 409 HANDLING_ALREADY_CLAIMED when claim race is lost (F-08)', async () => {
      vi.mocked(getAuthContext).mockResolvedValue({ userId: RECRUITER, role: 'HR_STAFF' } as any);
      vi.mocked(claimCandidateSubmission).mockRejectedValueOnce(
        new RecruiterAssignmentError(
          'HANDLING_ALREADY_CLAIMED',
          'Another recruiter already holds an active handling assignment for this candidate',
          409,
          { submissionId: SUBMISSION },
        ),
      );
      const req = makeReq(`http://x/api/admin/applications/${SUBMISSION}/claim`, {
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_CLAIM(req, { params: paramsPromise({ submissionId: SUBMISSION }) });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('HANDLING_ALREADY_CLAIMED');
      // Safe envelope: must NOT leak the winner's user id.
      expect(JSON.stringify(body)).not.toContain(RECRUITER);
      expect(JSON.stringify(body)).not.toContain('phone');
      expect(JSON.stringify(body)).not.toContain('cccd');
    });

    it('returns 403 NO_ACTIVE_ORDER_ASSIGNMENT when claim actor is not assigned to derived order (safe envelope)', async () => {
      vi.mocked(getAuthContext).mockResolvedValue({ userId: RECRUITER, role: 'HR_STAFF' } as any);
      vi.mocked(claimCandidateSubmission).mockRejectedValueOnce(
        new RecruiterAssignmentError(
          'NO_ACTIVE_ORDER_ASSIGNMENT',
          `Actor ${RECRUITER} is not an ACTIVE recruiter for StaffingOrder ${ORDER_X}`,
          403,
        ),
      );
      const req = makeReq(`http://x/api/admin/applications/${SUBMISSION}/claim`, {
        idempotency: IDEMPOTENCY,
      });
      const res = await POST_CLAIM(req, { params: paramsPromise({ submissionId: SUBMISSION }) });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('NO_ACTIVE_ORDER_ASSIGNMENT');
      expect(JSON.stringify(body)).not.toContain('phone');
    });
  });
});
