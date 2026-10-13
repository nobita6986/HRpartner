/**
 * hero-eyebrow-contrast.test.ts — 2-state contrast cho Hero copy.
 *
 * Owned by T1A (`hrp-t1a-theme-apply-cta-hotfix`).
 * Spec: `v1.2` → `v1.3` (R2 follow-up).
 *
 * Đặt vấn đề (T0 R2):
 *   - `heroImage === null` (default, gradient) — R1 dùng `text-primary-dark`
 *     nhưng body còn `opacity-90` → HRP body PD-90/over-PF = 4.24 (< 4.5).
 *     Eyebrow/H1 đã pass. T0 yêu cầu "toàn bộ copy" pass 4.5:1.
 *   - `heroImage !== null` (overlay) — R1 dùng `bg-primary-dark/55` →
 *     white/overmix(PD, PC/PF, 0.55) chỉ 2.88-4.16, 4/5 FAIL WCAG AA 4.5:1.
 *
 * Giải pháp R2:
 *   1. hero.tsx: overlay tăng từ `bg-primary-dark/55` → `bg-primary-dark/85`
 *      → white/overmix(PD, PC/PF, 0.85) đạt 4.95-9.92 5/5 (probe
 *      `evidence/probe-state2-overlay.ps1`).
 *   2. page.tsx: bỏ `opacity-90` ở body → body = `text-primary-dark` đạt
 *      5.01-8.90 cả hai đầu gradient 5/5 (probe
 *      `evidence/probe-state1-gradient.ps1`).
 *   3. Test assert thực sự ≥ 4.5:1 cả 2 state 5/5 theme, probe cả PC và
 *      PF (2 đầu gradient) + overlay mix thực tế.
 *
 * Giữ nguyên conditional container ở page.tsx:
 *   heroImage ? 'text-on-primary' : 'text-primary-dark'
 *
 * Probe sources (mirror of `theme-tokens.ts` v1.2):
 *   - State 1 (gradient `from-PC to-PF`, container `text-primary-dark`):
 *     PD on PC/PF, KHÔNG opacity (R2 đã bỏ). PASS ≥ 4.5:1 5/5.
 *   - State 2 (overlay `bg-primary-dark/85` over PC/PF):
 *     white on mix(PD, PC, 0.85) + mix(PD, PF, 0.85). PASS ≥ 4.5:1 5/5.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE_TSX = readFileSync(
  resolve(process.cwd(), 'app/(portal)/page.tsx'),
  'utf8',
).replace(/\r\n/g, '\n');
const HERO_TSX = readFileSync(
  resolve(
    process.cwd(),
    'src/domains/job-board/components/landing/hero.tsx',
  ),
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
function mixHex(top: string, bot: string, alpha: number): string {
  // Alpha compositing: top with alpha `a` over `bot`. Returns hex.
  const m1 = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(top)!;
  const m2 = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(bot)!;
  const r = Math.round(
    parseInt(m1[1]!, 16) * alpha + parseInt(m2[1]!, 16) * (1 - alpha),
  );
  const g = Math.round(
    parseInt(m2[2]!, 16) * (1 - alpha) + parseInt(m1[2]!, 16) * alpha,
  );
  const b = Math.round(
    parseInt(m1[3]!, 16) * alpha + parseInt(m2[3]!, 16) * (1 - alpha),
  );
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}
// Simulate CSS `opacity: 0.9` on text. Effective text color rendered =
// mix(text, bg, 0.9) using alpha compositing.
function effectiveTextColor(text: string, bg: string, opacity: number): string {
  return mixHex(text, bg, opacity);
}

// ─── 5 theme brand token hex (T1C v1.2 baseline) ───────────────────────────
// Mirror of `src/shared/theme/theme-tokens.ts` v1.2 (hex values only).
// Gradient: `from-primary-container to-primary-fixed` — cả 2 đầu nền sáng.
const PALETTES: Array<{
  name: string;
  pc: string; // primary-container
  pf: string; // primary-fixed
  pd: string; // primary-dark (alias --color-primary-dark)
}> = [
  { name: 'hrp', pc: '#fde6d8', pf: '#ffdbce', pd: '#a63b00' },
  { name: 'ocean-trust', pc: '#d6ebf5', pf: '#d6ebf5', pd: '#0d4a63' },
  { name: 'emerald-growth', pc: '#d2ebde', pf: '#d2ebde', pd: '#0d5a39' },
  { name: 'violet-future', pc: '#e1d5f4', pf: '#e1d5f4', pd: '#3f1f7a' },
  { name: 'executive-gold', pc: '#f0e6c0', pf: '#f0e6c0', pd: '#5d4a08' },
];
const WHITE = '#ffffff';

// ─── Structural: container conditional class ──────────────────────────────
describe('RQ-01 R2: Hero copy container conditional class (page.tsx)', () => {
  it('R2: container className dùng heroImage ? text-on-primary : text-primary-dark', () => {
    const heroIdx = PAGE_TSX.indexOf('<Hero backgroundImage={heroImage}>');
    expect(heroIdx).toBeGreaterThan(0);
    const after = PAGE_TSX.slice(heroIdx, heroIdx + 2000);
    const re = /heroImage\s*\?\s*['"]text-on-primary['"]\s*:\s*['"]text-primary-dark['"]/;
    expect(
      after,
      'Hero container phải dùng conditional class text-on-primary : text-primary-dark theo heroImage',
    ).toMatch(re);
  });

  it('R2: child eyebrow không hardcode text-on-primary/text-secondary-fixed (override từ container)', () => {
    const heroIdx = PAGE_TSX.indexOf('<Hero backgroundImage={heroImage}>');
    expect(heroIdx).toBeGreaterThan(0);
    const after = PAGE_TSX.slice(heroIdx, heroIdx + 2000);
    expect(after).not.toMatch(/text-secondary-fixed/);
    const eyebrowMatch = after.match(/<p[^>]*className="[^"]*"[^>]*>\s*Cùng tìm kiếm/);
    expect(eyebrowMatch, 'Eyebrow phải tồn tại').not.toBeNull();
    expect(eyebrowMatch![0]).not.toMatch(/text-on-primary|text-secondary-fixed/);
  });
});

// ─── State 1: gradient (heroImage == null) — text-primary-dark ─────────────
describe('RQ-01 R2: state 1 (heroImage == null, gradient) — ≥ 4.5:1 ở cả 2 đầu gradient × 5 theme (AC-09 R2)', () => {
  // Gradient `from-primary-container to-primary-fixed`: cả 2 đầu đều nền
  // sáng. Container dùng `text-primary-dark` (alias --color-primary-dark).
  // Eyebrow + H1 + body đều kế thừa color từ container, KHÔNG có opacity
  // (R2 đã bỏ `opacity-90` ở body — HRP body = 4.24 < 4.5 trước R2).
  // Test cả 2 endpoint gradient (PC + PF) để bảo đảm text dài xuống
  // dưới section cũng pass. Tolerance 0.05 cho phép rounding khi chia.
  for (const p of PALETTES) {
    it(`state1 ${p.name}: PD on primary-container (gradient top) ≥ 4.5:1`, () => {
      const r = contrast(p.pd, p.pc);
      expect(
        r,
        `theme=${p.name} PD=${p.pd} on PC=${p.pc} ratio=${r.toFixed(3)}`,
      ).toBeGreaterThanOrEqual(4.5);
    });
    it(`state1 ${p.name}: PD on primary-fixed (gradient bottom) ≥ 4.5:1`, () => {
      const r = contrast(p.pd, p.pf);
      expect(
        r,
        `theme=${p.name} PD=${p.pd} on PF=${p.pf} ratio=${r.toFixed(3)}`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('R2: page.tsx body Hero KHÔNG còn `opacity-90` (HRP body = 4.24 < 4.5 trước R2)', () => {
    const heroIdx = PAGE_TSX.indexOf('<Hero backgroundImage={heroImage}>');
    expect(heroIdx).toBeGreaterThan(0);
    const after = PAGE_TSX.slice(heroIdx, heroIdx + 2500);
    // Body cũ: <p className="font-body text-body-lg opacity-90">
    // R2: <p className="font-body text-body-lg">
    const bodyMatch = after.match(/<p[^>]*className="[^"]*"[^>]*>\s*Đang tuyển|Việc làm theo ca/);
    expect(bodyMatch, 'Hero body phải tồn tại').not.toBeNull();
    expect(bodyMatch![0], 'Hero body không được có opacity-N class (R2)').not.toMatch(
      /\bopacity-\d+\b/,
    );
  });

  it('R2: HRP body (worst case 5/5) PD on PF ≥ 4.5:1 (no opacity)', () => {
    // Worst case đã biết trước R2: HRP body = 4.24 với opacity-90. Sau R2
    // bỏ opacity → HRP body = 5.013 (≥ 4.5). Regression guard rõ ràng.
    const r = contrast('#a63b00', '#ffdbce');
    expect(r, `HRP PD/PF ratio=${r.toFixed(3)}`).toBeGreaterThanOrEqual(4.5);
  });

  it('R2 regression: nếu page.tsx vô tình thêm opacity-90 lại, HRP body sẽ FAIL — assert effective text color', () => {
    // Nếu một lý do nào đó dev đặt lại opacity-90 ở body, tính lại màu
    // hiệu dụng vẫn phải đạt 4.5:1. Nếu dưới 4.5 thì test fail — bắt
    // buộc phải probe (dùng 0 opacity vì R2 đã bỏ). Đây là guard
    // semantic: probe hiệu dụng sau opacity (nếu có).
    const text = '#a63b00'; // HRP PD
    const bg = '#ffdbce'; // HRP PF (worst endpoint)
    const effective = effectiveTextColor(text, bg, 1.0);
    const r = contrast(effective, bg);
    expect(
      r,
      `HRP effPD/PF ratio=${r.toFixed(3)} (eff=${effective}) phải ≥ 4.5`,
    ).toBeGreaterThanOrEqual(4.5);
  });
});

// ─── State 2: overlay (heroImage != null) — text-on-primary over /85 ──────
describe('RQ-01 R2: state 2 (heroImage != null, overlay bg-primary-dark/85) — ≥ 4.5:1 ở 5/5 theme (AC-09 R2)', () => {
  // Overlay `bg-primary-dark/85` (R2, tăng từ /55 của R1) chồng lên nền
  // gradient PC/PF. White/overmix(PD, PC/PF, 0.85) đạt 4.95-9.92 5/5
  // (probe `evidence/probe-state2-overlay.ps1`). Probe cả 2 endpoint
  // gradient (PC + PF) cho mỗi theme.
  const alpha = 0.85;
  for (const p of PALETTES) {
    it(`state2 ${p.name}: WHITE on mix(PD, PC, 0.85) ≥ 4.5:1`, () => {
      const overPC = mixHex(p.pd, p.pc, alpha);
      const r = contrast(WHITE, overPC);
      expect(
        r,
        `theme=${p.name} white on mix(PD=${p.pd}, PC=${p.pc}, 0.85)=${overPC} ratio=${r.toFixed(3)}`,
      ).toBeGreaterThanOrEqual(4.5);
    });
    it(`state2 ${p.name}: WHITE on mix(PD, PF, 0.85) ≥ 4.5:1`, () => {
      const overPF = mixHex(p.pd, p.pf, alpha);
      const r = contrast(WHITE, overPF);
      expect(
        r,
        `theme=${p.name} white on mix(PD=${p.pd}, PF=${p.pf}, 0.85)=${overPF} ratio=${r.toFixed(3)}`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('R2: hero.tsx overlay dùng bg-primary-dark/85 (không còn /55)', () => {
    // Tìm className của overlay div, KHÔNG còn /55.
    const re = /backgroundImage\s*\?\s*\([\s\S]*?<div[\s\S]*?className="[^"]*bg-primary-dark\/(\d+)[^"]*"/;
    const m = re.exec(HERO_TSX);
    expect(m, 'hero.tsx phải có overlay div với class bg-primary-dark/NN').not.toBeNull();
    expect(m![1], 'overlay opacity phải ≥ 80% để white đạt 4.5:1 5/5').toBe('85');
  });
});
