/**
 * route.test.ts — t1a-staffing-order-management / CORRECTION 1/1.
 *
 * Route-level tests cho `app/api/staffing/orders/[id]/route.ts` —
 * DELETE + PUT handlers. Service-direct testing đã có trong
 * `src/domains/staffing/order.service.test.ts`; route-level tests bổ
 * sung coverage cho:
 *
 *   - DELETE yêu cầu `x-idempotency-key` (400 nếu thiếu).
 *   - DELETE dùng `withIdempotency` đúng contract:
 *       + Same key + same payload → replay cùng response (200).
 *       + Same key + khác payload → 409 IDEMPOTENCY_CONFLICT.
 *       + Khác key + same payload → chạy handler (không replay).
 *   - PUT validation đầy đủ (hourlyRateVnd safe integer, dates, validTo
 *     ≥ validFrom) — payload sai trả 400, không rơi xuống 500.
 *
 * Mocks: `getPrisma`, `getAuthContext`, `withDbContext`, `withIdempotency`,
 * `deleteStaffingOrder`, `updateStaffingOrder`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  deleteStaffingOrder: vi.fn(),
  updateStaffingOrder: vi.fn(),
  // Idempotency helpers
  capturedRequestBody: null as unknown,
  capturedIdempotencyKey: '' as string,
  capturedRoute: '' as string,
  idempotencyReplay: false,
  // Simulate conflict raise on demand.
  raiseConflictOnThisCall: false,
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = 'AuthSessionError';
    }
  },
}));

vi.mock('@/src/lib/db', () => ({
  getPrisma: () => ({ __raw: true, $transaction: vi.fn() }),
}));

vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_prisma: unknown, _ctx: unknown, cb: (tx: unknown) => unknown) =>
    cb({ __tx: true }),
  AuthScopeError: class AuthScopeError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = 'AuthScopeError';
    }
  },
}));

vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: async (opts: {
    requestBody: unknown;
    key: string;
    route: string;
    handler: () => Promise<{ body: unknown; statusCode?: number }>;
  }) => {
    mocks.capturedRequestBody = opts.requestBody;
    mocks.capturedIdempotencyKey = opts.key;
    mocks.capturedRoute = opts.route;
    if (mocks.raiseConflictOnThisCall) {
      throw Object.assign(new Error('mocked conflict'), { name: 'IdempotencyConflictError' });
    }
    if (mocks.idempotencyReplay) {
      // Replay path: trả về response đã cache; KHÔNG chạy handler.
      return {
        body: { order: { id: 'order-1', deleted: true } },
        statusCode: 200,
        replayed: true,
      };
    }
    const result = await opts.handler();
    return {
      body: result.body,
      statusCode: result.statusCode ?? 200,
      replayed: false,
    };
  },
  IdempotencyConflictError: class IdempotencyConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'IdempotencyConflictError';
    }
  },
}));

vi.mock('@/src/domains/staffing/order.service', () => {
  class MockStaffingOrderServiceError extends Error {
    constructor(
      public readonly code:
        | 'NOT_FOUND'
        | 'ALREADY_EXISTS'
        | 'SLOT_FULL'
        | 'INVALID_STATUS'
        | 'PERMISSION_DENIED'
        | 'PROJECT_QUOTA_EXCEEDED'
        | 'ORDER_NOT_EDITABLE'
        | 'ORDER_NOT_DELETABLE'
        | 'SLOT_HAS_DEPENDENCIES'
        | 'INTERNAL',
      message: string,
    ) {
      super(message);
      this.name = 'StaffingOrderServiceError';
    }
  }
  return {
    deleteStaffingOrder: mocks.deleteStaffingOrder,
    updateStaffingOrder: mocks.updateStaffingOrder,
    getStaffingOrderDetail: vi.fn(),
    updateStaffingOrderStatus: vi.fn(),
    StaffingOrderServiceError: MockStaffingOrderServiceError,
  };
});

// Use the mocked class directly through require (route file chỉ re-export
// DELETE/PUT, không phải class). Tạo instance cùng constructor với class
// mà route dùng để instanceof check pass.
import * as orderServiceMock from '@/src/domains/staffing/order.service';
import { DELETE, PUT } from '@/app/api/staffing/orders/[id]/route';

const MockServiceError = orderServiceMock.StaffingOrderServiceError as new (
  code:
    | 'NOT_FOUND'
    | 'ALREADY_EXISTS'
    | 'SLOT_FULL'
    | 'INVALID_STATUS'
    | 'PERMISSION_DENIED'
    | 'PROJECT_QUOTA_EXCEEDED'
    | 'ORDER_NOT_EDITABLE'
    | 'ORDER_NOT_DELETABLE'
    | 'SLOT_HAS_DEPENDENCIES'
    | 'INTERNAL',
  message: string,
) => Error;

const ADMIN_CTX = { userId: 'admin-001', role: 'ADMIN', sessionId: 'sess-1' };
const HR_MANAGER_CTX = { userId: 'h1', role: 'HR_MANAGER', sessionId: 'sess-1' };

function buildDeleteRequest(id: string, idemKey?: string): NextRequest {
  const headers = new Headers();
  if (idemKey !== undefined) headers.set('x-idempotency-key', idemKey);
  return new NextRequest(`http://localhost/api/staffing/orders/${id}`, {
    method: 'DELETE',
    headers,
  });
}

function buildPutRequest(id: string, body: unknown, idemKey?: string): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (idemKey !== undefined) headers.set('x-idempotency-key', idemKey);
  return new NextRequest(`http://localhost/api/staffing/orders/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.capturedRequestBody = null;
  mocks.capturedIdempotencyKey = '';
  mocks.capturedRoute = '';
  mocks.idempotencyReplay = false;
  mocks.raiseConflictOnThisCall = false;
  mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
  mocks.deleteStaffingOrder.mockResolvedValue({ id: 'order-1', deleted: true });
  mocks.updateStaffingOrder.mockResolvedValue({ id: 'order-1', updated: true });
});

describe('CORRECTION 1/1 — DELETE /api/staffing/orders/[id] idempotency + auth', () => {
  it('403 khi role không phải ADMIN', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CTX);
    const res = await DELETE(buildDeleteRequest('order-1', 'idem-1'), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    expect(res.status).toBe(403);
    const body = await readJson<{ error: string }>(res);
    expect(body.error).toBe('PERMISSION_DENIED');
    expect(mocks.deleteStaffingOrder).not.toHaveBeenCalled();
  });

  it('400 khi thiếu x-idempotency-key (CORRECTION 1/1 idempotency-required-for-DELETE)', async () => {
    const res = await DELETE(buildDeleteRequest('order-1'), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    expect(res.status).toBe(400);
    const body = await readJson<{ error: string; message: string }>(res);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toMatch(/x-idempotency-key/);
    expect(mocks.deleteStaffingOrder).not.toHaveBeenCalled();
  });

  it('200 + idempotency route key khi ADMIN có key', async () => {
    const res = await DELETE(buildDeleteRequest('order-1', 'idem-aaa'), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    expect(res.status).toBe(200);
    expect(mocks.capturedRoute).toBe('DELETE:/api/staffing/orders/order-1');
    expect(mocks.capturedIdempotencyKey).toBe('idem-aaa');
    expect(mocks.deleteStaffingOrder).toHaveBeenCalledOnce();
    const body = await readJson<{ order: { id: string; deleted: boolean } }>(res);
    expect(body.order.deleted).toBe(true);
  });

  it('409 IDEMPOTENCY_CONFLICT khi same key + different payload', async () => {
    // First call: same key, different payload (simulate client dùng lại key
    // với payload khác — handler ở upstream sẽ raise conflict trước khi
    // chạy handler).
    mocks.raiseConflictOnThisCall = true;
    const res = await DELETE(buildDeleteRequest('order-1', 'idem-reused'), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    expect(res.status).toBe(409);
    const body = await readJson<{ error: string }>(res);
    expect(body.error).toBe('IDEMPOTENCY_CONFLICT');
    // Service KHÔNG được gọi — conflict phải short-circuit.
    expect(mocks.deleteStaffingOrder).not.toHaveBeenCalled();
  });

  it('replay trả về cùng response khi same key + same payload (không gọi service lần 2)', async () => {
    mocks.idempotencyReplay = true;
    const res = await DELETE(buildDeleteRequest('order-1', 'idem-replay'), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    expect(res.status).toBe(200);
    expect(mocks.deleteStaffingOrder).not.toHaveBeenCalled(); // replay = không chạy handler
  });

  it('404 khi service throw NOT_FOUND', async () => {
    mocks.deleteStaffingOrder.mockRejectedValue(
      new MockServiceError('NOT_FOUND', 'StaffingOrder order-1 not found'),
    );
    const res = await DELETE(buildDeleteRequest('order-1', 'idem-1'), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    expect(res.status).toBe(404);
  });

  it('409 ORDER_NOT_DELETABLE khi có dependencies', async () => {
    mocks.deleteStaffingOrder.mockRejectedValue(
      new MockServiceError(
        'ORDER_NOT_DELETABLE',
        'Nhu cầu đã phát sinh nghiệp vụ. Hãy dùng Hủy nhu cầu thay thế.',
      ),
    );
    const res = await DELETE(buildDeleteRequest('order-1', 'idem-1'), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    expect(res.status).toBe(409);
    const body = await readJson<{ error: string }>(res);
    expect(body.error).toBe('ORDER_NOT_DELETABLE');
  });

  it('500 khi service throw error không xác định (không phải StaffingOrderServiceError)', async () => {
    mocks.deleteStaffingOrder.mockRejectedValue(new Error('boom'));
    const res = await DELETE(buildDeleteRequest('order-1', 'idem-1'), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    expect(res.status).toBe(500);
  });
});

describe('CORRECTION 1/1 — PUT /api/staffing/orders/[id] validation', () => {
  it('200 + update service khi payload hợp lệ', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        title: 'New title',
        description: 'New desc',
        deadlineDate: '2026-12-31',
        slots: [
          {
            id: 's1',
            positionCode: 'ELEC',
            positionTitle: 'Thợ điện',
            slotsNeeded: 3,
            hourlyRateVnd: 35000,
            validFrom: '2026-10-01',
            validTo: '2026-12-31',
          },
        ],
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.updateStaffingOrder).toHaveBeenCalledOnce();
  });

  it('400 khi hourlyRateVnd không phải safe integer', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        slots: [
          {
            positionCode: 'ELEC',
            positionTitle: 'Thợ điện',
            slotsNeeded: 1,
            hourlyRateVnd: Number.MAX_SAFE_INTEGER + 1,
            validFrom: '2026-10-01',
          },
        ],
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ error: string }>(res);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(mocks.updateStaffingOrder).not.toHaveBeenCalled();
  });

  it('400 khi hourlyRateVnd là số âm', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        slots: [
          {
            positionCode: 'ELEC',
            positionTitle: 'Thợ điện',
            slotsNeeded: 1,
            hourlyRateVnd: -100,
            validFrom: '2026-10-01',
          },
        ],
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(400);
    expect(mocks.updateStaffingOrder).not.toHaveBeenCalled();
  });

  it('chấp nhận hourlyRateVnd null', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        slots: [
          {
            positionCode: 'ELEC',
            positionTitle: 'Thợ điện',
            slotsNeeded: 1,
            hourlyRateVnd: null,
            validFrom: '2026-10-01',
          },
        ],
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.updateStaffingOrder).toHaveBeenCalledOnce();
  });

  it('400 khi deadlineDate không phải ISO date hợp lệ', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        deadlineDate: 'not-a-date',
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(400);
    expect(mocks.updateStaffingOrder).not.toHaveBeenCalled();
  });

  it('400 khi validFrom thiếu', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        slots: [
          {
            positionCode: 'ELEC',
            positionTitle: 'Thợ điện',
            slotsNeeded: 1,
          },
        ],
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(400);
    expect(mocks.updateStaffingOrder).not.toHaveBeenCalled();
  });

  it('400 khi validTo < validFrom', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        slots: [
          {
            positionCode: 'ELEC',
            positionTitle: 'Thợ điện',
            slotsNeeded: 1,
            validFrom: '2026-12-31',
            validTo: '2026-01-01',
          },
        ],
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ message: string }>(res);
    expect(body.message).toMatch(/hiệu lực đến ngày/);
    expect(mocks.updateStaffingOrder).not.toHaveBeenCalled();
  });

  it('400 khi validTo là "2026-02-30" (Date round-trip fail)', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        slots: [
          {
            positionCode: 'ELEC',
            positionTitle: 'Thợ điện',
            slotsNeeded: 1,
            validFrom: '2026-01-01',
            validTo: '2026-02-30',
          },
        ],
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(400);
    expect(mocks.updateStaffingOrder).not.toHaveBeenCalled();
  });

  it('400 khi shiftStart không phải HH:mm', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        slots: [
          {
            positionCode: 'ELEC',
            positionTitle: 'Thợ điện',
            slotsNeeded: 1,
            validFrom: '2026-10-01',
            shiftStart: '7 giờ',
          },
        ],
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(400);
    expect(mocks.updateStaffingOrder).not.toHaveBeenCalled();
  });

  it('chấp nhận shiftStart HH:mm 24h', async () => {
    const res = await PUT(
      buildPutRequest('order-1', {
        slots: [
          {
            positionCode: 'ELEC',
            positionTitle: 'Thợ điện',
            slotsNeeded: 1,
            validFrom: '2026-10-01',
            shiftStart: '07:30',
            shiftEnd: '17:00',
          },
        ],
      }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(200);
  });

  it('400 khi slots không phải mảng', async () => {
    const res = await PUT(
      buildPutRequest('order-1', { slots: 'not-array' }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(400);
    expect(mocks.updateStaffingOrder).not.toHaveBeenCalled();
  });

  it('403 khi role không thuộc UPDATE_ROLES (HR_STAFF)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'h2', role: 'HR_STAFF' });
    const res = await PUT(
      buildPutRequest('order-1', { title: 'x' }),
      { params: Promise.resolve({ id: 'order-1' }) },
    );
    expect(res.status).toBe(403);
    expect(mocks.updateStaffingOrder).not.toHaveBeenCalled();
  });

  it('400 INVALID_BODY khi JSON.parse fail', async () => {
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.set('x-idempotency-key', 'idem-1');
    const req = new NextRequest('http://localhost/api/staffing/orders/order-1', {
      method: 'PUT',
      headers,
      body: 'not-json{',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'order-1' }) });
    expect(res.status).toBe(400);
    const body = await readJson<{ error: string }>(res);
    expect(body.error).toBe('INVALID_BODY');
  });
});