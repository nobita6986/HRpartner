/**
 * api-boundary.static.test.ts — V5-M1-06a / RQ-07 / STEP-06 / AC-08
 *                             — mở rộng V5-M1-06b / RQ-10 / STEP-06
 *                             — mở rộng V5-M1-06c / RQ-01 / RQ-08 / STEP-01 / AC-01 / AC-08.
 *
 * GATE KIẾN TRÚC TĨNH (chạy THẬT, không cần DB): quét mọi `route.ts` dưới các thư
 * mục nghiệp vụ (M1-06a: `admin/**`, `ctv/**`; M1-06b: `worker/**`, `workers/**`,
 * `vendor/**`, `vendors/**`, `cron/**`; M1-06c: `auth/**`, `statements/**`,
 * `projects/**`, `clients/**`, `payroll/**`, `jobs/**`, `public/**`, `push/**`),
 * chứng minh KHÔNG route nào chạy business model op TRỰC TIẾP trên raw PrismaClient
 * (client lấy từ `getPrisma()`). Mọi truy cập DB phải đi qua boundary
 * (`withAuthorizedDb`/`withDbContext`/`withSystemDb`) — model op chỉ được phép trên
 * `tx` (callback client đã scope), KHÔNG trên raw client.
 *
 * Pattern hệ thống hợp lệ (KHÔNG bị bắt vì raw client chỉ là ĐỐI SỐ, không nhận
 * model-op): `withSystemDb(prisma, SYSTEM_CRON, cb)`, `drainOutboxOnce(prisma, ...)`,
 * `probeWorkerDuplicateByPhone(prisma, phone)`, `calculateMargin(tx, ...)`. Route
 * public (jobs/public) dùng `prisma.$transaction((tx) => svc(tx))` (SECURITY DEFINER /
 * NO_DB intent) — `$transaction` KHÔNG bị bắt. Login pre-auth dùng
 * `prisma.$transaction` + `tx.$executeRaw` set GUC (không có AuthContext).
 *
 * Cơ chế phát hiện (fail-closed):
 *   1. Strip block/line comment + string để không match ví dụ trong doc.
 *   2. Tìm mọi identifier bound từ `getPrisma()` (vd `const prisma = getPrisma()`).
 *   3. Cấm `<rawId>.<model>.<op>(` và `getPrisma().<model>.<op>(` với op ∈ ALL_OPS.
 *      (`<rawId>.$transaction/$extends/$queryRaw` KHÔNG bị cấm — `$` không phải \w.)
 *
 * NEGATIVE FIXTURE (bắt buộc RQ-07/RQ-10): đoạn code cố tình bypass boundary phải làm
 * detector trả về vi phạm — chứng minh gate có RĂNG, không phải luôn xanh.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SCOPE_DIRS = [
  join(ROOT, 'app/api/admin'),
  join(ROOT, 'app/api/ctv'),
  join(ROOT, 'app/api/worker'),
  join(ROOT, 'app/api/workers'),
  join(ROOT, 'app/api/vendor'),
  join(ROOT, 'app/api/vendors'),
  join(ROOT, 'app/api/cron'),
  // V5-M1-06c / RQ-01 / STEP-01: 8 route root con lai duoc dua qua boundary.
  join(ROOT, 'app/api/auth'),
  join(ROOT, 'app/api/statements'),
  join(ROOT, 'app/api/projects'),
  join(ROOT, 'app/api/clients'),
  join(ROOT, 'app/api/payroll'),
  join(ROOT, 'app/api/jobs'),
  join(ROOT, 'app/api/public'),
  join(ROOT, 'app/api/push'),
];

// Prisma model operations (read + write). Superset an toàn.
const ALL_OPS = [
  'findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'findFirstOrThrow',
  'count', 'aggregate', 'groupBy',
  'create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'upsert',
  'delete', 'deleteMany',
];
const OPS_ALT = ALL_OPS.join('|');

/** Xoá comment + string literal để chỉ còn code thực thi. */
function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comment
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``') // template literal
    .replace(/'(?:\\.|[^'\\])*'/g, "''") // single-quoted
    .replace(/"(?:\\.|[^"\\])*"/g, '""') // double-quoted
    .replace(/\/\/.*$/gm, ' '); // line comment (sau khi string đã bị xoá)
}

/**
 * Trả về danh sách vi phạm (chuỗi rỗng = sạch). Một vi phạm = business model op
 * chạy thẳng trên raw client thay vì trên `tx` của boundary.
 */
export function detectRawClientBusinessOps(rawSource: string): string[] {
  const code = strip(rawSource);
  const violations: string[] = [];

  // (1) identifier bound từ getPrisma()
  const ids = new Set<string>();
  for (const m of code.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*getPrisma\s*\(\s*\)/g)) {
    ids.add(m[1]);
  }

  // (2) `<rawId>.<model>.<op>(`
  for (const id of ids) {
    const re = new RegExp(`\\b${id}\\s*\\.\\s*\\w+\\s*\\.\\s*(?:${OPS_ALT})\\s*\\(`, 'g');
    for (const m of code.matchAll(re)) violations.push(m[0].trim());
  }

  // (3) inline `getPrisma().<model>.<op>(`
  const inlineRe = new RegExp(`getPrisma\\s*\\(\\s*\\)\\s*\\.\\s*\\w+\\s*\\.\\s*(?:${OPS_ALT})\\s*\\(`, 'g');
  for (const m of code.matchAll(inlineRe)) violations.push(m[0].trim());

  return violations;
}

/** Liệt kê đệ quy mọi route.ts dưới một thư mục. */
function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // thư mục không tồn tại → bỏ qua (không phá gate)
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...collectRouteFiles(full));
    } else if (name === 'route.ts') {
      out.push(full);
    }
  }
  return out;
}

describe('API boundary — STATIC gate (RQ-07 / AC-08)', () => {
  const files = SCOPE_DIRS.flatMap(collectRouteFiles);

  it('tìm thấy tập route.ts trong scope (sanity — gate không rỗng)', () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  // V5-M1-06c / AC-01: chứng minh 8 route root mới THỰC SỰ nằm trong tập quét
  // (không chỉ khai báo SCOPE_DIRS mà thư mục rỗng/sai path → false-green).
  it('phủ đủ route root M1-06c (auth/statements/projects/clients/payroll/jobs/public/push)', () => {
    const rel = files.map((f) => f.replace(ROOT, '').replace(/\\/g, '/'));
    const mustCover = [
      '/app/api/auth/login/route.ts',
      '/app/api/statements/margin/route.ts',
      '/app/api/projects/route.ts',
      '/app/api/clients/route.ts',
      '/app/api/payroll/route.ts',
      '/app/api/push/subscribe/route.ts',
    ];
    for (const p of mustCover) {
      expect(rel, `static gate phải quét ${p}`).toContain(p);
    }
  });

  it('KHÔNG route nghiệp vụ nào chạy business model op trên raw client', () => {
    const offenders: Record<string, string[]> = {};
    for (const f of files) {
      const v = detectRawClientBusinessOps(readFileSync(f, 'utf8'));
      if (v.length) offenders[f.replace(ROOT, '').replace(/\\/g, '/')] = v;
    }
    // Thông điệp lỗi liệt kê chính xác file + snippet vi phạm nếu có.
    expect(offenders).toEqual({});
  });

  // ── NEGATIVE FIXTURES — gate phải BẮT được các kiểu bypass ──────────────────
  it('NEGATIVE: raw `prisma.<model>.findMany()` (client từ getPrisma) bị bắt', () => {
    const bypass = `
      import { getPrisma } from '@/src/lib/db';
      export async function GET() {
        const prisma = getPrisma();
        return prisma.commissionLedger.findMany({ where: {} });
      }`;
    expect(detectRawClientBusinessOps(bypass)).not.toEqual([]);
  });

  it('NEGATIVE: inline `getPrisma().<model>.create()` bị bắt', () => {
    const bypass = `export async function POST() {
      return getPrisma().ctvWithdrawalRequest.create({ data: {} });
    }`;
    expect(detectRawClientBusinessOps(bypass)).not.toEqual([]);
  });

  it('POSITIVE: model op trên `tx` của boundary KHÔNG bị bắt', () => {
    const ok = `
      const prisma = getPrisma();
      const rows = await withAuthorizedDb(prisma, ctx, (tx) =>
        tx.sourceClaim.findMany({ where: { ctvId: ctx.userId } }),
      );
      const one = await withDbContext(prisma, ctx, (tx) => tx.user.findFirst({}));`;
    expect(detectRawClientBusinessOps(ok)).toEqual([]);
  });

  it('POSITIVE: truyền raw client làm ĐỐI SỐ boundary (prisma, ...) KHÔNG bị bắt', () => {
    const ok = `
      const prisma = getPrisma();
      await withDbContext(prisma, ctx, (tx) => svc(tx));
      await prisma.$transaction(async (tx) => tx.$executeRawUnsafe('SELECT 1'));`;
    expect(detectRawClientBusinessOps(ok)).toEqual([]);
  });

  // ── M1-06b: fixtures cho cron + boundary hệ thống (RQ-10) ───────────────────
  it('NEGATIVE: cron route chạy op raw trên client (getPrisma) bị bắt', () => {
    const bypass = `
      import { getPrisma } from '@/src/lib/db';
      export async function GET() {
        const prisma = getPrisma();
        return prisma.vendorStatement.updateMany({ where: { status: 'SENT' }, data: {} });
      }`;
    expect(detectRawClientBusinessOps(bypass)).not.toEqual([]);
  });

  it('POSITIVE: cron truyền raw client cho withSystemDb / drainOutboxOnce KHÔNG bị bắt', () => {
    const ok = `
      const prisma = getPrisma();
      const r = await withSystemDb(prisma, SYSTEM_CRON, (tx) => autoConfirmExpiredStatements(tx, new Date()));
      const d = await drainOutboxOnce(prisma, handlers, { batchSize: 50 });`;
    expect(detectRawClientBusinessOps(ok)).toEqual([]);
  });

  it('POSITIVE: repo dedup đặc quyền nhận raw client làm ĐỐI SỐ KHÔNG bị bắt', () => {
    const ok = `
      const prisma = getPrisma();
      const dedup = await probeWorkerDuplicateByPhone(prisma, parsed.data.phone);`;
    expect(detectRawClientBusinessOps(ok)).toEqual([]);
  });

  // ── M1-06c: fixtures cho 8 route root còn lại (RQ-01 / RQ-08 / AC-08) ────────
  it('NEGATIVE: clients raw `prisma.clientCompany.findMany()` bị bắt', () => {
    const bypass = `
      const prisma = getPrisma();
      const rows = await prisma.clientCompany.findMany({ where: {} });`;
    expect(detectRawClientBusinessOps(bypass)).not.toEqual([]);
  });

  it('NEGATIVE: payroll raw `prisma.payrollConfig.findMany()` bị bắt', () => {
    const bypass = `
      const prisma = getPrisma();
      const rows = await prisma.payrollConfig.findMany({ where: {} });`;
    expect(detectRawClientBusinessOps(bypass)).not.toEqual([]);
  });

  it('NEGATIVE: push raw `prisma.pushSubscription.upsert()` bị bắt', () => {
    const bypass = `
      const prisma = getPrisma();
      await prisma.pushSubscription.upsert({ where: {}, create: {}, update: {} });`;
    expect(detectRawClientBusinessOps(bypass)).not.toEqual([]);
  });

  it('NEGATIVE: auth/login raw `prisma.user.findFirst()` bị bắt', () => {
    const bypass = `
      const prisma = getPrisma();
      const user = await prisma.user.findFirst({ where: { phone } });`;
    expect(detectRawClientBusinessOps(bypass)).not.toEqual([]);
  });

  it('NEGATIVE: projects inline `getPrisma().project.create()` bị bắt', () => {
    const bypass = `export async function POST() {
      return getPrisma().project.create({ data: {} });
    }`;
    expect(detectRawClientBusinessOps(bypass)).not.toEqual([]);
  });

  it('POSITIVE: login pre-auth `prisma.$transaction` + `tx.user.findFirst` KHÔNG bị bắt', () => {
    const ok = `
      const prisma = getPrisma();
      const user = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw\`SELECT set_config('app.role', 'ADMIN', true)\`;
        return tx.user.findFirst({ where: { phone } });
      });`;
    expect(detectRawClientBusinessOps(ok)).toEqual([]);
  });

  it('POSITIVE: margin `withDbContext(prisma, ctx, (tx) => calculateMargin(tx, ...))` KHÔNG bị bắt', () => {
    const ok = `
      const prisma = getPrisma();
      const margin = await withDbContext(prisma, ctx, (tx) => calculateMargin(tx, ctx, month, year));`;
    expect(detectRawClientBusinessOps(ok)).toEqual([]);
  });
});
