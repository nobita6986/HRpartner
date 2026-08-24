import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getCtvBalance: vi.fn(),
  listLedgerByCtv: vi.fn(),
  userFindUnique: vi.fn(),
  sourceClaimFindMany: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
}));
vi.mock('@/src/lib/db', () => ({
  getPrisma: () => ({
    user: { findUnique: mocks.userFindUnique },
    sourceClaim: { findMany: mocks.sourceClaimFindMany },
  }),
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: async (
    prisma: unknown,
    _ctx: unknown,
    callback: (tx: unknown) => Promise<unknown>,
  ) => callback(prisma),
}));
vi.mock('@/src/domains/commission/ledger.service', () => ({
  getCtvBalance: mocks.getCtvBalance,
  listLedgerByCtv: mocks.listLedgerByCtv,
}));

import { GET } from '@/app/api/ctv/summary/route';

const request = () => new NextRequest('http://localhost/api/ctv/summary');

describe('GET /api/ctv/summary commission source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue({ userId: 'ctv-1', role: 'CTV' });
    mocks.userFindUnique.mockResolvedValue({
      affCode: 'CTV-SYNTHETIC',
      phone: '0900000000',
    });
    mocks.sourceClaimFindMany.mockResolvedValue([
      { accepted: true },
      { accepted: false },
    ]);
    mocks.getCtvBalance.mockResolvedValue(0n);
    mocks.listLedgerByCtv.mockResolvedValue({ items: [], total: 0 });
  });

  it('returns null with a note when no ledger evidence exists', async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.estimatedCommission).toBeNull();
    expect(body.commission).toEqual({
      source: 'COMMISSION_LEDGER',
      availableVnd: null,
      ledgerEntries: 0,
      note: 'Chưa có dữ liệu CommissionLedger; không ước tính hoa hồng.',
    });
  });

  it('returns the real approved/paid ledger balance when entries exist', async () => {
    mocks.getCtvBalance.mockResolvedValue(750_000n);
    mocks.listLedgerByCtv.mockResolvedValue({
      items: [{ id: 'ledger-1' }],
      total: 2,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(body.estimatedCommission).toBe('750000');
    expect(body.commission.availableVnd).toBe('750000');
    expect(body.commission.ledgerEntries).toBe(2);
    expect(body.commissionSource).toBe('COMMISSION_LEDGER');
  });

  it('distinguishes a real zero balance from missing ledger data', async () => {
    mocks.listLedgerByCtv.mockResolvedValue({
      items: [{ id: 'ledger-zero' }],
      total: 1,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(body.estimatedCommission).toBe('0');
    expect(body.commission.availableVnd).toBe('0');
  });

  it('rejects non-CTV roles before querying commission data', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'sale-1', role: 'SALE' });

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.getCtvBalance).not.toHaveBeenCalled();
  });
});