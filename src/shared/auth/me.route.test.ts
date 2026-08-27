/**
 * me.route.test.ts — V5-M1-06d / RQ-06 / STEP-06 / DEC-09 / AC-06.
 *
 * UNIT: /api/me là NO_BUSINESS_DB — chỉ trả JWT projection tối thiểu {userId, role}.
 *   - no token / token lỗi → 401.
 *   - token hợp lệ → 200 body EXACTLY {userId, role} (không lộ thêm field PII nào).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ getAuthUser: vi.fn() }));
vi.mock('@/src/shared/auth/user', () => ({ getAuthUser: mocks.getAuthUser }));

import { GET } from '@/app/api/me/route';

const req = () => new NextRequest('http://localhost/api/me');

describe('GET /api/me — NO_BUSINESS_DB minimal projection (DEC-09)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no token → 401', async () => {
    mocks.getAuthUser.mockResolvedValueOnce(null);
    expect((await GET(req())).status).toBe(401);
  });

  it('valid token → 200, body CHỈ {userId, role} (không PII thừa)', async () => {
    // getAuthUser trả claims kèm field thừa — route PHẢI chỉ trả userId + role.
    mocks.getAuthUser.mockResolvedValueOnce({ sub: 'u1', role: 'WORKER', phone: '0900000000', iat: 1, exp: 2 });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ userId: 'u1', role: 'WORKER' });
    expect(Object.keys(body).sort()).toEqual(['role', 'userId']);
  });
});
