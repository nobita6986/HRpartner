import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  resolvePerms: vi.fn(),
  withAuthorizedDbReadOnly: vi.fn(),
  withDbContext: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error { code = 'UNAUTHENTICATED'; },
}));
vi.mock('@/src/shared/auth/permission-resolver', () => ({ resolveEffectivePermissions: mocks.resolvePerms }));
vi.mock('@/src/shared/auth/with-authorized-db', () => ({ withAuthorizedDbReadOnly: mocks.withAuthorizedDbReadOnly }));
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));

import { GET, POST } from '@/app/api/workers/route';

const fakeTx = () => ({
  worker: {
    findMany: mocks.findMany,
    count: mocks.count,
    create: mocks.create,
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role: 'ADMIN' });
  mocks.resolvePerms.mockResolvedValue(new Set<string>());
  mocks.withAuthorizedDbReadOnly.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb(fakeTx()));
  mocks.withDbContext.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb(fakeTx()));
  mocks.findMany.mockResolvedValue([]);
  mocks.count.mockResolvedValue(0);
});

describe('GET /api/workers', () => {
  it('supports employmentStatus param and takes precedence over status alias', async () => {
    // Both params provided -> employmentStatus wins
    const req1 = new NextRequest('http://localhost/api/workers?employmentStatus=SUSPENDED&status=ACTIVE');
    await GET(req1);
    expect(mocks.findMany.mock.calls[0][0].where.employmentStatus).toBe('SUSPENDED');
    
    // Only status provided
    mocks.findMany.mockClear();
    const req2 = new NextRequest('http://localhost/api/workers?status=ACTIVE');
    await GET(req2);
    expect(mocks.findMany.mock.calls[0][0].where.employmentStatus).toBe('ACTIVE');
  });

  it('whitelists all four enum values', async () => {
    for (const st of ['NONE', 'ACTIVE', 'SUSPENDED', 'TERMINATED']) {
      mocks.findMany.mockClear();
      const req = new NextRequest(`http://localhost/api/workers?employmentStatus=${st}`);
      await GET(req);
      expect(mocks.findMany.mock.calls[0][0].where.employmentStatus).toBe(st);
    }
  });

  it('invalid value returns 400 and does not call findMany/count', async () => {
    const req = new NextRequest('http://localhost/api/workers?status=INVALID_STATUS');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('BAD_REQUEST');
    
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
  });
});

describe('POST /api/workers', () => {
  it('does not send or write fake status field', async () => {
    mocks.create.mockResolvedValue({ id: 'w1', userId: 'usr1', fullName: 'Test' });
    const req = new NextRequest('http://localhost/api/workers', {
      method: 'POST',
      body: JSON.stringify({ userId: 'usr1', fullName: 'Test Worker', status: 'ACTIVE' }),
    });
    await POST(req);
    
    const createData = mocks.create.mock.calls[0][0].data;
    expect(createData).not.toHaveProperty('status');
    expect(createData.fullName).toBe('Test Worker');
  });
});
