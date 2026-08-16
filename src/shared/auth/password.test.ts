import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password helpers (bcryptjs — RQ-02)', () => {
  it('hash -> verify roundtrip đúng', async () => {
    const hash = await hashPassword('mat-khau-dung-1');
    expect(hash).not.toBe('mat-khau-dung-1');
    expect(hash.startsWith('$2')).toBe(true);
    expect(await verifyPassword('mat-khau-dung-1', hash)).toBe(true);
  });

  it('login sai mật khẩu bị từ chối', async () => {
    const hash = await hashPassword('mat-khau-dung-1');
    expect(await verifyPassword('mat-khau-sai', hash)).toBe(false);
  });
});
