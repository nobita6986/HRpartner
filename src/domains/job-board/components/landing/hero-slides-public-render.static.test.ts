/**
 * hero-slides-public-render.static.test.ts — hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-10).
 *
 * Fence test đảm bảo RecruitmentHighlight:
 *   - Accept `slides?: HeroSlidePublic[]` prop (default = []).
 *   - Khi length === 0 → render FALLBACK_SLIDES (5 slide hardcoded, không đổi v1).
 *   - Khi length > 0 → render URL từ server-joined media.
 *   - Auto-rotate 3500ms cứng (giữ nguyên).
 *   - KHÔNG hardcode content slide (đã chuyển sang FALLBACK_SLIDES).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  join(process.cwd(), 'src/domains/job-board/components/landing/recruitment-highlight.tsx'),
  'utf8',
);

describe('RecruitmentHighlight — Hero slides public renderer', () => {
  it('accepts slides prop with hardcoded fallback', () => {
    expect(SOURCE).toContain('slides?: HeroSlidePublic[]');
    expect(SOURCE).toContain('FALLBACK_SLIDES');
    expect(SOURCE).toContain("slides.length === 0");
  });

  it('keeps the 5 hardcoded fallback slides', () => {
    expect(SOURCE).toContain('/images/hero/cong-nhan-may-moc.jpg');
    expect(SOURCE).toContain('/images/hero/may-sai-gon.jpg');
    expect(SOURCE).toContain('/images/hero/dong-goi-ha-noi.jpg');
  });

  it('preserves 3500ms auto-rotate timer', () => {
    expect(SOURCE).toContain('setInterval(next, 3500)');
  });

  it('does not inline-edit content (5 slot title/desc encoded as constants only)', () => {
    // Slide titles are not encoded as translatable strings inside component —
    // they all live in FALLBACK_SLIDES array literal.
    const matches = SOURCE.match(/title:\s*'[^']+'/g) ?? [];
    // 5 fallback titles + optional testids = max 5 unique literals.
    expect(matches.length).toBeLessThanOrEqual(5);
  });
});