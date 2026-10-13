/**
 * theme-cta-foreground.test.ts — .hrp-btn-apply default + hover probe.
 *
 * Owned by T1B (`hrp-t1b-public-theme-picker-contrast`).
 * Baseline: `2b07d9de`. Spec: `v1.0`.
 *
 * Contract fix: PR #132 (t2-apply-cta-tone) sai khi cho rằng 14px font-semibold
 * chỉ cần 3:1 large-text rule. 14px semibold = normal text theo WCAG 2.x
 * (large text rule 14pt+ regular / 18px+ regular / 14pt+ bold = true 18.66px
 * regular, bold threshold nghiêm ngặt hơn). T1B sửa contract:
 *   - Default: var(--color-on-surface) trên --color-primary-cta (#f07f1a)
 *   - Hover: var(--color-on-primary) trên --color-primary-cta-dark (#c2520a)
 *   - Focus: outline 2px var(--color-focus-ring) (UI ≥ 3:1)
 *   - Disabled: var(--color-on-surface-variant) (giữ nguyên)
 * Cả default + hover đều phải đạt ≥ 4.5:1.
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

function extractTokenHex(css: string, token: string): string {
  const re = new RegExp('--' + token + ':\\s*(#[0-9a-fA-F]{6})\\s*;');
  const m = css.match(re);
  if (!m) throw new Error('Token not found: --' + token);
  return m[1]!.toLowerCase();
}

describe('RQ-05: .hrp-btn-apply default color (AC-16, AC-18)', () => {
  it('AC-16: default color dùng var(--color-on-surface)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/color:\s*var\(--color-on-surface\)/);
  });

  it('AC-16: default background dùng var(--color-primary-cta)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply\s*\{[^}]*\}/);
    expect(m![0]).toMatch(/background-color:\s*var\(--color-primary-cta\)/);
  });

  it('AC-16: default text dùng var(--color-on-surface) — KHÔNG dùng var(--color-on-primary)', () => {
    // Đây là fix từ PR #132 (dùng on-primary, fail 4.5:1)
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply\s*\{[^}]*\}/);
    expect(m![0]).not.toMatch(/color:\s*var\(--color-on-primary\)/);
  });
});

describe('RQ-05: .hrp-btn-apply hover state', () => {
  it('hover background dùng var(--color-primary-cta-dark)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply:hover:not\(:disabled\)\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/background-color:\s*var\(--color-primary-cta-dark\)/);
  });

  it('hover color dùng var(--color-on-primary) (white)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply:hover:not\(:disabled\)\s*\{[^}]*\}/);
    expect(m![0]).toMatch(/color:\s*var\(--color-on-primary\)/);
  });
});

describe('RQ-05: .hrp-btn-apply disabled state', () => {
  it('disabled color dùng var(--color-on-surface-variant)', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply:disabled\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/color:\s*var\(--color-on-surface-variant\)/);
  });
});

describe('RQ-05: probe .hrp-btn-apply default ≥ 4.5:1 (AC-16)', () => {
  const onSurface = extractTokenHex(GLOBALS_CSS, 'color-on-surface');
  const primaryCta = extractTokenHex(GLOBALS_CSS, 'color-primary-cta');
  it(`default: ${onSurface} on ${primaryCta} (--color-on-surface --color-primary-cta) >= 4.5:1`, () => {
    const r = contrast(onSurface, primaryCta);
    expect(r).toBeGreaterThanOrEqual(4.5);
  });
});

describe('RQ-05: probe .hrp-btn-apply hover ≥ 4.5:1 (AC-17)', () => {
  const onPrimary = extractTokenHex(GLOBALS_CSS, 'color-on-primary');
  const primaryCtaDark = extractTokenHex(GLOBALS_CSS, 'color-primary-cta-dark');
  it(`hover: ${onPrimary} on ${primaryCtaDark} (--color-on-primary --color-primary-cta-dark) >= 4.5:1`, () => {
    const r = contrast(onPrimary, primaryCtaDark);
    expect(r).toBeGreaterThanOrEqual(4.5);
  });
});

describe('RQ-05: focus ring 2px var(--color-focus-ring) — UI >= 3:1 (AC-12)', () => {
  it('.hrp-btn-apply:focus-visible có outline 2px', () => {
    const m = GLOBALS_CSS.match(/\.hrp-btn-apply:focus-visible\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/outline:\s*2px solid var\(--color-focus-ring\)/);
  });
});
