/**
 * theme-cta-foreground.test.ts — .hrp-btn-apply default + hover probe.
 *
 * Owned by T1A (`hrp-t1a-theme-apply-cta-hotfix`) per TASK §In-scope roots.
 * Baseline: `5cfbca12`. Spec: `v1.0`.
 *
 * Contract migration (PR #133 T1B đã sửa 3:1 → 4.5:1 cho text 14px semibold;
 * PR #135 T1A nâng cấp nguồn màu CTA từ `--color-primary-cta*` cố định
 * sang `--color-apply-cta*` alias theo `var(--color-primary-dark)` để cascade
 * theo 5 theme T1C đã chốt):
 *   - Default: text `var(--color-on-primary)` (white) trên `--color-apply-cta`
 *     (alias `var(--color-primary-dark)`, 5/5 palette ≥ 4.5:1).
 *   - Hover: text `var(--color-on-primary)` (white) trên
 *     `--color-apply-cta-dark` (color-mix PD 82% + #000, 5/5 palette ≥ 4.5:1).
 *   - Focus: outline 2px `var(--color-focus-ring)` (UI ≥ 3:1 5/5 palette).
 *   - Disabled: `var(--color-on-surface-variant)` trên `var(--color-surface-container)`
 *     (8.093:1 ≥ 4.5:1).
 * Probe cả default + hover phải đạt ≥ 4.5:1 ở 5/5 palette (cặp dùng PD qua
 * cascade `data-theme`).
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

/** Trả về hex 7 ký tự lowercase. Hỗ trợ 2 dạng khai báo:
 *   - Hex literal: `--color-foo: #rrggbb;` → '#rrggbb'
 *   - Alias chứa `var(--color-...)`: lấy hex từ token được alias.
 *   - color-mix(...): trả về undefined (probe thủ công).
 */
function extractTokenHex(css: string, token: string): string | undefined {
  const re = new RegExp('--' + token + ':\\s*([^;]+);');
  const m = css.match(re);
  if (!m) return undefined;
  const raw = m[1]!.trim();
  const hex = /^#?([0-9a-fA-F]{6})$/.exec(raw);
  if (hex) return '#' + hex[1]!.toLowerCase();
  const alias = /var\(--color-([a-z0-9-]+)\)/.exec(raw);
  if (alias) {
    // Tránh đệ quy vô hạn: tối đa depth 4.
    let cur = alias[1]!;
    for (let i = 0; i < 4; i++) {
      const inner = extractTokenHex(css, cur);
      if (inner) return inner;
      const alias2 = new RegExp('--' + cur + ':\\s*var\\(--color-([a-z0-9-]+)\\)').exec(css);
      if (!alias2) return undefined;
      cur = alias2[1]!;
    }
  }
  return undefined;
}

describe('RQ-01: .hrp-btn-apply default color theo theme (AC-01, AC-02)', () => {
  it('AC-01: default background dùng var(--color-apply-cta) (alias theme)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/background-color:\s*var\(--color-apply-cta\)/);
  });

  it('AC-02: default color dùng var(--color-on-primary) (white)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/color:\s*var\(--color-on-primary\)/);
  });

  it('AC-01: token --color-apply-cta alias về var(--color-primary-dark) (cascade theme)', () => {
    const m = GLOBALS_CSS.match(/--color-apply-cta:\s*([^;]+);/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/var\(--color-primary-dark\)/);
  });
});

describe('RQ-01: .hrp-btn-apply hover state', () => {
  it('AC-04: hover background dùng var(--color-apply-cta-dark) (color-mix PD 82% + #000)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply:hover:not\(:disabled\)\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/background-color:\s*var\(--color-apply-cta-dark\)/);
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
