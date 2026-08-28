import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { getTokenFromRequest } from './user';

function makeReq(headers: Record<string, string>): NextRequest {
  return new NextRequest('https://hrp.local/admin', { headers });
}

describe('getTokenFromRequest (cookie + Bearer — DEC-03)', () => {
  it('đọc token từ cookie hrp_session', () => {
    const req = makeReq({ cookie: 'hrp_session=abc123; other=1' });
    expect(getTokenFromRequest(req)).toBe('abc123');
  });

  it('đọc token từ Authorization: Bearer', () => {
    const req = makeReq({ authorization: 'Bearer xyz789' });
    expect(getTokenFromRequest(req)).toBe('xyz789');
  });

  it('cookie ưu tiên hơn Bearer', () => {
    const req = makeReq({
      cookie: 'hrp_session=cook123',
      authorization: 'Bearer bea456',
    });
    expect(getTokenFromRequest(req)).toBe('cook123');
  });

  it('không có token -> null', () => {
    expect(getTokenFromRequest(makeReq({}))).toBeNull();
  });

  it('Bearer rỗng -> null', () => {
    expect(getTokenFromRequest(makeReq({ authorization: 'Bearer   ' }))).toBeNull();
  });
});
