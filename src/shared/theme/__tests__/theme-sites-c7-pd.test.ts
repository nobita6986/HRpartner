/**
 * theme-sites-c7-pd.test.ts — 6 site theme-sensitive dùng --color-primary-dark.
 *
 * Owned by T1B (`hrp-t1b-public-theme-picker-contrast`).
 * Baseline: `2b07d9de`. Spec: `v1.0`.
 *
 * Coverage:
 *   - 4 file .tsx có site: GlobalNavbar desktop+mobile, login-form, ve-chung-toi.
 *   - 2 class CSS: .apply-btn, .pub-btn-primary.
 *   - Probe: white-on-PD contrast >= 4.5:1 cho 5/5 palette.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEMES, type ThemeKey } from '../theme-types';

const GLOBALS_CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8').replace(
  /\r\n/g,
  '\n',
);
const NAVBAR = readFileSync(
  resolve(process.cwd(), 'app/components/GlobalNavbar.tsx'),
  'utf8',
);
const LOGIN_FORM = readFileSync(
  resolve(process.cwd(), 'app/login/login-form.tsx'),
  'utf8',
);
const VE_CHUNG_TOI = readFileSync(
  resolve(process.cwd(), 'app/(portal)/ve-chung-toi/page.tsx'),
  'utf8',
);

// ─── WCAG 2.x helpers ──────────────────────────────────────────────────────
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error('Invalid hex: ' + hex);
  const r = parseInt(m[1]!, 16);
  const g = parseInt(m[2]!, 16);
  const b = parseInt(m[3]!, 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrast(hex1: string, hex2: string): number {
  const L1 = relativeLuminance(hex1);
  const L2 = relativeLuminance(hex2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('RQ-04: 6 site theme-sensitive dùng --color-primary-dark cho background (AC-14)', () => {
  it('GlobalNavbar.tsx: nút Đăng ký desktop dùng --color-primary-dark', () => {
    expect(NAVBAR).toContain("'var(--color-primary-dark)'");
    // Không còn inline bg P ở cả 2 site Đăng ký
    expect(NAVBAR).not.toMatch(/Đăng ký[\s\S]{0,200}var\(--color-primary\)/);
  });

  it('GlobalNavbar.tsx: nút Đăng ký mobile dùng --color-primary-dark', () => {
    // Verify cả desktop và mobile đều có var(--color-primary-dark) trong style
    const darkCount = (NAVBAR.match(/var\(--color-primary-dark\)/g) ?? []).length;
    // Ít nhất 2 lần xuất hiện (desktop + mobile). Có thể nhiều hơn nếu site khác.
    expect(darkCount).toBeGreaterThanOrEqual(2);
  });

  it('login-form.tsx: nút Đăng nhập dùng --color-primary-dark', () => {
    expect(LOGIN_FORM).toContain('var(--color-primary-dark)');
    expect(LOGIN_FORM).not.toMatch(/var\(--color-primary\)/);
  });

  it('ve-chung-toi page: nút Xem việc làm dùng --color-primary-dark', () => {
    expect(VE_CHUNG_TOI).toContain('var(--color-primary-dark)');
    // Block Xem việc làm không còn var(--color-primary)
    const xemBlock = VE_CHUNG_TOI.match(/Xem việc làm[\s\S]{0,400}ve-chung-toi/);
    if (xemBlock) {
      expect(xemBlock[0]).not.toMatch(/var\(--color-primary\)/);
    }
  });

  it('.apply-btn CSS dùng --color-primary-dark', () => {
    const m = GLOBALS_CSS.match(/\.apply-btn\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toContain('var(--color-primary-dark)');
    expect(m![0]).not.toMatch(/background: var\(--color-primary\)/);
  });

  it('.pub-btn-primary CSS dùng --color-primary-dark', () => {
    const m = GLOBALS_CSS.match(/\.pub-btn-primary\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toContain('var(--color-primary-dark)');
    expect(m![0]).not.toMatch(/background: var\(--color-primary\)/);
  });

  it('6 site KHÔNG còn var(--color-primary) cho background primary buttons', () => {
    // Block nút Đăng ký / Đăng nhập / Xem việc làm không còn P bg
    expect(NAVBAR).not.toMatch(/Đăng ký[\s\S]{0,300}backgroundColor.*var\(--color-primary\)/);
    expect(LOGIN_FORM).not.toMatch(/Đăng nhập[\s\S]{0,300}background.*var\(--color-primary\)/);
    expect(VE_CHUNG_TOI).not.toMatch(/Xem việc làm[\s\S]{0,300}backgroundColor.*var\(--color-primary\)/);
  });
});

describe('RQ-04: probe white-on-PD >= 4.5:1 ở 5/5 palette (AC-15)', () => {
  const expected: Array<[ThemeKey, number]> = [
    ['hrp', 6.468],
    ['ocean-trust', 9.647],
    ['emerald-growth', 8.272],
    ['violet-future', 12.438],
    ['executive-gold', 8.577],
  ];
  for (const [key, exp] of expected) {
    it(`${key}: white on PD = ${exp}:1 (>= 4.5:1)`, () => {
      const t = THEMES.find((x) => x.key === key)!;
      const r = contrast(t.tokens.onPrimary, t.tokens.primaryDark);
      expect(r).toBeGreaterThanOrEqual(4.5);
      expect(r).toBeCloseTo(exp, 1);
    });
  }
});
