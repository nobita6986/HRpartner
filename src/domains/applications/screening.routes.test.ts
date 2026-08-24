import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(() => ({ marker: 'db' })),
  withDbContext: vi.fn(async (_db, _ctx, fn) => fn({ marker: 'tx' })),
  execute: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/auth-context', async (original) => {
  const actual = await original<typeof import('@/src/shared/auth/auth-context')>();
  return { ...actual, getAuthContext: mocks.getAuthContext };
});
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
vi.mock('./screening.service', async (original) => {
  const actual = await original<typeof import('./screening.service')>();
  return { ...actual, executeScreeningAction: mocks.execute };
});

import { AuthSessionError } from '@/src/shared/auth/auth-context';
import { handleScreeningAction } from '@/app/api/admin/applications/[id]/actions/handler';
import { ScreeningCommandError } from './screening.service';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/admin/applications/sub-1/actions/screen', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('MP-3A screening action routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue({ userId: 'hr-1', role: 'HR_MANAGER' });
    mocks.execute.mockResolvedValue({ id: 'sub-1', status: 'SCREENING', version: 1, changed: true });
  });

  it('authenticates, scopes the transaction and forwards note as reason', async () => {
    const response = await handleScreeningAction(req({ note: 'Reviewed', expectedVersion: 0 }), 'sub-1', 'screen');
    expect(response.status).toBe(200);
    expect(mocks.withDbContext).toHaveBeenCalledOnce();
    expect(mocks.execute).toHaveBeenCalledWith(
      { marker: 'tx' },
      { userId: 'hr-1', role: 'HR_MANAGER' },
      'sub-1',
      'screen',
      { reason: 'Reviewed', expectedVersion: 0 },
    );
  });

  it('maps missing authentication to 401 before opening DB context', async () => {
    mocks.getAuthContext.mockRejectedValue(new AuthSessionError('NO_TOKEN', 'Missing token'));
    const response = await handleScreeningAction(req({ reason: 'x' }), 'sub-1', 'screen');
    expect(response.status).toBe(401);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
  });

  it('maps domain forbidden/stale/reason errors to their stable HTTP status', async () => {
    for (const [code, status] of [['FORBIDDEN', 403], ['STALE_VERSION', 409], ['REASON_REQUIRED', 400]] as const) {
      mocks.execute.mockRejectedValueOnce(new ScreeningCommandError(code, status, code));
      const response = await handleScreeningAction(req({ reason: 'x' }), 'sub-1', 'reject');
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ error: code });
    }
  });

  it('rejects malformed expectedVersion before calling the domain', async () => {
    const response = await handleScreeningAction(req({ reason: 'x', expectedVersion: -1 }), 'sub-1', 'screen');
    expect(response.status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});