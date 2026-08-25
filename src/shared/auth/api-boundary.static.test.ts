/**
 * api-boundary.static.test.ts — V5-M1-06a / RQ-07 / STEP-06 / AC-08
 *
 * GATE KIẾN TRÚC TĨNH (chạy THẬT, không cần DB): quét mọi `route.ts` dưới
 * `app/api/admin/**` và `app/api/ctv/**`, chứng minh KHÔNG route nào chạy business
 * model op TRỰC TIẾP trên raw PrismaClient (client lấy từ `getPrisma()`). Mọi truy
 * cập DB phải đi qua boundary (`withAuthorizedDb`/`withDbContext`) — model op chỉ
 * được phép trên `tx` (callback client đã scope), KHÔNG trên raw client.
 *
 * Cơ chế phát hiện (fail-closed):
 *   1. Strip block/line comment + string để không match ví dụ trong doc.
 *   2. Tìm mọi identifier bound từ `getPrisma()` (vd `const prisma = getPrisma()`).
 *   3. Cấm `<rawId>.<model>.<op>(` và `getPrisma().<model>.<op>(` với op ∈ ALL_OPS.
 *      (`<rawId>.$transaction/$extends/$queryRaw` KHÔNG bị cấm — `$` không phải \w.)
 *
 * NEGATIVE FIXTURE (bắt buộc RQ-07): một đoạn code cố tình bypass boundary phải làm
 * detector trả về vi phạm — chứng minh gate có RĂNG, không phải luôn xanh.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SCOPE_DIRS = [join(ROOT, 'app/api/admin'), join(ROOT, 'app/api/ctv')];

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
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it('KHÔNG route admin/ctv nào chạy business model op trên raw client', () => {
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
});
