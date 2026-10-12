/**
 * referral-strip-layout.static.test.ts — hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-10).
 *
 * Fence test đảm bảo ReferralStrip layout refinement:
 *   - Desktop (`lg+`): items-stretch + min-h-0 để 2 cột cao bẳng nhau; ảnh
 *     không vượt quá khối chữ bên cạnh.
 *   - Mobile: max-h-[420px] ngăn ảnh quá khổ khi xếp dọc.
 *   - object-cover object-center để crop đẹp.
 *   - KHÔNG đổi ảnh (vẫn dùng referral-team.webp).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  join(process.cwd(), 'src/domains/job-board/components/landing/referral-strip.tsx'),
  'utf8',
);

describe('ReferralStrip — CTV image layout refinement', () => {
  it('uses items-stretch so the two columns share height on desktop', () => {
    expect(SOURCE).toContain('items-stretch');
  });

  it('caps mobile image height to 420px', () => {
    expect(SOURCE).toContain('max-h-[420px]');
  });

  it('keeps the existing referral-team.webp image (no new image, no text/logo)', () => {
    expect(SOURCE).toContain('/images/homepage-huongb/referral-team.webp');
  });

  it('uses object-cover for crop behavior', () => {
    expect(SOURCE).toMatch(/object-cover/);
  });

  it('lifts image constraint on lg+ so desktop is balanced', () => {
    expect(SOURCE).toContain('lg:max-h-none');
    expect(SOURCE).toContain('lg:h-full');
  });
});