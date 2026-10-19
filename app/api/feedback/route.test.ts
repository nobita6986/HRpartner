import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), withDbContext: vi.fn(), user: vi.fn(), create: vi.fn() }));
vi.mock('@/src/shared/auth/auth-context', () => ({ getAuthContext: mocks.auth }));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));

import { POST } from './route';

const request = (body: unknown) => new NextRequest('http://localhost/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: 'user-1', role: 'WORKER' });
    mocks.withDbContext.mockImplementation((_prisma: unknown, _ctx: unknown, callback: (tx: unknown) => unknown) => callback({
      user: { findUnique: mocks.user }, feedback: { create: mocks.create },
    }));
    mocks.user.mockResolvedValue({ phoneVerified: true });
    mocks.create.mockResolvedValue({ id: 'feedback-1', status: 'RECEIVED', createdAt: new Date('2026-10-19T00:00:00Z') });
  });

  it('requires verified phone and never creates feedback before OTP', async () => {
    mocks.user.mockResolvedValueOnce({ phoneVerified: false });
    const response = await POST(request({ category: 'COMPLAINT', content: 'Xin phản ánh về lịch làm việc.' }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'PHONE_NOT_VERIFIED' } });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('creates feedback with server-owned user id and contract response', async () => {
    const response = await POST(request({ category: 'SUGGESTION', content: 'Đề nghị cải thiện thông tin ca làm.' }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, data: { feedbackId: 'feedback-1', status: 'RECEIVED' } });
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ userId: 'user-1', category: 'SUGGESTION' });
  });
});
