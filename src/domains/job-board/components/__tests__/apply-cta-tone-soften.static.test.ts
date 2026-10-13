/**
 * apply-cta-tone-soften.static.test.ts — t2-apply-cta-tone.
 *
 * Lock: nút "Ứng tuyển" ở 3 nơi (landing FeaturedJobCard, /viec-lam JobCard,
 * /viec-lam/{slug} DetailApplyCta) dùng CHUNG class `.hrp-btn-apply` để
 * đảm bảo background/hover/focus/disabled đồng bộ — single source of truth
 * trong `app/globals.css`. Tông cam dịu hơn primary brand HRP (#f26522),
 * resolve về `--color-primary-cta: #f07f1a` (softer warm orange).
 *
 * Phạm vi test: đọc file .tsx/.css trên disk, kiểm tra:
 *   1. Cả 3 nơi đều có class `hrp-btn-apply` (không dùng inline `bg-primary`
 *      hoặc `bg-primary-dark` cho CTA — đó là pattern cũ đã thay).
 *   2. globals.css định nghĩa class `.hrp-btn-apply` với background-color
 *      `var(--color-primary-cta)` và hover dùng `--color-primary-cta-dark`.
 *   3. @theme block khai cả 2 token mới.
 *   4. Không còn CTA nào dùng Tailwind utility `bg-primary` (cam đậm brand)
 *      trừ các nơi đã được chốt riêng (Nav Đăng ký, Hero CTA, …) — kiểm
 *      tra 3 file CTA là KHÔNG có `bg-primary` trên nút "Ứng tuyển".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LANDING_CTA = readFileSync(
  join(process.cwd(), 'src/domains/job-board/components/landing/featured-job-card.tsx'),
  'utf8',
);
const LISTING_CTA = readFileSync(
  join(process.cwd(), 'app/(jobs)/viec-lam/page.tsx'),
  'utf8',
);
const DETAIL_CTA = readFileSync(
  join(process.cwd(), 'src/domains/job-board/components/detail-apply-cta.tsx'),
  'utf8',
);
const GLOBALS_CSS = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8').replace(
  /\r\n/g,
  '\n',
);

function blockFromTestId(source: string, testId: string, lookBehind = 800): string {
  const idx = source.indexOf(testId);
  if (idx < 0) return '';
  return source.slice(Math.max(0, idx - lookBehind), idx + 200);
}

describe('t2-apply-cta-tone: 3 nơi dùng chung class .hrp-btn-apply', () => {
  it('landing FeaturedJobCard CTA co class .hrp-btn-apply', () => {
    const block = blockFromTestId(LANDING_CTA, 'data-testid="featured-job-cta"');
    expect(block).toContain('hrp-btn-apply');
  });

  it('landing FeaturedJobCard CTA KHONG con dung bg-primary / bg-primary-dark', () => {
    // Pattern cu (t2-public-paging-tone-hotfix truoc) dung Tailwind utility
    // bg-primary/bg-primary-dark. Sau hotfix nay, nguon mau chuyen sang
    // CSS class .hrp-btn-apply.
    const block = blockFromTestId(LANDING_CTA, 'data-testid="featured-job-cta"');
    expect(block).not.toContain('bg-primary');
    expect(block).not.toContain('hover:bg-primary-dark');
    expect(block).not.toContain('hover:bg-primary');
  });

  it('/viec-lam JobCard CTA co class .hrp-btn-apply', () => {
    // Listing CTA k co data-testid; search theo text "Ứng tuyển" gan Link.
    // File có thể có newline giua text và </Link>, nen dung regex.
    const m = LISTING_CTA.match(/Ứng tuyển\s*<\/Link>/);
    expect(m, 'phai tim thay "Ứng tuyển</Link>" trong listing page').not.toBeNull();
    if (m === null) return;
    const idx = m.index ?? 0;
    const block = LISTING_CTA.slice(Math.max(0, idx - 700), idx + 50);
    expect(block).toContain('hrp-btn-apply');
  });

  it('/viec-lam JobCard CTA KHONG con dung bg-primary / bg-primary-dark', () => {
    const m = LISTING_CTA.match(/Ứng tuyển\s*<\/Link>/);
    expect(m).not.toBeNull();
    if (m === null) return;
    const idx = m.index ?? 0;
    const block = LISTING_CTA.slice(Math.max(0, idx - 700), idx + 50);
    expect(block).not.toContain('bg-primary');
    expect(block).not.toContain('hover:bg-primary');
    expect(block).not.toContain('hover:bg-primary-dark');
  });

  it('DetailApplyCta (trang chi tiet) su dung class .hrp-btn-apply', () => {
    // className co dang: hrp-btn-apply font-semibold px-6 py-2 rounded-lg
    expect(DETAIL_CTA).toContain('hrp-btn-apply');
  });

  it('DetailApplyCta KHONG con style background var(--color-primary) cho nhanh default', () => {
    // Sau hotfix: nhanh default khong con set inline style; class .hrp-btn-apply
    // tu lo background. isFull/applied van co inline style (disabled/success).
    const defaultBlock = DETAIL_CTA.match(/isFull[\s\S]{0,400}applied[\s\S]{0,400}undefined/);
    expect(defaultBlock).not.toBeNull();
    expect(defaultBlock![0]).not.toContain("backgroundColor: 'var(--color-primary)'");
  });
});

describe('t2-apply-cta-tone: globals.css khai token va class dung chung', () => {
  it('@theme block khai --color-apply-cta (alias theme) + --color-primary-cta (alias ngược)', () => {
    // hrp-t1a-theme-apply-cta-hotfix (RQ-01): migrate từ
    // --color-primary-cta* cố định sang --color-apply-cta* alias
    // var(--color-primary-dark) để cascade theo theme. Token cũ
    // --color-primary-cta* vẫn còn (alias ngược) để không vỡ site cũ.
    expect(GLOBALS_CSS).toContain('--color-apply-cta: var(--color-primary-dark)');
    expect(GLOBALS_CSS).toContain('--color-apply-cta-dark:');
    expect(GLOBALS_CSS).toContain('--color-primary-cta: #f07f1a');
    expect(GLOBALS_CSS).toContain('--color-primary-cta-dark: #c2520a');
  });

  it('.hrp-btn-apply dung var(--color-apply-cta) lam background', () => {
    expect(GLOBALS_CSS).toMatch(
      /\.hrp-btn-apply\s*\{[^}]*background-color:\s*var\(--color-apply-cta\)/,
    );
  });

  it('.hrp-btn-apply:hover dung var(--color-apply-cta-dark)', () => {
    expect(GLOBALS_CSS).toMatch(
      /\.hrp-btn-apply:hover:not\(:disabled\)\s*\{[^}]*background-color:\s*var\(--color-apply-cta-dark\)/,
    );
  });

  it('.hrp-btn-apply co focus-visible outline (a11y)', () => {
    expect(GLOBALS_CSS).toMatch(/\.hrp-btn-apply:focus-visible\s*\{[^}]*outline:\s*2px/);
  });

  it('.hrp-btn-apply co :disabled style (preview / isFull)', () => {
    expect(GLOBALS_CSS).toMatch(/\.hrp-btn-apply:disabled\s*\{[^}]*cursor:\s*not-allowed/);
  });
});
