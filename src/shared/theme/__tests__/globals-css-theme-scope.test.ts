/**
 * Static tests for `app/globals.css` [data-theme] block contract (T1C v1.2).
 *
 * Owned by T1C (`hrp-t1c-theme-foundation`).
 * Spec: `v1.2`. Baseline: `aa86902f`.
 *
 * Covers AC-05, AC-06, AC-07, AC-08, AC-09, AC-17 (read-only check of
 * unchanged sections), plus regression guards on the `:root` block (22 decls).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GLOBALS_CSS = resolve(process.cwd(), 'app/globals.css');

let css: string;
beforeAll(() => {
  css = readFileSync(GLOBALS_CSS, 'utf8');
});

describe('app/globals.css — [data-theme] contract (T1C v1.2)', () => {
  // AC-05: 5 [data-theme="..."] selectors, each setting 5 brand tokens
  it('AC-05: có đúng 5 selector [data-theme="..."]', () => {
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]\s*\{([^}]*)\}/g;
    const matches = [...css.matchAll(re)];
    const keys = matches.map((m) => m[1]).sort();
    expect(keys).toEqual([
      'emerald-growth',
      'executive-gold',
      'hrp',
      'ocean-trust',
      'violet-future',
    ]);
  });

  it('AC-05: mỗi selector override đúng 5 brand token (primary, primary-dark, primary-soft, primary-container, on-primary-container)', () => {
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]\s*\{([^}]*)\}/g;
    const requiredTokens = [
      '--color-primary',
      '--color-primary-dark',
      '--color-primary-soft',
      '--color-primary-container',
      '--color-on-primary-container',
    ];
    for (const m of css.matchAll(re)) {
      const body = m[2]!;
      for (const tok of requiredTokens) {
        expect(body, `[data-theme="${m[1]}"] missing ${tok}`).toMatch(new RegExp(tok + ':\\s*#[0-9a-f]{6}\\s*;'));
      }
    }
  });

  it('AC-05: không có selector [data-theme] thừa (chỉ 5 key đã chốt)', () => {
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]/g;
    const keys = [...new Set([...css.matchAll(re)].map((m) => m[1]))].sort();
    expect(keys).toEqual([
      'emerald-growth',
      'executive-gold',
      'hrp',
      'ocean-trust',
      'violet-future',
    ]);
  });

  // AC-06: [data-theme] placed AFTER :root (line 189-211) and BEFORE .material-symbols-outlined (line 217)
  // Note: line numbers shift after v1.2 added ~52 new lines. We assert by
  // structural position (data-theme block comes after `:root` and before the
  // Material Symbols comment) rather than exact lines, so this test is stable
  // against comment edits.
  it('AC-06: [data-theme] block placed AFTER :root alias block', () => {
    const rootEnd = css.indexOf('}', css.indexOf(':root') + ':root'.length);
    expect(rootEnd).toBeGreaterThan(0);
    const dataThemeStart = css.indexOf("[data-theme='hrp']");
    expect(dataThemeStart).toBeGreaterThan(rootEnd);
  });

  it('AC-06: [data-theme] block placed BEFORE .material-symbols-outlined', () => {
    const dataThemeEnd = css.indexOf('}', css.indexOf("[data-theme='executive-gold']"));
    expect(dataThemeEnd).toBeGreaterThan(0);
    const matSymStart = css.indexOf('.material-symbols-outlined');
    expect(matSymStart).toBeGreaterThan(dataThemeEnd);
  });

  it('AC-06: [data-theme] block placed BEFORE Theme overrides comment ends (i.e. selectors sit in the dedicated block)', () => {
    const start = css.indexOf('Theme overrides — `[data-theme="<key>"]` blocks');
    const end = css.indexOf('Material Symbols Outlined — display class');
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const dataThemeStart = css.indexOf("[data-theme='hrp']");
    expect(dataThemeStart).toBeGreaterThan(start);
    expect(dataThemeStart).toBeLessThan(end);
  });

  it('AC-05: [data-theme="hrp"] idempotent với :root (cùng giá trị)', () => {
    const re = /\[data-theme=['"]hrp['"]?\]\s*\{([^}]*)\}/;
    const m = css.match(re);
    expect(m).not.toBeNull();
    const body = m![1]!;
    // Idempotent với :root cho 5 brand token
    expect(body).toMatch(/--color-primary:\s*#f26522\s*;/);
    expect(body).toMatch(/--color-primary-dark:\s*#a63b00\s*;/);
    expect(body).toMatch(/--color-primary-soft:\s*#fff0e5\s*;/);
    expect(body).toMatch(/--color-primary-container:\s*#fde6d8\s*;/);
    expect(body).toMatch(/--color-on-primary-container:\s*#1f2937\s*;/);
  });

  // AC-07: no dark mode
  it('AC-07: không có @media (prefers-color-scheme)', () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
  });

  it('AC-07: không có class .dark', () => {
    expect(css).not.toMatch(/\.dark\b/);
  });

  // AC-08: .hrp-btn-apply dùng --color-apply-cta (T1A migrated từ --color-primary-cta)
  // Token cũ --color-primary-cta giữ nguyên (alias ngược) để không vỡ site cũ.
  it('AC-08: .hrp-btn-apply dùng var(--color-primary-dark) (T1A cascade-hotfix migrated)', () => {
    // T1A cta-theme-cascade-hotfix: dùng TRỰC TIẾP var(--color-primary-dark) trong
    // property value (lazy resolution tại scope áp dụng) thay vì alias
    // --color-apply-cta ở :root (early resolution, bị freeze HRP dark).
    // Token --color-apply-cta vẫn còn ở :root cho backward compat.
    expect(css).toMatch(/--color-apply-cta:\s*var\(--color-primary-dark\)/);
    expect(css).toMatch(/--color-primary-cta:\s*#[0-9a-f]{6}/);
    // Khối .hrp-btn-apply sử dụng var(--color-primary-dark) TRỰC TIẾP
    const m = css.match(/\.hrp-btn-apply\s*\{[^}]*\}/);
    if (m) {
      expect(m[0]).toMatch(/var\(--color-primary-dark\)/);
      // Regression guard: KHÔNG được reference --color-apply-cta trong .hrp-btn-apply
      // (tránh tái diễn pitfall early resolution).
      expect(m[0]).not.toMatch(/--color-apply-cta/);
    }
  });

  it('AC-08: --color-primary-cta* và --color-apply-cta* không bị override trong [data-theme] block', () => {
    // T1A: cả 4 token CTA (cũ + mới) không được override trong [data-theme].
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]\s*\{([^}]*)\}/g;
    for (const m of css.matchAll(re)) {
      expect(m[2], `[data-theme="${m[1]}"] should not override --color-apply-cta*`).not.toMatch(/--color-apply-cta/);
      expect(m[2], `[data-theme="${m[1]}"] should not override --color-primary-cta*`).not.toMatch(/--color-primary-cta/);
    }
  });

  // AC-09 (post-T1B): .apply-btn và .pub-btn-primary đã migrate sang --color-primary-dark
  it('AC-09: .apply-btn dùng --color-primary-dark bg (T1B-migrated)', () => {
    const m = css.match(/\.apply-btn\s*\{[^}]*\}/);
    if (m) {
      expect(m[0]).toMatch(/var\(--color-primary-dark\)/);
    }
  });

  it('AC-09: .pub-btn-primary dùng --color-primary-dark bg (T1B-migrated)', () => {
    const m = css.match(/\.pub-btn-primary\s*\{[^}]*\}/);
    if (m) {
      expect(m[0]).toMatch(/var\(--color-primary-dark\)/);
    }
  });

  // AC-17: 6 T1B-owned sites không bị T1C sửa
  it('AC-17: .hrp-btn-apply block vẫn là CSS gốc (không có [data-theme] override)', () => {
    // Đảm bảo .hrp-btn-apply không nằm trong bất kỳ [data-theme] nào
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]\s*\{[^}]*\.hrp-btn-apply[^}]*\}/g;
    expect([...css.matchAll(re)]).toHaveLength(0);
  });

  it('AC-17: .apply-btn không bị override trong [data-theme] (T1B sẽ migrate)', () => {
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]\s*\{[^}]*\.apply-btn[^}]*\}/g;
    expect([...css.matchAll(re)]).toHaveLength(0);
  });

  it('AC-17: .pub-btn-primary không bị override trong [data-theme] (T1B sẽ migrate)', () => {
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]\s*\{[^}]*\.pub-btn-primary[^}]*\}/g;
    expect([...css.matchAll(re)]).toHaveLength(0);
  });

  // Regression: :root alias block vẫn còn nguyên vẹn (22 decls)
  it('regression: :root alias block vẫn có 22 khai báo, mọi giá trị là var(--color-...)', () => {
    // Strip comments
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Match :root { ... } block
    const re = /:root\s*\{([^{}]*)\}/;
    const m = stripped.match(re);
    expect(m).not.toBeNull();
    const decls = m![1]!.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    expect(decls).toHaveLength(22);
    for (const d of decls) {
      expect(d).toMatch(/^--[a-z0-9-]+:\s*var\(--color-[a-z0-9-]+\);$/);
    }
  });

  // RQ-10: T1C không override status colors trong [data-theme]
  it('RQ-10: status colors không bị override trong [data-theme]', () => {
    const statusTokens = [
      '--color-success',
      '--color-error',
      '--color-warning',
      '--color-warning-soft',
      '--color-success-soft',
    ];
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]\s*\{([^}]*)\}/g;
    for (const m of css.matchAll(re)) {
      for (const tok of statusTokens) {
        expect(m[2], `[data-theme="${m[1]}"] should not override ${tok}`).not.toContain(tok);
      }
    }
  });

  // RQ-11: T1C không thêm token mới ngoài 5 brand token trong [data-theme]
  // Lưu ý: T1A cta-theme-cascade-hotfix giữ --color-apply-cta* ở :root làm alias
  // ngược (backward compat); KHÔNG override trong [data-theme]. Set allowlist
  // không cần mở rộng vì rule này kiểm tra [data-theme] block, không phải :root.
  it('RQ-11: [data-theme] chỉ override 5 brand token, không thêm token mới', () => {
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]\s*\{([^}]*)\}/g;
    const allowed = new Set([
      '--color-primary',
      '--color-primary-dark',
      '--color-primary-soft',
      '--color-primary-container',
      '--color-on-primary-container',
    ]);
    for (const m of css.matchAll(re)) {
      const decls = m[2]!.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      for (const d of decls) {
        const tokenMatch = d.match(/^(--[a-z0-9-]+):/);
        if (!tokenMatch) continue;
        expect(allowed, `[data-theme="${m[1]}"] has unexpected token ${tokenMatch[1]}`).toContain(tokenMatch[1]);
      }
    }
  });
});
