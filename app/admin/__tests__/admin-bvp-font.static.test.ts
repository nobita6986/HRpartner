/**
 * admin-bvp-font.static.test.ts — T1C admin-ux-hotfix 2 — DEC-07.
 *
 * Lock: admin panel tiếp tục dùng Be Vietnam Pro, KHÔNG đổi font public site.
 *
 *   - `app/admin/**` KHÔNG có inline `font-family: ...` chỉ định non-BVP/non-Inter
 *     (CSS Module scoped @font-face cho icon là ngoại lệ). Style inline phải
 *     inherit từ `body { font-family: var(--font-body) }`.
 *   - `app/layout.tsx` bind `beVietnamPro.variable` + `inter.variable` vào
 *     `className` của `<html>`.
 *   - `app/fonts/local-fonts.tsx` declare `variable: '--font-bvp'` +
 *     `variable: '--font-inter'`.
 *   - `app/globals.css` body font-family vẫn `var(--font-body)`.
 *   - Các public landing pages (`app/page.tsx`, `app/(landing)/**`,
 *     `app/viec-lam/**`) KHÔNG bị đổi.
 *
 * Mục đích: chống drift nếu sau này ai đó ép `font-family: sans-serif` hoặc
 * thêm Google font cho admin. Tái sử dụng pattern `operator-terminology`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ADMIN_FILES = [
  'app/admin/workers/page.tsx',
  'app/admin/workers/[id]/page.tsx',
  'app/admin/workers/[id]/worker-delete-button.tsx',
  'app/admin/workers/[id]/worker-edit-form.tsx',
  'app/admin/workers/[id]/worker-status-form.tsx',
  'app/admin/workers/delete-history/page.tsx',
  'app/admin/labor-profiles/page.tsx',
  'app/admin/labor-profiles/new/page.tsx',
  'app/admin/labor-profiles/[id]/page.tsx',
  'app/admin/vendors/page.tsx',
  'app/admin/clients/page.tsx',
  'app/admin/media/page.tsx',
  'app/admin/media/media-library-client.tsx',
] as const;

const LAYOUT = readFileSync(join(process.cwd(), 'app/layout.tsx'), 'utf8');
const LOCAL_FONTS = readFileSync(join(process.cwd(), 'app/fonts/local-fonts.tsx'), 'utf8');
const GLOBALS_CSS = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

/**
 * Strip JS/TS/CSS comments so a documentation comment that references a
 * forbidden value (or explains the rule) does not get scanned as code.
 */
function stripComments(source: string, ext: 'tsx' | 'css'): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (ext === 'tsx') {
    out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  }
  return out;
}

describe('admin font — Be Vietnam Pro binding', () => {
  it('app/layout.tsx binds beVietnamPro + inter variables', () => {
    expect(LAYOUT).toMatch(/beVietnamPro\b.*\.variable/);
    expect(LAYOUT).toMatch(/inter\b.*\.variable/);
    expect(LAYOUT).toMatch(/\$\{beVietnamPro\.variable\}\s*\$\{inter\.variable\}/);
  });

  it('app/fonts/local-fonts.tsx declares --font-bvp + --font-inter', () => {
    expect(LOCAL_FONTS).toMatch(/variable:\s*['"]--font-bvp['"]/);
    expect(LOCAL_FONTS).toMatch(/variable:\s*['"]--font-inter['"]/);
  });

  it('app/globals.css body font-family inherits var(--font-body)', () => {
    const css = stripComments(GLOBALS_CSS, 'css');
    expect(css).toMatch(/--font-body:\s*var\(--font-bvp\)/);
    // body rule must reference the CSS variable (no hard-coded family).
    expect(css).toMatch(/body\s*\{[^}]*font-family:\s*var\(--font-body\)/);
  });
});

describe('admin pages — no inline font-family override away from BVP/Inter', () => {
  it.each(ADMIN_FILES)('%s does not declare inline font-family', file => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    const code = stripComments(source, 'tsx');
    // Inline `font-family` value with a non-BVP/non-Inter/non-CSS-var name is forbidden.
    // Allow `var(--font-*)` (CSS variables) and `'inherit'` only.
    const offenders = code.match(/font-family:\s*['"]([^'"]+)['"]/g) ?? [];
    for (const o of offenders) {
      const m = o.match(/font-family:\s*['"]([^'"]+)['"]/);
      const value = m?.[1] ?? '';
      const allowed =
        value.startsWith('var(--') ||
        value === 'inherit' ||
        // Tailwind font tokens fall through to body font (--font-body) by default.
        value === '' ||
        // Icon font names declared via CSS Module classes are OK if they are Material Symbols only.
        /Material Symbols Outlined/.test(value);
      expect(allowed, `${file} has inline font-family '${value}' — must use var(--font-bvp/--font-inter)`).toBe(true);
    }
  });
});

describe('public site font — baseline inherited from body (BVP)', () => {
  // T1C admin-ux-hotfix 2 — DEC-07: KHÔNG đổi public site font.
  // Không assert rằng public site KHÔNG CÓ font-family trong CSS (vì legacy .pub-*
  // class có `font-family: var(--font-body)`), chỉ cần đảm bảo body font-family
  // binding không bị suy diễn khác đi.
  it('app/globals.css still uses var(--font-body) at root', () => {
    const css = stripComments(GLOBALS_CSS, 'css');
    expect(css).toMatch(/--font-body:\s*var\(--font-bvp\)/);
  });
});