/**
 * Unit tests for contrast ratios (T1C palette-blocker + T1B-owned C7).
 *
 * Owned by T1C (`hrp-t1c-theme-foundation`).
 * Spec: `v1.2`. Baseline: `aa86902f`.
 *
 * Reimplements the WCAG 2.x relative-luminance formula so this test does
 * not depend on the external `contrast-probe.mjs` script.
 *
 * Covers AC-04 (palette-blocker) AND documents the T1B-owned C7 fail list
 * (HRP/Emerald/Executive) so future regressions in either direction trip a test.
 */

import { describe, it, expect } from 'vitest';
import { THEMES, getTheme } from '../theme-types';
import type { ThemeKey } from '../theme-types';

const RATIO_TEXT_MIN = 4.5;
const RATIO_LARGE_UI = 3.0;

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

interface PairResult {
  name: string;
  fg: string;
  bg: string;
  ratio: number;
  min: number;
  pass: boolean;
}

function allPairs(tk: { primary: string; primaryDark: string; primaryContainer: string; primarySoft: string; surface: string; onPrimary: string; onPrimarySoft: string; onPrimaryContainer: string }): PairResult[] {
  return [
    { name: 'C1: text-tren-primaryDark', fg: tk.onPrimary, bg: tk.primaryDark, ratio: contrast(tk.onPrimary, tk.primaryDark), min: RATIO_TEXT_MIN, pass: false },
    { name: 'C2: text-tren-primary (decoration 3:1)', fg: tk.onPrimary, bg: tk.primary, ratio: contrast(tk.onPrimary, tk.primary), min: RATIO_LARGE_UI, pass: false },
    { name: 'C3: text-tren-primarySoft', fg: tk.onPrimarySoft, bg: tk.primarySoft, ratio: contrast(tk.onPrimarySoft, tk.primarySoft), min: RATIO_TEXT_MIN, pass: false },
    { name: 'C4: text-tren-primaryContainer', fg: tk.onPrimaryContainer, bg: tk.primaryContainer, ratio: contrast(tk.onPrimaryContainer, tk.primaryContainer), min: RATIO_TEXT_MIN, pass: false },
    { name: 'C5: heading/PD-tren-surface', fg: tk.primaryDark, bg: tk.surface, ratio: contrast(tk.primaryDark, tk.surface), min: RATIO_TEXT_MIN, pass: false },
    { name: 'C6: focus-ring/PD-tren-surface (3:1)', fg: tk.primaryDark, bg: tk.surface, ratio: contrast(tk.primaryDark, tk.surface), min: RATIO_LARGE_UI, pass: false },
    { name: 'C7: text-trang-tren-primary (T1B-owned 4.5:1)', fg: tk.onPrimary, bg: tk.primary, ratio: contrast(tk.onPrimary, tk.primary), min: RATIO_TEXT_MIN, pass: false },
  ].map((p) => ({ ...p, pass: p.ratio >= p.min }));
}

describe('contrast probe — T1C palette-blocker (C1, C3, C4, C5) must PASS for 5/5 palettes', () => {
  for (const def of THEMES) {
    describe(`${def.label} (${def.key})`, () => {
      const pairs = allPairs(def.tokens);
      const paletteBlocker = ['C1', 'C3', 'C4', 'C5'] as const;

      for (const tag of paletteBlocker) {
        const p = pairs.find((x) => x.name.startsWith(tag));
        if (!p) throw new Error('Missing pair ' + tag);
        it(`${tag} ${p.name} >= ${p.min}:1 (đo ${p.ratio.toFixed(3)}:1)`, () => {
          expect(p.pass).toBe(true);
          expect(p.ratio).toBeGreaterThanOrEqual(p.min);
        });
      }
    });
  }
});

describe('contrast probe — T1C palette-blocker (C2, C6) >= 3:1 (large/UI)', () => {
  for (const def of THEMES) {
    describe(`${def.label}`, () => {
      const pairs = allPairs(def.tokens);
      const c2 = pairs.find((x) => x.name.startsWith('C2'))!;
      const c6 = pairs.find((x) => x.name.startsWith('C6'))!;
      it(`C2 (3:1 decoration) >= 3:1 (đo ${c2.ratio.toFixed(3)}:1)`, () => {
        expect(c2.pass).toBe(true);
      });
      it(`C6 (3:1 focus) >= 3:1 (đo ${c6.ratio.toFixed(3)}:1)`, () => {
        expect(c6.pass).toBe(true);
      });
    });
  }
});

describe('contrast probe — T1B-owned C7 (white-on-P, 4.5:1) — documented fail list', () => {
  // These ratios are the dependency for T1B to migrate 6 theme-sensitive sites
  // (GlobalNavbar 297/424, login-form 137, ve-chung-toi 145, .apply-btn 660,
  // .pub-btn-primary 552) from --color-primary to --color-primary-dark.
  // HRP/Emerald/Executive FAIL on P; T1B will switch them to PD bg.

  it('HRP C7 fail (3.153:1) — T1B sẽ đổi sang PD', () => {
    const t = getTheme('hrp');
    const c7 = contrast(t.tokens.onPrimary, t.tokens.primary);
    expect(c7).toBeCloseTo(3.153, 2);
    expect(c7).toBeLessThan(4.5); // FAILS 4.5:1
  });

  it('Emerald C7 fail (4.338:1) — T1B sẽ đổi sang PD', () => {
    const t = getTheme('emerald-growth');
    const c7 = contrast(t.tokens.onPrimary, t.tokens.primary);
    expect(c7).toBeCloseTo(4.338, 2);
    expect(c7).toBeLessThan(4.5); // FAILS 4.5:1
  });

  it('Executive C7 fail (4.062:1) — T1B sẽ đổi sang PD', () => {
    const t = getTheme('executive-gold');
    const c7 = contrast(t.tokens.onPrimary, t.tokens.primary);
    expect(c7).toBeCloseTo(4.062, 2);
    expect(c7).toBeLessThan(4.5); // FAILS 4.5:1
  });

  it('Ocean C7 pass (5.637:1)', () => {
    const t = getTheme('ocean-trust');
    const c7 = contrast(t.tokens.onPrimary, t.tokens.primary);
    expect(c7).toBeCloseTo(5.637, 2);
    expect(c7).toBeGreaterThanOrEqual(4.5);
  });

  it('Violet C7 pass (7.021:1)', () => {
    const t = getTheme('violet-future');
    const c7 = contrast(t.tokens.onPrimary, t.tokens.primary);
    expect(c7).toBeCloseTo(7.021, 2);
    expect(c7).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contrast probe — sau khi T1B đổi 6 vị trí sang PD, 5/5 pass C7 (white-on-PD)', () => {
  // This is the post-migration expectation that proves T1B can satisfy
  // white-on-PD >= 4.5:1 across all 5 palettes with the locked hex set.
  const expected: Array<[ThemeKey, number]> = [
    ['hrp', 6.468],
    ['ocean-trust', 9.647],
    ['emerald-growth', 8.272],
    ['violet-future', 12.438],
    ['executive-gold', 8.577],
  ];
  for (const [key, expectedRatio] of expected) {
    it(`${key}: white on PD >= 4.5:1 (đo ${expectedRatio}:1)`, () => {
      const t = getTheme(key);
      const r = contrast(t.tokens.onPrimary, t.tokens.primaryDark);
      expect(r).toBeCloseTo(expectedRatio, 2);
      expect(r).toBeGreaterThanOrEqual(4.5);
    });
  }
});
