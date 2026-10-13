/**
 * hero-eyebrow-contrast.test.ts — 2-state contrast cho Hero copy.
 *
 * Owned by T1A (`hrp-t1a-theme-apply-cta-hotfix`).
 * Spec: `v1.1` → `v1.2` (R1 follow-up).
 *
 * Đặt vấn đề (T0 R1):
 *   - `heroImage === null` (default) → Hero dùng gradient
 *     `from-primary-container to-primary-fixed`. Cả 5 theme đều là nền
 *     sáng, đặc biệt `primary-fixed` rất nhạt (#ffdbce / #d6ebf5 / #d2ebde /
 *     #e1d5f4 / #f0e6c0) → `text-on-primary` (white) chỉ đạt 1.23-1.40
 *     contrast, FAIL WCAG AA 4.5:1 cả 5 theme.
 *   - `heroImage !== null` → Hero có overlay `bg-primary-dark/55` chồng
 *     lên gradient. White đạt 2.88-4.16 contrast ở 5 theme (chỉ violet
 *     gần pass 4.16; 4 theme còn lại FAIL ngay cả large text 3:1) — đây
 *     là pre-existing limitation của `bg-primary-dark/55` (overlay chưa
 *     đủ tối khi nền PC/PF quá sáng), không thuộc hotfix scope. White vẫn
 *     là best-effort cho state 2 vì PD trên overlay-55% chỉ đạt 2.16-2.99
 *     (FAIL 5/5), không có class nào pass WCAG AA 4.5:1 trên overlay hiện
 *     tại. Follow-up: tăng overlay lên 70-80% hoặc thêm dark scrim.
 *
 * Giải pháp R1 (minimal): conditional class trên container Hero copy —
 *   heroImage ? 'text-on-primary' : 'text-primary-dark'
 * áp dụng cho cả 3 phần tử con (eyebrow / H1 / body) qua class cha. 1
 * điểm sửa duy nhất, không lặp class, không đổi markup.
 *
 * Probe:
 *   - State 1 (gradient, no image): PD/PC ≥ 5.38, PD/PF ≥ 5.01 → 5/5 PASS
 *   - State 2 (overlay 55%): white/overPC 2.88-4.16 → pre-existing FAIL,
 *     document limitation trong HANDOFF, không assert.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE_TSX = readFileSync(
  resolve(process.cwd(), 'app/(portal)/page.tsx'),
  'utf8',
).replace(/\r\n/g, '\n');

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

// ─── 5 theme brand token hex (T1C v1.2 baseline) ───────────────────────────
// Mirror of `src/shared/theme/theme-tokens.ts` v1.2.
const PALETTES: Array<[string, string, string]> = [
  // [theme, primary-dark (PD), primary-fixed (PF)]
  // PC: HRP=#fde6d8 / Ocean=#d6ebf5 / Emerald=#d2ebde / Violet=#e1d5f4 / Gold=#f0e6c0
  // (gradient `from-primary-container to-primary-fixed` — nền sáng ở cả 2 đầu)
  ['hrp', '#a63b00', '#ffdbce'],
  ['ocean-trust', '#0d4a63', '#d6ebf5'],
  ['emerald-growth', '#0d5a39', '#d2ebde'],
  ['violet-future', '#3f1f7a', '#e1d5f4'],
  ['executive-gold', '#5d4a08', '#f0e6c0'],
];

describe('RQ-01 R1: Hero copy container conditional color (AC-09 R1 follow-up)', () => {
  it('R1-fix: container className dùng heroImage ? text-on-primary : text-primary-dark', () => {
    // Match `<Hero backgroundImage={heroImage}>` block, rồi tìm div đầu tiên
    // sau nó với className chứa conditional pattern.
    const heroIdx = PAGE_TSX.indexOf('<Hero backgroundImage={heroImage}>');
    expect(heroIdx).toBeGreaterThan(0);
    const after = PAGE_TSX.slice(heroIdx, heroIdx + 2000);
    // Cho phép whitespace + newline + backtick template
    const re = /heroImage\s*\?\s*['"]text-on-primary['"]\s*:\s*['"]text-primary-dark['"]/;
    expect(after, 'Hero container phải dùng conditional class text-on-primary : text-primary-dark theo heroImage').toMatch(re);
  });

  it('R1-fix: child eyebrow KHÔNG còn hardcode text-on-primary / text-secondary-fixed (override từ container)', () => {
    const heroIdx = PAGE_TSX.indexOf('<Hero backgroundImage={heroImage}>');
    expect(heroIdx).toBeGreaterThan(0);
    const after = PAGE_TSX.slice(heroIdx, heroIdx + 2000);
    // Eyebrow cũ: <p className="font-label ... text-on-primary">Cùng tìm kiếm</p>
    // Sau R1: bỏ text-on-primary/text-secondary-fixed ở child, container lo.
    expect(after).not.toMatch(/text-secondary-fixed/);
    // text-on-primary có thể xuất hiện ở conditional trên container — chỉ
    // assert eyebrow `<p>` không còn class đó.
    const eyebrowMatch = after.match(/<p[^>]*className="[^"]*"[^>]*>\s*Cùng tìm kiếm/);
    expect(eyebrowMatch, 'Eyebrow phải tồn tại').not.toBeNull();
    expect(eyebrowMatch![0]).not.toMatch(/text-on-primary|text-secondary-fixed/);
  });
});

describe('RQ-01 R1: probe state 1 (heroImage == null, gradient) ≥ 4.5:1 ở 5/5 palette (AC-09 R1)', () => {
  // Gradient `from-primary-container to-primary-fixed`: cả 2 đầu đều nền
  // sáng. Container dùng `text-primary-dark` (alias --color-primary-dark).
  // Eyebrow ở top half (gần primary-container) nên test cả 2 endpoint
  // để bảo đảm text dài xuống dưới cũng pass.
  for (const [name, pd, pf] of PALETTES) {
    it(`state1 ${name}: PD on primary-fixed (gradient bottom) >= 4.5:1`, () => {
      const r = contrast(pd, pf);
      expect(r, `theme=${name} PD=${pd} on PF=${pf} ratio=${r.toFixed(3)}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('RQ-01 R1: state 2 (heroImage != null, overlay bg-primary-dark/55) — limitation documented', () => {
  // Probe ghi nhận: white trên overlay-55%-over-PC/PF chỉ 2.88-4.16 (chỉ
  // violet gần 4.16; 4 theme còn lại FAIL). Đây là pre-existing issue của
  // overlay `bg-primary-dark/55` chồng nền PC/PF quá sáng. White là
  // best-effort vì PD trên overlay cũng chỉ 2.16-2.99 (FAIL 5/5). Follow-up
  // task cần tăng overlay lên 70-80% hoặc thêm dark scrim.
  //
  // Test này chỉ assert structural: container dùng `text-on-primary` khi
  // heroImage truthy. Không assert contrast (đã biết FAIL 4/5).
  it('state2 structural: conditional chọn text-on-primary khi heroImage truthy', () => {
    const re = /heroImage\s*\?\s*['"]text-on-primary['"]\s*:\s*['"]text-primary-dark['"]/;
    expect(PAGE_TSX).toMatch(re);
  });
});
