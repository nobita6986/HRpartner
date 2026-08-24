import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(() => ({ marker: 'db' })),
  withDbContext: vi.fn(async (_db, _ctx, fn) => fn({ marker: 'tx' })),
  convert: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/auth-context', async (original) => {
  const actual = await original<typeof import('@/src/shared/auth/auth-context')>();
  return { ...actual, getAuthContext: mocks.getAuthContext };
});
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
vi.mock('./conversion.service', async (original) => {
  const actual = await original<typeof import('./conversion.service')>();
  return { ...actual, convertApplication: mocks.convert };
});

import { AuthSessionError } from '@/src/shared/auth/auth-context';
import { ConversionError } from './conversion.service';
import { POST } from '@/app/api/admin/applications/[id]/actions/convert/route';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/admin/applications/sub-1/actions/convert', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
}
const params = { params: Promise.resolve({ id: 'sub-1' }) };

describe('MP-3B convert route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue({ userId: 'hr-1', role: 'HR_MANAGER' });
    mocks.convert.mockResolvedValue({
      id: 'sub-1', status: 'CONVERTED', workerId: 'worker-1', sourceClaimId: 'claim-1', version: 4, changed: true,
    });
  });

  it('authenticates, scopes and forwards the conversion command', async () => {
    const response = await POST(req({ reason: 'Convert', expectedVersion: 3, existingWorkerId: ' worker-1 ' }), params);
    expect(response.status).toBe(200);
    expect(mocks.withDbContext).toHaveBeenCalledOnce();
    expect(mocks.convert).toHaveBeenCalledWith(
      { marker: 'tx' }, { userId: 'hr-1', role: 'HR_MANAGER' }, 'sub-1',
      { reason: 'Convert', expectedVersion: 3, existingWorkerId: 'worker-1' },
    );
  });

  it('returns 401 before DB context when auth fails', async () => {
    mocks.getAuthContext.mockRejectedValue(new AuthSessionError('NO_TOKEN', 'Missing token'));
    const response = await POST(req({ reason: 'x' }), params);
    expect(response.status).toBe(401);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('returns dedup candidates in a stable 409 response', async () => {
    mocks.convert.mockRejectedValue(new ConversionError(
      'DEDUP_REVIEW_REQUIRED', 409, 'Review',
      { candidates: [{ workerId: 'worker-1', matchedOn: ['PHONE'] }] },
    ));
    const response = await POST(req({ reason: 'x' }), params);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: 'DEDUP_REVIEW_REQUIRED',
      details: { candidates: [{ workerId: 'worker-1', matchedOn: ['PHONE'] }] },
    });
  });

  it('rejects malformed expectedVersion before invoking the domain', async () => {
    const response = await POST(req({ reason: 'x', expectedVersion: -1 }), params);
    expect(response.status).toBe(400);
    expect(mocks.convert).not.toHaveBeenCalled();
  });
});