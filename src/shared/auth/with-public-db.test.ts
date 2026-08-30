/**
 * with-public-db.test.ts — V5-go-live-04 / RQ-04, RQ-05, RQ-07 / STEP-02 / AC-05, AC-09.
 *
 * Test đơn vị trên `tx` giả — KHÔNG chạm DB (unit lane). Đây là hàng rào chặn hồi quy:
 * ai bỏ GUC, đổi `'MKT'` thành `'ADMIN'`, bỏ read-only, hay bọc try/catch nuốt lỗi
 * thành mảng rỗng thì test này ĐỎ.
 */
import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PUBLIC_READ_ONLY_GUC, PUBLIC_READ_PRINCIPAL, withPublicDb } from './with-public-db';

type RawCall = { sql: string; args: unknown[] };

/** `tx` giả ghi lại mọi câu raw; `failOn` mô phỏng Postgres từ chối một câu cụ thể. */
function makeFake(failOn?: string) {
  const calls: RawCall[] = [];
  const tx = {
    $executeRawUnsafe: vi.fn(async (sql: string, ...args: unknown[]) => {
      calls.push({ sql, args });
      if (failOn && sql.includes(failOn)) throw new Error(`ERROR: cannot set ${failOn}`);
      return 1;
    }),
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
  };
  return { prisma: prisma as unknown as PrismaClient, tx, calls };
}

const gucArg = (calls: RawCall[], key: string) =>
  calls.find((c) => c.sql.includes(`'${key}'`))?.args[0];

describe('withPublicDb — principal đọc công khai (DEC-01/DEC-03/DEC-08)', () => {
  it('đặt read-only + đủ 4 GUC, tất cả transaction-local', async () => {
    const fake = makeFake();
    const out = await withPublicDb(fake.prisma, async () => 'ok');

    expect(out).toBe('ok');
    expect(fake.calls).toHaveLength(5);
    for (const key of ['app.user_id', 'app.role', 'app.vendor_id', 'app.worker_id']) {
      expect(fake.calls.some((c) => c.sql.includes(`'${key}'`)), key).toBe(true);
    }
    // is_local = true trên MỌI câu: CẤM GUC session-global, CẤM set_config(..., false).
    for (const c of fake.calls) {
      expect(c.sql, c.sql).toMatch(/,\s*true\)/);
      expect(c.sql, c.sql).not.toMatch(/,\s*false\)/);
      expect(c.sql, c.sql).not.toMatch(/SET\s+ROLE/i);
    }
  });

  it('read-only là câu ĐẦU TIÊN của transaction (tránh bẫy thứ tự 25001)', async () => {
    const fake = makeFake();
    await withPublicDb(fake.prisma, async () => null);

    expect(fake.calls[0].sql).toContain(PUBLIC_READ_ONLY_GUC);
    expect(fake.calls[0].sql).toContain("'on'");
    expect(fake.calls.findIndex((c) => c.sql.includes(PUBLIC_READ_ONLY_GUC))).toBe(0);
  });

  it("app.role đúng 'MKT' và KHÔNG BAO GIỜ 'ADMIN' (DEC-02)", async () => {
    const fake = makeFake();
    await withPublicDb(fake.prisma, async () => null);

    expect(PUBLIC_READ_PRINCIPAL.role).toBe('MKT');
    expect(gucArg(fake.calls, 'app.role')).toBe('MKT');
    // ADMIN khớp nhánh đầu của hrp_project_visible_for ⇒ khách vô danh thấy cả dự án
    // chưa publish. Không được xuất hiện ở bất kỳ đâu trong đường đọc công khai.
    expect(JSON.stringify(fake.calls)).not.toContain('ADMIN');
    expect(JSON.stringify(PUBLIC_READ_PRINCIPAL)).not.toContain('ADMIN');
  });

  it("app.user_id là hằng dạng 'system:' nói rõ mục đích (RQ-04)", async () => {
    const fake = makeFake();
    await withPublicDb(fake.prisma, async () => null);

    expect(PUBLIC_READ_PRINCIPAL.userId.startsWith('system:')).toBe(true);
    expect(gucArg(fake.calls, 'app.user_id')).toBe(PUBLIC_READ_PRINCIPAL.userId);
    expect(gucArg(fake.calls, 'app.vendor_id')).toBe('');
    expect(gucArg(fake.calls, 'app.worker_id')).toBe('');
  });

  it('callback nhận đúng tx của transaction, sau khi GUC đã set', async () => {
    const fake = makeFake();
    const seen = await withPublicDb(fake.prisma, async (tx) => ({
      tx,
      callsWhenCalled: fake.calls.length,
    }));

    expect(seen.tx).toBe(fake.tx);
    expect(seen.callsWhenCalled).toBe(5);
    expect(fake.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('lỗi khi set GUC được NÉM RA, không bị nuốt thành danh sách rỗng', async () => {
    const fake = makeFake('app.role');
    const cb = vi.fn(async () => ({ jobs: [], total: 0 }));

    await expect(withPublicDb(fake.prisma, cb)).rejects.toThrow(/cannot set app\.role/);
    expect(cb).not.toHaveBeenCalled();
  });

  it('lỗi khi set read-only cũng NÉM RA và dừng trước cả GUC (DEC-03)', async () => {
    const fake = makeFake(PUBLIC_READ_ONLY_GUC);
    const cb = vi.fn(async () => null);

    await expect(withPublicDb(fake.prisma, cb)).rejects.toThrow(/cannot set transaction_read_only/);
    expect(fake.calls).toHaveLength(1);
    expect(cb).not.toHaveBeenCalled();
  });
});
