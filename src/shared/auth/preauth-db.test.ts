/**
 * preauth-db.test.ts — V5-M1-06d / RQ-08 / STEP-08 / DEC-13.
 *
 * UNIT: findUserForLogin đóng gói pre-auth read.
 *   - Chạy trong $transaction; set GUC app.role='ADMIN' transaction-local TRƯỚC khi query.
 *   - Projection CỐ ĐỊNH {id, role, isActive, passwordHash} — không select toàn bộ User.
 *   - where theo phone; passthrough kết quả (null nếu không thấy).
 */
import { describe, expect, it, vi } from 'vitest';
import { findUserForLogin } from '@/src/shared/auth/preauth-db';

function maketx() {
  const executeRaw = vi.fn().mockResolvedValue(1);
  const findFirst = vi.fn().mockResolvedValue({ id: 'u1', role: 'WORKER', isActive: true, passwordHash: 'h' });
  const tx = { $executeRaw: executeRaw, user: { findFirst } };
  return { tx, executeRaw, findFirst };
}

describe('findUserForLogin (RQ-08 / DEC-13)', () => {
  it('chạy trong $transaction, set GUC app.role=ADMIN trước, projection cố định', async () => {
    const { tx, executeRaw, findFirst } = maketx();
    const prisma = {
      $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)),
    } as unknown as Parameters<typeof findUserForLogin>[0];

    const user = await findUserForLogin(prisma, '0900000000');

    expect(executeRaw).toHaveBeenCalledTimes(1);
    // GUC set trước khi query user.
    expect(executeRaw.mock.invocationCallOrder[0]).toBeLessThan(findFirst.mock.invocationCallOrder[0]);
    // set_config app.role ADMIN transaction-local — tagged template: mảng chứa 'set_config' + 'app.role'.
    const rawParts = (executeRaw.mock.calls[0][0] as string[]).join('|');
    expect(rawParts).toContain('set_config');
    expect(rawParts).toContain('app.role');
    // Projection cố định — KHÔNG select all.
    const arg = findFirst.mock.calls[0][0] as { where: { phone: string }; select: Record<string, boolean> };
    expect(arg.where).toEqual({ phone: '0900000000' });
    expect(arg.select).toEqual({ id: true, role: true, isActive: true, passwordHash: true });
    expect(user).toMatchObject({ id: 'u1', role: 'WORKER' });
  });

  it('không thấy user → null', async () => {
    const { tx, findFirst } = maketx();
    findFirst.mockResolvedValueOnce(null);
    const prisma = { $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)) } as unknown as Parameters<
      typeof findUserForLogin
    >[0];
    expect(await findUserForLogin(prisma, 'x')).toBeNull();
  });
});
