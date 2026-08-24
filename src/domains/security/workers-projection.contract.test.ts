import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  class MockAuthSessionError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  }

  return {
    AuthSessionError: MockAuthSessionError,
    getAuthContext: vi.fn(),
    resolveEffectivePermissions: vi.fn(),
    worker: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
});

vi.mock('@/src/shared/auth/auth-context', () => ({
  AuthSessionError: mocks.AuthSessionError,
  getAuthContext: mocks.getAuthContext,
}));
vi.mock('@/src/shared/auth/permission-resolver', () => ({
  resolveEffectivePermissions: mocks.resolveEffectivePermissions,
}));
vi.mock('@/src/lib/db', () => ({
  getPrisma: () => ({ worker: mocks.worker }),
}));

import { GET } from '@/app/api/workers/route';
import { PUT } from '@/app/api/workers/[id]/route';

const rawWorker = {
  id: 'worker-1',
  userId: 'USR-001',
  fullName: 'Synthetic Worker',
  cccdNumber: '012345678901',
  bankAccount: '1234567890',
  bankName: 'Synthetic Bank',
};

describe('worker route projections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.worker.findMany.mockResolvedValue([rawWorker]);
    mocks.worker.count.mockResolvedValue(1);
    mocks.worker.update.mockResolvedValue(rawWorker);
    mocks.resolveEffectivePermissions.mockResolvedValue(new Set());
  });

  it('masks CCCD and bank fields from SALE list responses', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'sale-1', role: 'SALE' });

    const response = await GET(new NextRequest('http://localhost/api/workers'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.workers[0]).toMatchObject({
      cccdNumber: '***',
      bankAccount: '***',
      bankName: '***',
    });
    expect(JSON.stringify(body)).not.toContain('012345678901');
    expect(JSON.stringify(body)).not.toContain('1234567890');
  });

  it('keeps MKT denied by the visibility matrix', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'mkt-1', role: 'MKT' });

    const response = await GET(new NextRequest('http://localhost/api/workers'));

    expect(response.status).toBe(403);
    expect(mocks.worker.findMany).not.toHaveBeenCalled();
  });

  it('returns sensitive fields only when the effective permission is present', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'hr-1', role: 'HR_MANAGER' });
    mocks.resolveEffectivePermissions.mockResolvedValue(
      new Set(['CAN_VIEW_WORKER_SENSITIVE']),
    );

    const response = await GET(new NextRequest('http://localhost/api/workers'));
    const body = await response.json();

    expect(body.workers[0].cccdNumber).toBe('012345678901');
    expect(body.workers[0].bankAccount).toBe('1234567890');
  });

  it('projects the worker returned by the update route', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'hr-1', role: 'HR_MANAGER' });
    const request = new NextRequest('http://localhost/api/workers/worker-1', {
      method: 'PUT',
      body: JSON.stringify({ fullName: 'Updated Worker' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'worker-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.worker.cccdNumber).toBe('***');
    expect(body.worker.bankAccount).toBe('***');
  });
});