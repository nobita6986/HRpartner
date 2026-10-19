import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { getTokenFromRequest } from './user';

function makeReq(headers: Record<string, string>): NextRequest {
  return new NextRequest('https://hrp.local/admin', { headers });
}

describe('getTokenFromRequest (T1A — Bearer-first fail-closed, TASK DEC-01)', () => {
  it('đọc token từ cookie hrp_session khi KHÔNG có Authorization header', () => {
    const req = makeReq({ cookie: 'hrp_session=abc123; other=1' });
    expect(getTokenFromRequest(req)).toBe('abc123');
  });

  it('đọc token từ Authorization: Bearer', () => {
    const req = makeReq({ authorization: 'Bearer xyz789' });
    expect(getTokenFromRequest(req)).toBe('xyz789');
  });

  it('Bearer ƯU TIÊN tuyệt đối khi có cả cookie (mobile contract — T1A)', () => {
    const req = makeReq({
      cookie: 'hrp_session=cook123',
      authorization: 'Bearer bea456',
    });
    expect(getTokenFromRequest(req)).toBe('bea456');
  });

  it('FAIL-CLOSED: header Authorization sai scheme (không Bearer) + cookie hợp lệ ⇒ null', () => {
    const req = makeReq({
      cookie: 'hrp_session=cook123',
      authorization: 'Basic dXNlcjpwYXNz',
    });
    expect(getTokenFromRequest(req)).toBeNull();
  });

  it('không có token -> null', () => {
    expect(getTokenFromRequest(makeReq({}))).toBeNull();
  });

  it('Bearer rỗng -> null', () => {
    expect(getTokenFromRequest(makeReq({ authorization: 'Bearer   ' }))).toBeNull();
  });
});
