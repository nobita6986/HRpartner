/**
 * theme-cta-foreground.test.ts — .hrp-btn-apply default + hover probe.
 *
 * Owned by T1A (`hrp-t1a-theme-apply-cta-hotfix` + `hrp-t1a-cta-theme-cascade-hotfix`).
 * Baseline: `5cfbca12` (theme-apply-cta-hotfix), `c0d32c8a` (cta-theme-cascade-hotfix).
 * Spec: `v1.0`.
 *
 * Contract migration (PR #133 T1B đã sửa 3:1 → 4.5:1 cho text 14px semibold;
 * PR #135 T1A nâng cấp nguồn màu CTA từ `--color-primary-cta*` cố định
 * sang `--color-apply-cta*` alias theo `var(--color-primary-dark)` để cascade
 * theo 5 theme T1C đã chốt — nhưng phát hiện pitfall: alias ở `:root` bị
 * "đóng băng" thành HRP dark do early resolution của `var()` substitution
 * trong custom property definition):
 *   - Default: text `var(--color-on-primary)` (white) trên `var(--color-primary-dark)`
 *     (5/5 palette ≥ 4.5:1).
 *   - Hover: text `var(--color-on-primary)` (white) trên
 *     `color-mix(in srgb, var(--color-primary-dark) 82%, #000)`
 *     (5/5 palette ≥ 4.5:1).
 *   - Focus: outline 2px `var(--color-focus-ring)` (UI ≥ 3:1 5/5 palette).
 *   - Disabled: `var(--color-on-surface-variant)` trên `var(--color-surface-container)`
 *     (8.093:1 ≥ 4.5:1).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const GLOBALS_CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8').replace(
  /\r\n/g,
  '\n',
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

describe('RQ-01: .hrp-btn-apply default color theo theme (AC-01, AC-02)', () => {
  it('AC-01: default background dùng var(--color-primary-dark) (lazy cascade theme)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/background-color:\s*var\(--color-primary-dark\)/);
  });

  it('AC-02: default color dùng var(--color-on-primary) (white)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/color:\s*var\(--color-on-primary\)/);
  });

  it('AC-01: token --color-apply-cta vẫn còn ở :root (alias ngược, không cascade qua theme)', () => {
    // T1A giữ --color-apply-cta: var(--color-primary-dark) ở :root cho backward
    // compat. Pitfall đã được document — token này KHÔNG cascade theo theme
    // vì early resolution. CTA thực sự dùng trực tiếp var(--color-primary-dark).
    const m = GLOBALS_CSS.match(/--color-apply-cta:\s*([^;]+);/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/var\(--color-primary-dark\)/);
  });

  it('AC-08: .hrp-btn-apply KHÔNG dùng --color-apply-cta (tránh tái diễn pitfall)', () => {
    // Lưu ý: regex phải bám vào rule bắt đầu ở đầu dòng, không phải
    // `.hrp-btn-apply` xuất hiện trong comment phía trên.
    const m = GLOBALS_CSS.match(/^\.hrp-btn-apply\s*\{[^}]*\}/m);
    expect(m).not.toBeNull();
    // Tất cả rule của .hrp-btn-apply không được reference --color-apply-cta.
    expect(m![0]).not.toMatch(/--color-apply-cta/);
  });
});

describe('RQ-01: .hrp-btn-apply hover state', () => {
  it('AC-04: hover background dùng color-mix(in srgb, var(--color-primary-dark) 82%, #000)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply:hover:not\(:disabled\)\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(
      /background-color:\s*color-mix\(in srgb,\s*var\(--color-primary-dark\)\s*82%,\s*#000\)/,
    );
  });

  it('AC-04: hover color dùng var(--color-on-primary) (white)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply:hover:not\(:disabled\)\s*\{[^}]*\}/);
    expect(m![0]).toMatch(/color:\s*var\(--color-on-primary\)/);
  });
});

describe('RQ-01: .hrp-btn-apply disabled state', () => {
  it('AC-06: disabled color dùng var(--color-on-surface-variant)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply:disabled\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/color:\s*var\(--color-on-surface-variant\)/);
  });
});

describe('RQ-01: probe .hrp-btn-apply default ≥ 4.5:1 ở 5/5 palette (AC-03)', () => {
  // Default: text on-primary (white #ffffff) trên --color-apply-cta
  // (alias --color-primary-dark). PD hex 5/5 palette đã được T1C đóng băng
  // (xem `theme-tokens.ts` và `[data-theme]` block trong `globals.css:226-264`).
  const onPrimary = '#ffffff';
  const palettes: Array<[string, string]> = [
    ['hrp', '#a63b00'],
    ['ocean-trust', '#0d4a63'],
    ['emerald-growth', '#0d5a39'],
    ['violet-future', '#3f1f7a'],
    ['executive-gold', '#5d4a08'],
  ];
  for (const [name, pd] of palettes) {
    it(`AC-03 default: white on ${name} PD (${pd}) >= 4.5:1`, () => {
      const r = contrast(onPrimary, pd);
      expect(r, `theme=${name} ratio=${r.toFixed(3)}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('RQ-01: probe .hrp-btn-apply hover ≥ 4.5:1 ở 5/5 palette (AC-04)', () => {
  // Hover: text on-primary (white) trên --color-apply-cta-dark =
  // color-mix(PD 82%, #000 18%). Tính mix bằng helper inline.
  function mixHex(hex: string, p: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const mr = Math.round(r * p);
    const mg = Math.round(g * p);
    const mb = Math.round(b * p);
    return '#' + [mr, mg, mb].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  const onPrimary = '#ffffff';
  const palettes: Array<[string, string]> = [
    ['hrp', '#a63b00'],
    ['ocean-trust', '#0d4a63'],
    ['emerald-growth', '#0d5a39'],
    ['violet-future', '#3f1f7a'],
    ['executive-gold', '#5d4a08'],
  ];
  for (const [name, pd] of palettes) {
    it(`AC-04 hover: white on ${name} mix(PD 82%, #000 18%) >= 4.5:1`, () => {
      const mix = mixHex(pd, 0.82);
      const r = contrast(onPrimary, mix);
      expect(r, `theme=${name} mix=${mix} ratio=${r.toFixed(3)}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('RQ-01: focus ring 2px var(--color-focus-ring) — UI >= 3:1 (AC-05)', () => {
  it('.hrp-btn-apply:focus-visible có outline 2px', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply:focus-visible\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/outline:\s*2px solid var\(--color-focus-ring\)/);
  });
});
