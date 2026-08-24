import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const auth = vi.hoisted(() => {
  class MockAuthSessionError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  }

  return {
    AuthSessionError: MockAuthSessionError,
    getAuthContext: vi.fn(),
  };
});

vi.mock('@/src/shared/auth/auth-context', () => auth);

import { GET } from '@/app/api/debug/route';

const request = () => new NextRequest('http://localhost/api/debug');

describe('GET /api/debug', () => {
  beforeEach(() => {
    auth.getAuthContext.mockReset();
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is not exposed in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(auth.getAuthContext).not.toHaveBeenCalled();
  });

  it('requires authentication outside production', async () => {
    auth.getAuthContext.mockRejectedValue(new auth.AuthSessionError('UNAUTHENTICATED'));

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('rejects authenticated non-admin roles', async () => {
    auth.getAuthContext.mockResolvedValue({ role: 'HR_MANAGER' });

    const response = await GET(request());

    expect(response.status).toBe(403);
  });

  it('returns only a minimal health response to ADMIN', async () => {
    auth.getAuthContext.mockResolvedValue({ role: 'ADMIN' });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});