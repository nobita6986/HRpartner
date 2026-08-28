/**
 * statements-list.projection.route.test.ts — V5-M1-09A / RQ-04 / STEP-03 / AC-04 (DEC-06).
 *
 * GET /api/statements: CLIENT_COMMERCIAL (client receivable `totalAmount`) CHỈ lộ khi caller có
 * CAN_VIEW_STATEMENT_MARGIN hiệu lực. VENDOR_FINANCIAL (vendor payable `totalAmount`) LUÔN lộ cho
 * internal reader. Thiếu quyền ⇒ field client totalAmount bị OMIT (không null-placeholder → RISK-02
 * không suy được margin). Resolver lỗi ⇒ FAIL-CLOSED (coi như KHÔNG quyền). DB TRẢ VỀ row thù địch
 * (BigInt totalAmount + canary + field dư) → response chỉ allowlist, KHÔNG lộ figure/BigInt/canary.
 * Role gate DEC-06: ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR → 200; 9 role còn lại → 403 TRƯỚC DB/resolver.
 *
 * Concern KHÁC vendor-object-scope.m1-08 (chỉ chứng minh vendor 403 / internal 200, client rows rỗng,
 * KHÔNG mock permission-resolver): test này BẮT chính nhánh conditional-spread client totalAmount.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SYSTEM_ROLES } from '@/src/shared/projection/manifest';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  resolvePerms: vi.fn(),
  withDbContext: vi.fn(),
  vendorFindMany: vi.fn(),
  vendorCount: vi.fn(),
  clientFindMany: vi.fn(),
  clientCount: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error { code = 'UNAUTHENTICATED'; },
}));
vi.mock('@/src/shared/auth/permission-resolver', () => ({ resolveEffectivePermissions: mocks.resolvePerms }));
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));

import { GET } from '@/app/api/statements/route';

const ALLOWED = ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR'];
const DENIED = SYSTEM_ROLES.filter((r) => !ALLOWED.includes(r)); // 9 role

// Allowlist DTO key set (base = không có totalAmount). Vendor luôn +totalAmount; client CHỈ khi có quyền.
const BASE_KEYS = ['id', 'kind', 'partyId', 'partyName', 'periodMonth', 'periodYear', 'status', 'version', 'disputeCount', 'confirmDeadlineAt', 'sentAt', 'lockedAt', 'createdAt'];
// Field raw KHÔNG bao giờ được là key DTO (đã rename/omit): raw id party, figure phụ, note nội bộ.
const FORBIDDEN_KEYS = ['vendorId', 'clientId', 'rate', 'marginAmount', 'clientReceivable', 'internalNote', 'lines'];

// Row THÙ ĐỊCH: BigInt totalAmount + Date + canary + field dư. Vendor payable=500000; client receivable=777777.
const HOSTILE_VENDOR = {
  id: 'vs-1', vendorId: 'vendor-A', periodMonth: 8, periodYear: 2026, version: 1, status: 'SENT', disputeCount: 0,
  totalAmount: 500000n, rate: 500n, internalNote: 'CANARY-VENDOR-NOTE', lines: [{ amount: 1n }],
  confirmDeadlineAt: null, sentAt: new Date('2026-08-20T00:00:00.000Z'), lockedAt: null,
  createdAt: new Date('2026-08-10T00:00:00.000Z'),
};
const HOSTILE_CLIENT = {
  id: 'cs-1', clientId: 'client-X', periodMonth: 8, periodYear: 2026, version: 1, status: 'SENT', disputeCount: 0,
  totalAmount: 777777n, marginAmount: 111n, clientReceivable: 777777n, internalNote: 'CANARY-CLIENT-NOTE',
  confirmDeadlineAt: null, sentAt: new Date('2026-08-21T00:00:00.000Z'), lockedAt: null,
  createdAt: new Date('2026-08-11T00:00:00.000Z'),
};

const fakeTx = () => ({
  vendorStatement: { findMany: mocks.vendorFindMany, count: mocks.vendorCount },
  clientStatement: { findMany: mocks.clientFindMany, count: mocks.clientCount },
});

const req = (qs = '') => new NextRequest('http://localhost/api/statements' + qs);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withDbContext.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb(fakeTx()));
  mocks.vendorFindMany.mockResolvedValue([HOSTILE_VENDOR]);
  mocks.clientFindMany.mockResolvedValue([HOSTILE_CLIENT]);
  mocks.vendorCount.mockResolvedValue(1);
  mocks.clientCount.mockResolvedValue(1);
  mocks.resolvePerms.mockResolvedValue(new Set<string>()); // mặc định: KHÔNG có CAN_VIEW_STATEMENT_MARGIN
});

function splitByKind(statements: Array<Record<string, unknown>>) {
  return {
    vendor: statements.filter((s) => s.kind === 'VENDOR'),
    client: statements.filter((s) => s.kind === 'CLIENT'),
  };
}

function assertAllowlistKeys(dto: Record<string, unknown>) {
  const allowed = new Set([...BASE_KEYS, 'totalAmount']);
  for (const k of Object.keys(dto)) expect(allowed, `key lạ ${k}`).toContain(k);
  for (const k of FORBIDDEN_KEYS) expect(dto).not.toHaveProperty(k);
}

describe('GET /api/statements — CLIENT_COMMERCIAL gating (AC-04 / RQ-04 / DEC-06)', () => {
  it('internal reader THIẾU CAN_VIEW_STATEMENT_MARGIN → 200; vendor totalAmount CÓ, client totalAmount OMIT, KHÔNG lộ receivable/canary/BigInt', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-hr', role: 'HR_MANAGER' });
    const res = await GET(req());
    expect(res.status).toBe(200); // BigInt leak → NextResponse.json throw → 500; 200 chứng minh sạch

    const json = await res.json();
    const raw = JSON.stringify(json);
    // Canary field dư KHÔNG rò rỉ.
    expect(raw).not.toContain('CANARY');
    // Client receivable (777777) KHÔNG xuất hiện ở BẤT KỲ đâu (kể cả suy gián tiếp).
    expect(raw).not.toContain('777777');

    const { vendor, client } = splitByKind(json.statements);
    expect(vendor).toHaveLength(1);
    expect(client).toHaveLength(1);

    // VENDOR_FINANCIAL luôn lộ cho internal reader.
    expect(vendor[0].totalAmount).toBe('500000');
    expect(vendor[0].partyId).toBe('vendor-A');
    assertAllowlistKeys(vendor[0]);

    // CLIENT_COMMERCIAL bị OMIT (không null, không placeholder) — RISK-02 không suy được margin.
    expect(client[0]).not.toHaveProperty('totalAmount');
    expect(client[0].partyId).toBe('client-X');
    assertAllowlistKeys(client[0]);

    // Resolver được gọi đúng chữ ký fail-closed.
    expect(mocks.resolvePerms.mock.calls[0][0]).toEqual({ userId: 'u-hr', role: 'HR_MANAGER' });
  });

  it('internal reader CÓ CAN_VIEW_STATEMENT_MARGIN → client totalAmount lộ dạng string; vendor vẫn CÓ', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-acc', role: 'ACCOUNTANT' });
    mocks.resolvePerms.mockResolvedValue(new Set<string>(['CAN_VIEW_STATEMENT_MARGIN']));
    const res = await GET(req());
    expect(res.status).toBe(200);

    const json = await res.json();
    const { vendor, client } = splitByKind(json.statements);
    expect(vendor[0].totalAmount).toBe('500000'); // BigInt → base-10 string (DEC-13)
    expect(client[0].totalAmount).toBe('777777');
    assertAllowlistKeys(client[0]);
  });

  it('FAIL-CLOSED: resolveEffectivePermissions THROW → client totalAmount OMIT (coi như KHÔNG quyền)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-dir', role: 'DIRECTOR' });
    mocks.resolvePerms.mockRejectedValueOnce(new Error('resolver down'));
    const res = await GET(req());
    expect(res.status).toBe(200); // lỗi resolver KHÔNG được leak 500 — nuốt & ẩn client figure

    const json = await res.json();
    const { vendor, client } = splitByKind(json.statements);
    expect(vendor[0].totalAmount).toBe('500000'); // vendor payable không phụ thuộc quyền margin
    expect(client[0]).not.toHaveProperty('totalAmount');
    expect(JSON.stringify(json)).not.toContain('777777');
  });

  it.each(ALLOWED)('%s → 200 (internal reader), có gọi resolver + withDbContext', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mocks.resolvePerms).toHaveBeenCalledTimes(1);
    expect(mocks.withDbContext).toHaveBeenCalled();
  });

  it.each(DENIED)('%s → 403 TRƯỚC khi chạm DB/resolver', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role });
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
    expect(mocks.resolvePerms).not.toHaveBeenCalled();
    expect(mocks.vendorFindMany).not.toHaveBeenCalled();
    expect(mocks.clientFindMany).not.toHaveBeenCalled();
  });

  it('enumerate đúng 13 role (4 allowed + 9 denied) — enum drift → fail', () => {
    expect(ALLOWED.length + DENIED.length).toBe(13);
  });
});
