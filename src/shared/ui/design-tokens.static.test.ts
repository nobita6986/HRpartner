/**
 * design-tokens.static.test.ts — V5-go-live-10 / RQ-04/RQ-05 / STEP-02/STEP-03 / AC-01/AC-03/AC-04.
 *
 * GATE TĨNH cho LỚP TOKEN (chạy THẬT, không cần DB, đọc file thay vì tin lời văn).
 *
 * Lớp lỗi được chốt: `app/globals.css` khai token CHỈ dưới dạng có tiền tố họ, trong khối
 * `@theme` của Tailwind v4 (`--color-surface`), còn 21 file `.tsx` gọi đúng những tên đó
 * KHÔNG tiền tố (`var(--surface)`). Theo chuẩn CSS, `var()` trỏ tới custom property không
 * tồn tại làm CẢ khai báo trở thành invalid-at-computed-value-time: `background-color` rơi
 * về `initial` là TRONG SUỐT, còn shorthand `border-bottom` rơi về `none` là MẤT VẠCH KẺ.
 * Một nguyên nhân đó giải thích cả popup trong suốt, bảng phẳng và nút trắng-trên-trắng.
 *
 * Vì sao tập "đã định nghĩa" có HAI nguồn chứ không phải một: `--font-bvp` và `--font-inter`
 * KHÔNG do CSS khai mà do `next/font` bơm vào DOM qua `variable: '--font-bvp'`
 * (`app/layout.tsx`, `app/bod/page.tsx`), materialise trên chính element mang
 * `beVietnamPro.variable`. Chúng hợp lệ lúc chạy dù không có trong `globals.css`, và KHÔNG
 * được thêm vào `globals.css`: `--font-head`/`--font-body`/`--font-label` đang THAM CHIẾU
 * chúng, khai lại là tạo vòng và đè lên font thật. Nên tập tên = khai báo trong
 * `app/globals.css` HỢP với các `variable:` đọc từ source. Cả hai nguồn đều do máy đọc từ
 * file; không có allowlist viết tay nào.
 *
 * Không strip comment: cố ý fail-closed. Tên biến chết nằm trong comment vẫn là tên sẽ bị
 * copy ra code thật, nên gate coi là vi phạm.
 *
 * NEGATIVE FIXTURE (RQ-05, bắt buộc): chuỗi cố tình gọi biến không tồn tại phải làm
 * `findUnresolvedVarRefs` trả về vi phạm, và chuỗi gọi biến có thật phải trả về rỗng — gate
 * có RĂNG chứ không phải luôn xanh.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const GLOBALS_CSS = join(ROOT, 'app/globals.css');
const SCAN_DIRS = [join(ROOT, 'app'), join(ROOT, 'src')];

const rel = (p: string) => relative(ROOT, p).split(sep).join('/');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Mọi `--ten:` được KHAI BÁO trong CSS (gồm khối `@theme` và mọi khối `:root`). */
function collectCssDeclaredNames(css: string): Set<string> {
  const names = new Set<string>();
  for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) names.add(m[1]);
  return names;
}

/** Tên do `next/font` bơm vào DOM lúc chạy: `variable: '--font-x'`. */
function collectFontVariableNames(files: string[]): Set<string> {
  const names = new Set<string>();
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(/variable:\s*['"](--[a-zA-Z0-9_-]+)['"]/g)) {
      names.add(m[1]);
    }
  }
  return names;
}

/** Mọi lượt `var(--ten)` mà `--ten` không thuộc tập đã định nghĩa. Bỏ qua fallback. */
function findUnresolvedVarRefs(code: string, defined: ReadonlySet<string>): Array<{ name: string; line: number }> {
  const out: Array<{ name: string; line: number }> = [];
  code.split(/\r?\n/).forEach((text, i) => {
    for (const m of text.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) {
      if (!defined.has(m[1])) out.push({ name: m[1], line: i + 1 });
    }
  });
  return out;
}

const CSS = readFileSync(GLOBALS_CSS, 'utf8');
const TSX_FILES = SCAN_DIRS.flatMap(walk).filter((p) => p.endsWith('.tsx'));
const DEFINED = new Set([...collectCssDeclaredNames(CSS), ...collectFontVariableNames(TSX_FILES)]);

describe('RQ-04/AC-03 — mọi biến CSS mà .tsx gọi đều phân giải được', () => {
  it('không còn lượt var(--ten) nào trỏ tới custom property không tồn tại', () => {
    const violations = TSX_FILES.flatMap((file) =>
      findUnresolvedVarRefs(readFileSync(file, 'utf8'), DEFINED).map(
        (v) => `${rel(file)}:${v.line} var(${v.name})`,
      ),
    );
    expect(violations).toEqual([]);
  });
});

describe('RQ-05/AC-04 — gate có RĂNG, không phải luôn xanh', () => {
  const defined = new Set(['--color-surface']);

  it('NEGATIVE FIXTURE: chuỗi gọi biến không tồn tại bị phát hiện là vi phạm', () => {
    const bad = `<div style={{ background: 'var(--surface-khong-ton-tai)' }} />`;
    const found = findUnresolvedVarRefs(bad, defined);
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('--surface-khong-ton-tai');
  });

  it('ĐỐI CHỨNG DƯƠNG: chuỗi gọi biến có thật không bị báo vi phạm', () => {
    const good = `<div style={{ background: 'var(--color-surface)' }} />`;
    expect(findUnresolvedVarRefs(good, defined)).toEqual([]);
  });
});

describe('RQ-01/RQ-02/AC-01 — khối :root alias', () => {
  const blocks = [...CSS.matchAll(/:root\s*\{([^}]*)\}/g)];

  it('có đúng MỘT khối :root, chứa đúng 22 khai báo, mọi giá trị là var(--color-...)', () => {
    expect(blocks).toHaveLength(1);
    const decls = blocks[0][1]
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('--'));
    expect(decls).toHaveLength(22);
    for (const d of decls) expect(d).toMatch(/^--[a-z0-9-]+:\s*var\(--color-[a-z0-9-]+\);$/);
    // DEC-03: cấm sao chép mã màu — hai nguồn sự thật sẽ lệch âm thầm ở lần đổi brand sau.
    expect(blocks[0][0]).not.toContain('#');
  });

  it('nằm SAU khối @theme và TRƯỚC .material-symbols-outlined (RQ-01)', () => {
    const themeEnd = CSS.indexOf('\n}', CSS.indexOf('@theme'));
    const rootAt = CSS.indexOf(':root');
    expect(themeEnd).toBeGreaterThan(0);
    expect(rootAt).toBeGreaterThan(themeEnd);
    expect(rootAt).toBeLessThan(CSS.indexOf('.material-symbols-outlined'));
  });
});

describe('RQ-11/RQ-12/AC-12/AC-13 — focus ring và reduced-motion', () => {
  it('có :focus-visible toàn cục viền 2px var(--color-primary), offset 2px', () => {
    expect(CSS).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px\s+solid\s+var\(--color-primary\)\s*;/);
    expect(CSS).toMatch(/:focus-visible\s*\{[^}]*outline-offset:\s*2px\s*;/);
  });

  it('phần CSS thuộc task này không dập tắt focus ring bằng outline: none/0', () => {
    // Chốt ở vùng TRƯỚC khối job board tĩnh: `outline: 0` ở dòng sau đó là CSS chết
    // có từ trước, ngoài phạm vi sửa của task, không được dùng nó để bào chữa lẫn nhau.
    const deadCssAt = CSS.indexOf('Public job board');
    expect(deadCssAt).toBeGreaterThan(0);
    const owned = CSS.slice(0, deadCssAt);
    expect(owned).not.toMatch(/outline:\s*(none|0)\s*;/);
  });

  it('@media (prefers-reduced-motion: reduce) đứng SAU các quy tắc nó phủ định (RQ-12)', () => {
    const rmAt = CSS.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(rmAt).toBeGreaterThan(0);
    expect(rmAt).toBeGreaterThan(CSS.indexOf(':focus-visible'));
    expect(rmAt).toBeGreaterThan(CSS.indexOf(':root'));
    expect(rmAt).toBeGreaterThan(CSS.indexOf('@theme'));
  });
});

/**
 * Round 2 (`R2-04`) — hai case này tồn tại vì đúng hai thứ dưới đây ĐÃ TỪNG BIẾN MẤT khỏi
 * `app/globals.css` sau khi round 1 được audit, và không gate nào bắt được: 41 dòng bị hụt,
 * phát hiện thủ công bằng `git diff --stat` ngay trước lúc push (`F-07`). Từ nay mất là FAIL.
 */
describe('R2-01/R2-02 — phần đã từng bị mất phải luôn có mặt', () => {
  /** Thân khối reduced-motion: từ vị trí khối tới hết file, khối này nằm cuối. */
  const rmBody = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
  /** Các cặp `selector { body }` ở một tầng lồng bên trong khối media. */
  const innerRules = [...rmBody.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].replace(/@media[^{]*\{/, '').trim(),
    body: m[2],
  }));

  it('R2-01: khối alias có comment tài liệu ĐI KÈM ngay trước nó', () => {
    const aliasAt = CSS.indexOf('\n:root');
    expect(aliasAt).toBeGreaterThan(0);
    const before = CSS.slice(0, aliasAt);
    const commentAt = before.lastIndexOf('/*');
    const commentEnd = before.lastIndexOf('*/');
    expect(commentAt).toBeGreaterThan(0);
    expect(commentEnd).toBeGreaterThan(commentAt);
    // Kề sát, không phải một comment nào đó ở tít trên file.
    expect(aliasAt - commentEnd).toBeLessThan(8);
    const comment = before.slice(commentAt, commentEnd);
    // Ba điều RQ-01 đòi comment phải nói: task nào, nguyên nhân gốc, hướng dọn dài hạn.
    expect(comment).toContain('go-live-10');
    expect(comment).toMatch(/invalid-at-computed-value-time/);
    expect(comment).toMatch(/tiền tố/);
  });

  it('R2-02: reduced-motion huỷ transform bằng selector CỤ THỂ, không phải dấu sao', () => {
    const cancels = innerRules.filter((r) => /transform:\s*none/.test(r.body));
    expect(cancels.length).toBeGreaterThanOrEqual(1);
    for (const r of cancels) {
      expect(r.selector).not.toBe('*');
      expect(r.selector).toMatch(/[.[:]/);
      expect(r.body).toMatch(/transform:\s*none\s*!important/);
    }
  });

  it('R2-02: KHÔNG được reset transform cho dấu sao — overlay căn giữa bằng translate sẽ lệch tâm', () => {
    const star = innerRules.filter((r) => r.selector === '*');
    for (const r of star) expect(r.body).not.toMatch(/transform\s*:/);
  });

  // Case QUYẾT ĐỊNH của round 2. F-07 hoá ra không phải "mất 41 dòng" mà nặng hơn: khối alias
  // bị dán lệch MỘT dòng, vào giữa comment của Material Symbols, nên toàn bộ 22 alias nằm
  // TRONG một comment CSS và không sinh ra một byte nào trong bundle. Mọi gate cũ vẫn xanh vì
  // regex không hiểu comment, và `collectCssDeclaredNames` cố ý quét cả comment. Từ nay: bóc
  // comment trước, rồi mới đòi khối alias phải còn đó.
  it('R2-04: khối alias phải SỐNG, tức vẫn còn sau khi bóc mọi comment CSS', () => {
    const stripped = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    const live = [...stripped.matchAll(/:root\s*\{([^}]*)\}/g)];
    expect(live).toHaveLength(1);
    const decls = live[0][1]
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('--'));
    expect(decls).toHaveLength(22);
    // Khối reduced-motion và focus ring cũng phải sống, cùng một lý do.
    expect(stripped).toContain('@media (prefers-reduced-motion: reduce)');
    expect(stripped).toContain(':focus-visible');
    expect(stripped).toMatch(/transform:\s*none\s*!important/);
  });
});
