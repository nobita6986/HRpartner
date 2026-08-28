/**
 * ctv-withdrawals.projection.route.test.ts — V5-M1-09A / RQ-09 / STEP-05 / AC-08 (DEC-09).
 *
 * /api/ctv/withdrawals: self DTO OMIT `ctvId` (owner suy từ session, KHÔNG lộ ra response,
 * KHÔNG nhận từ body). DB TRẢ VỀ record thù địch (ctvId bí mật + BigInt amountVnd + Date +
 * internalNote) → response chỉ allowlist, amountVnd→string, createdAt→ISO. Chỉ CTV; 12 role
 * còn lại → 403 TRƯỚC khi chạm DB.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SYSTEM_ROLES } from '@/src/shared/projection/manifest';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  withAuthorizedDb: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error { code = 'UNAUTHENTICATED'; },
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({ withAuthorizedDb: mocks.withAuthorizedDb }));

import { POST, GET } from '@/app/api/ctv/withdrawals/route';

const NON_CTV = SYSTEM_ROLES.filter((r) => r !== 'CTV'); // 12 role
const ALLOWED_KEYS = ['id', 'amountVnd', 'bankAccount', 'bankName', 'status', 'createdAt'];

// Record THÙ ĐỊCH — DB trả dư field (ctvId bí mật, internalNote, BigInt, Date).
const HOSTILE = {
  id: 'wd-1',
  ctvId: 'CTV-SECRET-999',
  amountVnd: 500000n,
  bankAccount: '1234567890',
  bankName: 'Synthetic Bank',
  status: 'PENDING',
  createdAt: new Date('2026-08-28T00:00:00.000Z'),
  internalNote: 'CANARY-NOTE',
};

const fakeTx = () => ({ ctvWithdrawalRequest: { create: mocks.create, findMany: mocks.findMany } });

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ctv/withdrawals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const getReq = () => new NextRequest('http://localhost/api/ctv/withdrawals');

function assertSelfDto(dto: Record<string, unknown>) {
  for (const k of Object.keys(dto)) expect(ALLOWED_KEYS, `key lạ ${k}`).toContain(k);
  expect(dto).not.toHaveProperty('ctvId');
  expect(dto).not.toHaveProperty('internalNote');
  expect(dto.amountVnd).toBe('500000'); // BigInt→string (DEC-13)
  expect(dto.createdAt).toBe('2026-08-28T00:00:00.000Z'); // Date→ISO
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withDbContext.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb(fakeTx()));
  mocks.withAuthorizedDb.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb(fakeTx()));
  mocks.create.mockResolvedValue(HOSTILE);
  mocks.findMany.mockResolvedValue([HOSTILE]);
});

describe('POST /api/ctv/withdrawals — self DTO omit ctvId (AC-08)', () => {
  it('CTV → 201, DTO omit ctvId; owner = session (KHÔNG nhận ctvId từ body)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'ctv-user-1', role: 'CTV' });
    const res = await POST(postReq({ amountVnd: 500000, bankAccount: '1234567890', bankName: 'Synthetic Bank', ctvId: 'HACK-CLIENT' }));
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(JSON.stringify(json)).not.toContain('CTV-SECRET');
    expect(JSON.stringify(json)).not.toContain('CANARY');
    assertSelfDto(json.withdrawal);

    // owner suy từ ctx.userId, KHÔNG phải body.ctvId.
    expect(mocks.create.mock.calls[0][0].data.ctvId).toBe('ctv-user-1');
    expect(mocks.create.mock.calls[0][0].data.ctvId).not.toBe('HACK-CLIENT');
  });

  it.each(NON_CTV)('%s → 403 TRƯỚC khi chạm DB', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role });
    const res = await POST(postReq({ amountVnd: 500000, bankAccount: 'x', bankName: 'y' }));
    expect(res.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/ctv/withdrawals — self list DTO omit ctvId (AC-08)', () => {
  it('CTV → 200, items omit ctvId; scope where.ctvId = session', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'ctv-user-1', role: 'CTV' });
    const res = await GET(getReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(JSON.stringify(json)).not.toContain('CTV-SECRET');
    expect(Array.isArray(json.items)).toBe(true);
    assertSelfDto(json.items[0]);
    expect(mocks.findMany.mock.calls[0][0].where.ctvId).toBe('ctv-user-1');
  });

  it.each(NON_CTV)('%s → 403 TRƯỚC khi chạm DB', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role });
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('enumerate đúng 13 role (1 CTV + 12 non-CTV) — enum drift → fail', () => {
    expect(1 + NON_CTV.length).toBe(13);
  });
});
