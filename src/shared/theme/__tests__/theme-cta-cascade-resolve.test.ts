/**
 * theme-cta-cascade-resolve.test.ts — regression runtime test bắt pitfall
 * "early resolution" của CSS custom property substitution.
 *
 * Owned by T1A (`hrp-t1a-cta-theme-cascade-hotfix`).
 * Baseline: `c0d32c8a`. Spec: `v1.0`.
 *
 * Background: trước hotfix này, `.hrp-btn-apply { background-color:
 * var(--color-apply-cta); }` với `--color-apply-cta: var(--color-primary-dark)`
 * ở `:root` bị "đóng băng" thành HRP dark (`#a63b00`) vì CSS spec
 * §substitute-a-var quy định: khi custom property được khai báo với value
 * là TOÀN BỘ `var()`, tham chiếu bên trong được resolve TẠI THỜI ĐIỂM
 * KHAI BÁO (early resolution) tại scope khai báo (`:root`), không lazy.
 *
 * Fix: `.hrp-btn-apply` dùng TRỰC TIẾP `var(--color-primary-dark)` trong
 * property value — `var()` trong property value là LAZY resolution tại scope
 * áp dụng, nên nhận đúng giá trị từ `[data-theme=...]` ancestor.
 *
 * Test này verify 2 lớp:
 *   1. Source contract: rule `.hrp-btn-apply` chứa `var(--color-primary-dark)`
 *      và KHÔNG chứa `var(--color-apply-cta)` (regression guard chống tái diễn).
 *   2. Theme scope: 5 block `[data-theme=...]` set `--color-primary-dark` đúng hex
 *      (sanity check cascade contract giữ nguyên).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GLOBALS_CSS_PATH = resolve(process.cwd(), 'app/globals.css');
const GLOBALS_CSS = readFileSync(GLOBALS_CSS_PATH, 'utf8');

describe('AC-10: regression runtime — .hrp-btn-apply cascade theo theme', () => {
  // Source contract: rule phải dùng var(--color-primary-dark) trực tiếp.
  it('AC-10 source: .hrp-btn-apply rule chứa var(--color-primary-dark) (lazy ref)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply\s*\{[^}]*\}/);
    expect(m, '.hrp-btn-apply rule not found in CSS').not.toBeNull();
    expect(m![0]).toMatch(/var\(--color-primary-dark\)/);
  });

  // Source contract: KHÔNG được reference --color-apply-cta trong rule.
  // Lưu ý: regex phải bám vào rule bắt đầu ở đầu dòng, không phải
  // `.hrp-btn-apply` xuất hiện trong comment phía trên.
  it('AC-10 source: .hrp-btn-apply rule KHÔNG reference --color-apply-cta', () => {
    const matches = [...GLOBALS_CSS.matchAll(/^\.hrp-btn-apply[^{]*\{[^}]*\}/gm)];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m[0], 'hrp-btn-apply rule still references --color-apply-cta (regression)').not.toMatch(
        /--color-apply-cta/,
      );
    }
  });

  // Theme scope: 5 theme set --color-primary-dark đúng hex.
  const palettes: Array<[string, string]> = [
    ['hrp', '#a63b00'],
    ['ocean-trust', '#0d4a63'],
    ['emerald-growth', '#0d5a39'],
    ['violet-future', '#3f1f7a'],
    ['executive-gold', '#5d4a08'],
  ];

  for (const [themeKey, expectedHex] of palettes) {
    it(`AC-10 scope: [data-theme=${themeKey}] set --color-primary-dark = ${expectedHex}`, () => {
      // Tìm block [data-theme=KEY] chứa --color-primary-dark: HEX;
      const re = new RegExp(
        `\\[data-theme=['"]?${themeKey}['"]?\\]\\s*\\{[^}]*--color-primary-dark:\\s*${expectedHex}[^}]*\\}`,
      );
      expect(
        GLOBALS_CSS,
        `[data-theme=${themeKey}] not setting --color-primary-dark=${expectedHex}`,
      ).toMatch(re);
    });
  }
});

describe('AC-10: regression — khai báo alias --color-apply-cta* ở :root vẫn còn', () => {
  it('--color-apply-cta: var(--color-primary-dark) ở :root (backward compat)', () => {
    // T1A giữ token này ở :root cho code/site ngoài .hrp-btn-apply có thể
    // tham chiếu. KHÔNG cascade theo theme (early resolution) nhưng đó là
    // intentional — CTA thực sự dùng trực tiếp var(--color-primary-dark).
    const m = GLOBALS_CSS.match(/--color-apply-cta:\s*([^;]+);/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/var\(--color-primary-dark\)/);
  });

  it('--color-apply-cta* KHÔNG được override trong [data-theme] (contract test)', () => {
    const re = /\[data-theme=['"]?([a-z-]+)['"]?\]\s*\{([^}]*)\}/g;
    for (const m of GLOBALS_CSS.matchAll(re)) {
      expect(m[2], `[data-theme="${m[1]}"] must not override --color-apply-cta`).not.toMatch(
        /--color-apply-cta/,
      );
    }
  });
});
