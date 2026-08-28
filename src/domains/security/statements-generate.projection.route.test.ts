/**
 * statements-generate.projection.route.test.ts — V5-M1-09A / RQ-04 / STEP-03 / AC-05 (DEC-08).
 *
 * POST /api/statements/generate: response = command-result DTO tối thiểu
 * (kind/created/id/status/period/version). Service TRẢ VỀ object thù địch (lines/rate/
 * amount/totalAmount BigInt/vendorId…) → route CHỈ được lấy allowlist, KHÔNG lộ figure,
 * KHÔNG throw BigInt. Role gate: ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR → 201; 9 role còn
 * lại → 403 TRƯỚC khi chạm DB/service.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SYSTEM_ROLES } from '@/src/shared/projection/manifest';

const mocks = vi.hoisted(() => {
  // Định nghĩa trong hoisted block để vi.mock factory (bị hoist lên đầu file) truy cập được
  // cùng một class → instanceof đúng trong nhánh ALREADY_EXISTS.
  class StatementServiceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'StatementServiceError';
    }
  }
  return {
    getAuthContext: vi.fn(),
    withDbContext: vi.fn(),
    generateVendorStatement: vi.fn(),
    generateClientStatement: vi.fn(),
    StatementServiceError,
  };
});

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error { code = 'UNAUTHENTICATED'; },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));

vi.mock('@/src/domains/reconciliation/statement.service', () => ({
  generateVendorStatement: mocks.generateVendorStatement,
  generateClientStatement: mocks.generateClientStatement,
  StatementServiceError: mocks.StatementServiceError,
}));

import { POST } from '@/app/api/statements/generate/route';

const ALLOWED = ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR'];
const DENIED = SYSTEM_ROLES.filter((r) => !ALLOWED.includes(r)); // 9 role

const ALLOWED_KEYS = ['kind', 'created', 'id', 'status', 'periodMonth', 'periodYear', 'version'];
const FORBIDDEN_KEYS = ['lines', 'rate', 'amount', 'totalAmount', 'vendorId', 'clientId', 'marginAmount', 'clientReceivable'];

// Object THÙ ĐỊCH: chứa figure + BigInt + canary. Route chỉ được nhặt allowlist.
const HOSTILE_VENDOR = {
  id: 'vs-1', status: 'DRAFT', periodMonth: 8, periodYear: 2026, version: 1,
  totalAmount: 999999n, rate: 500n, vendorId: 'CANARY-VENDOR', clientReceivable: 777n,
  lines: [{ id: 'l1', workerId: 'CANARY-WORKER', rate: 500n, amount: 1000n }],
};
const HOSTILE_CLIENT = {
  id: 'cs-1', status: 'DRAFT', periodMonth: 8, periodYear: 2026, version: 1,
  totalAmount: 888888n, marginAmount: 111n, clientId: 'CANARY-CLIENT',
  lines: [{ id: 'l2', rate: 900n, amount: 2000n }],
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/statements/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withDbContext.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb({}));
  mocks.generateVendorStatement.mockResolvedValue(HOSTILE_VENDOR);
  mocks.generateClientStatement.mockResolvedValue(HOSTILE_CLIENT);
});

describe('POST /api/statements/generate — command-result DTO (AC-05 / DEC-08)', () => {
  it('ADMIN → 201, DTO chỉ allowlist, KHÔNG lộ figure/BigInt/canary', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'ADMIN' });
    const res = await POST(makeReq({ timesheetPeriodId: 'tp-1' }));
    expect(res.status).toBe(201); // BigInt leak → NextResponse.json throw → 500; 201 chứng minh sạch

    const json = await res.json();
    const raw = JSON.stringify(json);
    expect(raw).not.toContain('CANARY');
    for (const part of [json.vendorStatement, json.clientStatement]) {
      for (const k of Object.keys(part)) expect(ALLOWED_KEYS, `key lạ ${k}`).toContain(k);
      for (const k of FORBIDDEN_KEYS) expect(part).not.toHaveProperty(k);
      expect(part.created).toBe(true);
    }
    expect(json.vendorStatement.id).toBe('vs-1');
    expect(json.vendorStatement.kind).toBe('VENDOR');
    expect(json.clientStatement.kind).toBe('CLIENT');
  });

  it('ALREADY_EXISTS → created:false, KHÔNG lộ id/figure', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'ACCOUNTANT' });
    mocks.generateVendorStatement.mockRejectedValueOnce(new mocks.StatementServiceError('ALREADY_EXISTS', 'exists'));
    const res = await POST(makeReq({ timesheetPeriodId: 'tp-1' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.vendorStatement).toEqual({ kind: 'VENDOR', created: false });
    expect(json.clientStatement.created).toBe(true);
  });

  it.each(ALLOWED)('%s → 201 (allowed viewer)', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role });
    const res = await POST(makeReq({ timesheetPeriodId: 'tp-1' }));
    expect(res.status).toBe(201);
    expect(mocks.withDbContext).toHaveBeenCalled();
  });

  it.each(DENIED)('%s → 403 TRƯỚC khi chạm DB/service', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role });
    const res = await POST(makeReq({ timesheetPeriodId: 'tp-1' }));
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
    expect(mocks.generateVendorStatement).not.toHaveBeenCalled();
    expect(mocks.generateClientStatement).not.toHaveBeenCalled();
  });

  it('enumerate đúng 13 role (4 allowed + 9 denied) — enum drift → fail', () => {
    expect(ALLOWED.length + DENIED.length).toBe(13);
  });
});
