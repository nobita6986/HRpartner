/**
 * response-projection.static.test.ts — V5-M1-09A / RQ-01/12 / STEP-06 / AC-11.
 *
 * GATE TĨNH (chạy THẬT, không cần DB) — CONCERN KHÁC api-boundary.static.test.ts:
 * boundary tĩnh chặn raw DB-op; test này chặn RÒ RỈ RESPONSE (raw model/cache object đi
 * thẳng ra HTTP). Quét allowlist 11 route surface đã khai báo (M1-09A), chứng minh KHÔNG
 * route nào:
 *   (1) `NextResponse.json(<rawIdent>)` — trả thẳng biến raw (row/worker/statement/config/
 *       payslip/record/raw…) KHÔNG qua DTO;
 *   (2) `{...<rawObject>}` / `[...<rawArray>]` — spread NGUYÊN object/array raw vào response.
 *
 * Detector CÓ RĂNG: negative fixture (bare return, object/array spread, cache replay) phải
 * bị BẮT; positive fixture (object-literal DTO, conditional spread `...(cond?{}:{})`,
 * `...stmt.lines.map()`, `...margin`, `[...a,...b]`, shorthand `{ statements }`) KHÔNG bị bắt.
 * Anchor terminator `[,}\]]` phân biệt spread-nguyên-object với truy cập thuộc tính
 * (`...stmt.lines` theo sau `.` → KHÔNG bắt).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// 11 route surface khai báo trong PROJECTION_SURFACES (M1-09A) — allowlist tường minh.
const DECLARED_ROUTES = [
  'app/api/workers/route.ts',
  'app/api/workers/[id]/route.ts',
  'app/api/workers/me/route.ts',
  'app/api/statements/route.ts',
  'app/api/statements/generate/route.ts',
  'app/api/statements/margin/route.ts',
  'app/api/vendor/statements/route.ts',
  'app/api/vendor/statements/[id]/export/route.ts',
  'app/api/webhook/payslip/route.ts',
  'app/api/ctv/withdrawals/route.ts',
  'app/api/payroll/route.ts',
];

// Raw noun (model/cache) KHÔNG được trả thẳng / spread nguyên khối ra response.
const BARE_RE =
  /NextResponse\s*\.\s*json\s*\(\s*(?:statements|statement|workers|worker|records|record|configs|config|payslips|payslip|rows|row|stmts|stmt|raw)\s*[,)]/g;
const SPREAD_RE =
  /\.\.\.\s*(?:statements|statement|workers|worker|records|record|configs|config|payslips|payslip|rows|row|stmts|stmt|raw)\s*[,}\]]/g;

/** Xoá comment + string literal để chỉ còn code thực thi (đồng bộ api-boundary.static). */
function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/\/\/.*$/gm, ' ');
}

/** Trả danh sách vi phạm (rỗng = sạch). */
export function detectRawResponseLeak(rawSource: string): string[] {
  const code = strip(rawSource);
  const violations: string[] = [];
  for (const m of code.matchAll(BARE_RE)) violations.push(m[0].trim());
  for (const m of code.matchAll(SPREAD_RE)) violations.push(m[0].trim());
  return violations;
}

describe('response projection — STATIC gate (AC-11 / RQ-01)', () => {
  it('allowlist = đúng 11 route surface, mọi file TỒN TẠI (sai path → fail, có răng)', () => {
    expect(DECLARED_ROUTES).toHaveLength(11);
    for (const rel of DECLARED_ROUTES) {
      expect(existsSync(join(ROOT, rel)), `route phải tồn tại: ${rel}`).toBe(true);
    }
  });

  it('KHÔNG route khai báo nào rò rỉ raw model/cache ra response', () => {
    const offenders: Record<string, string[]> = {};
    for (const rel of DECLARED_ROUTES) {
      const v = detectRawResponseLeak(readFileSync(join(ROOT, rel), 'utf8'));
      if (v.length) offenders[rel] = v;
    }
    expect(offenders).toEqual({});
  });

  // ── NEGATIVE FIXTURES — detector phải BẮT (không always-green) ────────────────
  it('NEGATIVE: bare `NextResponse.json(worker)` bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json(worker);`)).not.toEqual([]);
  });
  it('NEGATIVE: bare `NextResponse.json(payslip)` (cache replay) bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json(payslip);`)).not.toEqual([]);
  });
  it('NEGATIVE: bare `NextResponse.json(statements)` (raw array) bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json(statements);`)).not.toEqual([]);
  });
  it('NEGATIVE: object spread `{ ...row }` bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json({ ...row });`)).not.toEqual([]);
  });
  it('NEGATIVE: object spread có field bồi `{ ...worker, extra: 1 }` bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json({ ...worker, extra: 1 });`)).not.toEqual([]);
  });
  it('NEGATIVE: array spread `[ ...rows ]` bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json([ ...rows ]);`)).not.toEqual([]);
  });
  it('NEGATIVE: cache replay spread `{ ...payslip }` bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json({ ...payslip });`)).not.toEqual([]);
  });
  it('NEGATIVE: bare `NextResponse.json(config)` bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json(config);`)).not.toEqual([]);
  });
  // ── POSITIVE FIXTURES — pattern hợp lệ KHÔNG được bắt (tránh false-positive) ──
  it('POSITIVE: object-literal DTO `{ worker: projectWorker(row, ctx) }` KHÔNG bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json({ worker: projectWorker(row, ctx) });`)).toEqual([]);
  });
  it('POSITIVE: conditional spread `...(cond ? { totalAmount } : {})` KHÔNG bị bắt', () => {
    expect(detectRawResponseLeak(`const dto = { id, ...(canView ? { totalAmount: x } : {}) };`)).toEqual([]);
  });
  it('POSITIVE: conditional spread `...(cond && { fullName })` KHÔNG bị bắt', () => {
    expect(detectRawResponseLeak(`const data = { ...(fullName !== undefined && { fullName }) };`)).toEqual([]);
  });
  it('POSITIVE: `...stmt.lines.map(...)` (spread MẢNG đã .map) KHÔNG bị bắt', () => {
    expect(detectRawResponseLeak(`const rows = [ header, ...stmt.lines.map((l) => csvRow(l)) ];`)).toEqual([]);
  });
  it('POSITIVE: `...margin` (identifier ngoài raw-set) KHÔNG bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json({ margin: { ...margin, total: t.toString() } });`)).toEqual([]);
  });
  it('POSITIVE: `[ ...vendorSummaries, ...clientSummaries ]` KHÔNG bị bắt', () => {
    expect(detectRawResponseLeak(`const all = [ ...vendorSummaries, ...clientSummaries ];`)).toEqual([]);
  });
  it('POSITIVE: shorthand `{ statements, total }` (đã là DTO) KHÔNG bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json({ statements, total, take, skip });`)).toEqual([]);
  });
  it('POSITIVE: shorthand `{ configs, total }` KHÔNG bị bắt', () => {
    expect(detectRawResponseLeak(`return NextResponse.json({ configs, total, take, skip });`)).toEqual([]);
  });
  it('POSITIVE: spread thuộc tính con `...worker.identityFields` KHÔNG bị bắt', () => {
    expect(detectRawResponseLeak(`const dto = { ...worker.identityFields };`)).toEqual([]);
  });
  it('POSITIVE: raw noun trong COMMENT/STRING (đã strip) KHÔNG bị bắt', () => {
    const src = `// KHÔNG spread raw row
      const msg = 'never NextResponse.json(worker) directly';
      return NextResponse.json({ worker: projected });`;
    expect(detectRawResponseLeak(src)).toEqual([]);
  });
});

