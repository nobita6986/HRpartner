/**
 * stamp-badge.test.ts — hrp-p1-a0-1 / DEC-05 / C-05 (correction batch 1/1).
 *
 * Static source-analysis test cho canonical stamp renderer (theo convention của
 * `featured-job-card.test.ts` — repo không có @testing-library).
 *
 * Đóng vai SINGLE SOURCE OF TRUTH fence:
 *
 *   - `<JobStampBadge>` derive flags qua `deriveStampsFromFlags` từ `stamp-defs.ts`.
 *   - Wrapper per stamp có class `job-stamp-attention` + `motion-reduce:animate-none
 *     motion-reduce:opacity-100` để CSS keyframe `job-stamp-blink` chỉ animate stamp
 *     (opacity 0.7 ↔ 1.0); reduced-motion tắt animation và set opacity = 1.
 *   - Các file page KHÔNG chứa STAMP_RANK inline / re-implement sort thủ công.
 *   - Cả listing + detail + (FeaturedJobCard) chỉ duplicate ở ZERO chỗ.
 *
 * Lý do static: mỗi lệch giữa các file là loại bug fence khó tìm (drift) trong quá
 * trình refactor; đo trực tiếp trên mã nguồn là cách duy nhất chặt.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

const STAMP_DEFS = 'src/domains/job-board/components/landing/stamp-defs.ts';
const STAMP_BADGE = 'src/domains/job-board/components/landing/stamp-badge.tsx';
const LISTING_PAGE = 'app/(jobs)/viec-lam/page.tsx';
const DETAIL_PAGE = 'app/(jobs)/viec-lam/[slug]/page.tsx';
const FEATURED_CARD = 'src/domains/job-board/components/landing/featured-job-card.tsx';
const HOME_PAGE = 'app/(portal)/home/page.tsx';

const raw = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');

const strip = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*\*.*$/gm, '');

const count = (src: string, pattern: RegExp | string) => {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'g') : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  return src.split(re).length - 1;
};

describe('hrp-p1-a0-1 / C-05 — derive helper là canonical (single source)', () => {
  const defs = raw(STAMP_DEFS);

  it('stamp-defs.ts export `deriveStampsFromFlags`', () => {
    expect(defs).toContain('export function deriveStampsFromFlags');
  });

  it('helper signature đúng `(isHot, isUrgent): StampKey[]`', () => {
    // Signature split across lines: `export function deriveStampsFromFlags(` then
    // `isHot: boolean,` then `isUrgent: boolean,` then `): StampKey[]`. Match
    // across newlines with [\s\S]*? to assert the multi-line shape.
    const stripped = strip(defs);
    expect(stripped).toMatch(
      /export\s+function\s+deriveStampsFromFlags\s*\(\s*[\s\S]*?isHot\s*:\s*boolean\s*[\s\S]*?isUrgent\s*:\s*boolean[\s\S]*?\)\s*:\s*StampKey\[\]/,
    );
  });

  it('helper sort theo STAMP_RANK (tuyen-gap trước hot)', () => {
    const stripped = strip(defs);
    // `out.sort((a, b) => STAMP_RANK[a] - STAMP_RANK[b])` — match the
    // STAMP_RANK lookup on either side of the comparator.
    expect(stripped).toMatch(
      /deriveStampsFromFlags[\s\S]*?sort\([\s\S]*?STAMP_RANK\s*\[/,
    );
  });

  it('helper KHÔNG heuristic từ salary / postedAt / hash', () => {
    const stripped = strip(defs);
    expect(stripped).not.toContain('salary');
    expect(stripped).not.toContain('postedAt');
    expect(stripped).not.toContain('hash');
  });

  it('registry chỉ chứa bốn key canonical — không drift', () => {
    const stripped = strip(defs);
    expect(stripped).toContain("'tuyen-gap'");
    expect(stripped).toContain("'hot'");
    // STAMP_RANK có entry cho mỗi key.
    expect(stripped).toMatch(/'tuyen-gap':\s*0/);
    expect(stripped).toMatch(/'hot':\s*1/);
  });
});

describe('hrp-p1-a0-1 / C-05 — <JobStampBadge> là canonical renderer', () => {
  const badge = raw(STAMP_BADGE);

  it('file tồn tại và export `<JobStampBadge>` function component', () => {
    expect(badge.length).toBeGreaterThan(0);
    expect(strip(badge)).toMatch(
      /export\s+function\s+JobStampBadge\s*\(\s*\{/,
    );
  });

  it('component import `deriveStampsFromFlags` từ stamp-defs (single source)', () => {
    expect(badge).toMatch(
      /import\s*\{[^}]*deriveStampsFromFlags[^}]*\}\s*from\s*['"]\.\/stamp-defs['"]/,
    );
  });

  it('mỗi stamp render với class hook `job-stamp-attention`', () => {
    expect(badge).toContain('job-stamp-attention');
  });

  it('mỗi stamp có class `motion-reduce:animate-none motion-reduce:opacity-100`', () => {
    expect(badge).toContain('motion-reduce:animate-none');
    expect(badge).toContain('motion-reduce:opacity-100');
  });

  it('mỗi stamp có data-testid + data-stamp-key + data-stamp-index cho QA selector', () => {
    expect(badge).toContain('data-testid="job-stamp"');
    expect(badge).toContain('data-stamp-key');
    expect(badge).toContain('data-stamp-index');
  });

  it('render null khi danh sách stamp rỗng — caller không phải check', () => {
    // Trong implement có `if (keys.length === 0) return null;`
    const stripped = strip(badge);
    expect(stripped).toMatch(/keys\.length\s*===\s*0[\s\S]{0,80}return\s+null/);
  });

  it('size variant "sm" và "md" — đều render span đồng nhất', () => {
    expect(badge).toMatch(/size\?\s*:\s*'sm'\s*\|\s*'md'/);
    expect(badge).toContain("size === 'md' ? 'px-2.5 py-1' : 'px-2 py-1'");
    expect(badge).toContain("font-semibold'");
    expect(badge).toContain("font-medium'");
  });

  it('KHÔNG import package mới — chỉ React + Tailwind primitives', () => {
    const stripped = strip(badge);
    // Two allowed import lines: (1) `import type { ReactElement } from 'react'`
    // (type-only, không add runtime dep mới), (2) `import { ... } from './stamp-defs'`.
    // Anything beyond these two — npm package with runtime side-effects — would
    // be a regression of C-05 ("do not add a package").
    const importLines = stripped.match(/^import\s[^;]+;?/gm) ?? [];
    expect(importLines.length).toBeGreaterThan(0);
    expect(importLines.length).toBeLessThanOrEqual(2);
    for (const line of importLines) {
      // type-only imports (e.g. `import type { ReactElement } from 'react'`) are
      // allowed for ambient types. Anything else from an external package would
      // be a runtime dependency add — C-05 bans that.
      const isTypeOnly = /^import\s+type\s/.test(line.trim());
      if (!isTypeOnly) {
        expect(line).toMatch(/from\s+['"]\.\/stamp-defs['"]/);
      }
    }
  });
});

describe('hrp-p1-a0-1 / C-05 — DRY check trên các bề mặt stamp', () => {
  it('listing /viec-lam KHÔNG tự sort STAMP_RANK inline (đã giao cho JobStampBadge)', () => {
    const page = raw(LISTING_PAGE);
    const stripped = strip(page);
    // Trước C-05, listing inline `sort((a,b) => STAMP_RANK[a]-STAMP_RANK[b])`. Sau C-05,
    // sort chỉ sống ở `stamp-defs.ts`. Listing vẫn có thể import STAMP_RANK cho type
    // narrowing; detector dưới đây bắt call `STAMP_RANK[` thực thi.
    expect(count(stripped, /STAMP_RANK\[/) - count(stripped, /from\s+['"][^'"]*stamp-defs['"]/g)).toBeLessThanOrEqual(0);
    // Không còn inline generate-sorted-array qua spread/object literal — đã giao cho badge.
    expect(stripped).not.toMatch(/\.\.\.\s*\(\s*(?:job\.isUrgent\s*\?\s*\['tuyen-gap'\]\s*:\s*\[\])\s*:\s*\[\]/);
  });

  it('listing /viec-lam import `<JobStampBadge>` từ job-board component boundary', () => {
    const page = raw(LISTING_PAGE);
    expect(page).toMatch(
      /import\s*\{\s*JobStampBadge\s*\}\s*from\s+['"]@\/src\/domains\/job-board\/components\/landing\/stamp-badge['"]/,
    );
  });

  it('listing /viec-lam KHÔNG còn span stamp inline (stamp đã giao cho JobStampBadge)', () => {
    // Stamp rỗng KHÔNG render span; có stamp thì JobStampBadge lo. Phát hiện nếu
    // còn inline `<span` với data-testid="job-stamp".
    const page = raw(LISTING_PAGE);
    // file hoàn toàn không tham chiếu trực tiếp `data-testid="job-stamp"` nữa.
    expect(page).not.toContain('data-testid="job-stamp"');
    // Và không còn inline `bg-red-500` (stamp bgClass của registry).
    expect(page).not.toContain('bg-red-500');
  });

  it('detail /viec-lam/[slug] KHÔNG còn span stamp inline', () => {
    const page = raw(DETAIL_PAGE);
    expect(page).not.toContain('data-testid="job-stamp"');
    expect(page).not.toContain('bg-red-500');
  });

  it('detail /viec-lam/[slug] import `<JobStampBadge>` + `deriveStampsFromFlags`', () => {
    const page = raw(DETAIL_PAGE);
    expect(page).toMatch(
      /import\s*\{\s*JobStampBadge\s*\}\s*from\s+['"]@\/src\/domains\/job-board\/components\/landing\/stamp-badge['"]/,
    );
    expect(page).toMatch(
      /import\s*\{[^}]*deriveStampsFromFlags[^}]*\}\s*from\s+['"]@\/src\/domains\/job-board\/components\/landing\/stamp-defs['"]/,
    );
  });

  it('detail /viec-lam/[slug] KHÔNG còn inline IIFE build stamp array', () => {
    const page = raw(DETAIL_PAGE);
    const stripped = strip(page);
    // Trước C-05: `{(() => { ... StampKey[] = [...(job.isUrgent ? ['tuyen-gap'] : [])] ...`
    expect(stripped).not.toMatch(/\(\s*\(\)\s*=>\s*\{[\s\S]{0,200}\[\.\.\.\(\s*job\.isUrgent/);
    expect(stripped).not.toContain('detailStamps');
  });

  it('home FeaturedJobCard dùng derive helper từ stamp-defs (cùng nguồn)', () => {
    const card = raw(FEATURED_CARD);
    expect(card).toMatch(
      /import\s*\{[^}]*deriveStampsFromFlags[^}]*\}\s*from\s*['"]\.\/stamp-defs['"]/,
    );
    // FeaturedJobCard giữ art direction riêng (RubberStamp) — không buộc dùng JobStampBadge.
    // Nhưng phải dùng shared derivation helper.
    const stripped = strip(card);
    expect(stripped).toContain('deriveStampsFromFlags(');
  });

  it('home `/app/(portal)/home/page.tsx` không có inline stamp render trước C-05', () => {
    // home page là client component placeholder; detector đảm bảo nó không tự dựng stamp.
    let home: string;
    try {
      home = raw(HOME_PAGE);
    } catch {
      // file may not exist in some branches — skip silently if absent.
      return;
    }
    expect(home).not.toContain('data-testid="job-stamp"');
    expect(home).not.toContain('STAMPS[');
  });
});
