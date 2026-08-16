import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import { signJwt, verifyJwt, JWT_ALG } from './jwt';

// Chỉ dùng trong test — không phải secret production
const TEST_SECRET = 'local-test-secret-32chars-min-12345678';

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

describe('jwt helpers (jose HS256 — RQ-03)', () => {
  it('sign -> verify roundtrip trả đúng sub + role', async () => {
    const token = await signJwt('user-123', 'ADMIN');
    const claims = await verifyJwt(token);
    expect(claims.sub).toBe('user-123');
    expect(claims.role).toBe('ADMIN');
  });

  it('token giả mạo (sửa 1 ký tự) bị reject', async () => {
    const token = await signJwt('user-123', 'ADMIN');
    // LƯU Ý: không mutate ký tự CUỐI token — ký tự cuối base64url có thể nằm ở
    // bit thừa (không dùng), đổi nó decode ra cùng bytes → verify vẫn thành công
    // (flake ~1/64). Mutate ký tự GIỮA segment signature → bytes đổi chắc chắn.
    const parts = token.split('.');
    const sig = parts[2];
    const mid = Math.floor(sig.length / 2);
    parts[2] = sig.slice(0, mid) + (sig[mid] === 'A' ? 'B' : 'A') + sig.slice(mid + 1);
    const tampered = parts.join('.');
    await expect(verifyJwt(tampered)).rejects.toThrow();
  });

  it('token hết hạn (exp đã qua) bị reject', async () => {
    const expired = await new SignJWT({ role: 'HR_MANAGER' })
      .setProtectedHeader({ alg: JWT_ALG })
      .setSubject('user-456')
      .setIssuedAt()
      .setExpirationTime('-1s')
      .sign(new TextEncoder().encode(TEST_SECRET));
    await expect(verifyJwt(expired)).rejects.toThrow();
  });

  it('token thiếu role bị reject (fail-closed payload)', async () => {
    const noRole = await new SignJWT({})
      .setProtectedHeader({ alg: JWT_ALG })
      .setSubject('user-789')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(TEST_SECRET));
    await expect(verifyJwt(noRole)).rejects.toThrow();
  });

  it('token sai secret bị reject', async () => {
    const token = await signJwt('user-123', 'ADMIN');
    process.env.JWT_SECRET = 'another-secret-32chars-min-99999999';
    await expect(verifyJwt(token)).rejects.toThrow();
  });

  it('thiếu JWT_SECRET -> sign fail (không silent)', async () => {
    delete process.env.JWT_SECRET;
    await expect(signJwt('user-1', 'ADMIN')).rejects.toThrow();
  });

  it('JWT_SECRET < 32 ký tự -> fail (fail-closed)', async () => {
    process.env.JWT_SECRET = 'too-short';
    await expect(signJwt('user-1', 'ADMIN')).rejects.toThrow();
  });
});
