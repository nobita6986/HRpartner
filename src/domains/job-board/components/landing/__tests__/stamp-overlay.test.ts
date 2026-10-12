/**
 * stamp-overlay.test.ts — hrp-ui-v1-public-card-truth-correction (T1A / DEC-01..DEC-05,
 * RQ-01..RQ-05).
 *
 * Static source-analysis test cho canonical shared stamp visual DUY NHẤT:
 *
 *   - `<JobStampOverlay>` ở `stamp-overlay.tsx` là renderer canonical cho mọi public card
 *     (homepage FeaturedJobCard, `/viec-lam` listing, `/viec-lam/[slug]` detail).
 *   - Component derive qua `deriveStampsFromFlags` từ 4 flag boolean — single source of
 *     truth ở `stamp-defs.ts`. KHÔNG `stamps?` override prop (đó là RC-02 root cause).
 *   - Wrapper per stamp có class `job-stamp-attention` + `motion-reduce:animate-none
 *     motion-reduce:opacity-100` để CSS keyframe `job-stamp-blink` chỉ animate stamp;
 *     reduced-motion tắt animation và set opacity = 1.
 *   - Các file page KHÔNG chứa STAMP_RANK inline / re-implement sort thủ công.
 *   - Cả listing + detail + (FeaturedJobCard) chỉ dùng `<JobStampOverlay>` — không còn
 *     flat pill `<JobStampBadge>` ở public surface (đó là RC-01 visual drift).
 *
 * Lý do static: mỗi lệch giữa các file là loại bug fence khó tìm (drift) trong quá
 * trình refactor; đo trực tiếp trên mã nguồn là cách duy nhất chặt.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

const STAMP_DEFS = 'src/domains/job-board/components/landing/stamp-defs.ts';
const STAMP_OVERLAY = 'src/domains/job-board/components/landing/stamp-overlay.tsx';
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
  const re =
    typeof pattern === 'string'
      ? new RegExp(pattern, 'g')
      : new RegExp(
          pattern.source,
          pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g',
        );
  return src.split(re).length - 1;
};

describe('hrp-ui-v1-public-card-truth-correction (T1A / RQ-01, RQ-02) — derive helper là canonical', () => {
  const defs = raw(STAMP_DEFS);

  it('stamp-defs.ts export `deriveStampsFromFlags` 4-arg signature', () => {
    expect(defs).toContain('export function deriveStampsFromFlags');
    const stripped = strip(defs);
    // Signature chính xác `(isHot, isUrgent, isHighReward, isExpiringSoon)`: StampKey[]`
    expect(stripped).toMatch(
      /export\s+function\s+deriveStampsFromFlags\s*\(\s*[\s\S]*?isHot\s*:\s*boolean\s*[\s\S]*?isUrgent\s*:\s*boolean\s*[\s\S]*?isHighReward\s*:\s*boolean\s*[\s\S]*?isExpiringSoon\s*:\s*boolean[\s\S]*?\)\s*:\s*StampKey\[\]/,
    );
  });

  it('helper sort theo STAMP_RANK (tuyen-gap trước hot)', () => {
    const stripped = strip(defs);
    expect(stripped).toMatch(/deriveStampsFromFlags[\s\S]*?sort\([\s\S]*?STAMP_RANK\s*\[/);
  });

  it('helper KHÔNG heuristic từ salary / postedAt / hash', () => {
    const stripped = strip(defs);
    expect(stripped).not.toContain('salary');
    expect(stripped).not.toContain('postedAt');
    expect(stripped).not.toContain('hash');
  });

  it('registry 4 key canonical + 1 legacy `moi` — không drift', () => {
    const stripped = strip(defs);
    expect(stripped).toContain("'tuyen-gap'");
    expect(stripped).toContain("'hot'");
    expect(stripped).toContain("'sap-het-han'");
    expect(stripped).toContain("'thuong-cao'");
    expect(stripped).toContain("'moi'");
    expect(stripped).toMatch(/'tuyen-gap':\s*0/);
    expect(stripped).toMatch(/'hot':\s*1/);
  });
});

describe('hrp-ui-v1-public-card-truth-correction (T1A / RQ-01) — <JobStampOverlay> là canonical renderer', () => {
  const overlay = raw(STAMP_OVERLAY);

  it('file tồn tại và export `<JobStampOverlay>` function component', () => {
    expect(overlay.length).toBeGreaterThan(0);
    expect(strip(overlay)).toMatch(/export\s+function\s+JobStampOverlay\s*\(\s*\{/);
  });

  it('component import `deriveStampsFromFlags` từ stamp-defs (single source)', () => {
    expect(overlay).toMatch(
      /import\s*\{[^}]*deriveStampsFromFlags[^}]*\}\s*from\s*['"]\.\/stamp-defs['"]/,
    );
  });

  it('KHÔNG có prop `stamps?` override (RC-02: partial override nuốt 4 boolean)', () => {
    const stripped = strip(overlay);
    expect(stripped).not.toMatch(/stamps\?\s*:\s*StampKey\[\]/);
    expect(stripped).not.toContain('stamps?:');
    // Cũng không có destructure `stamps` từ props.
    expect(stripped).not.toMatch(/JobStampOverlayProps[\s\S]*?\{[\s\S]*?stamps/);
  });

  it('props có đúng 4 flag canonical: isHot, isUrgent, isHighReward, isExpiringSoon', () => {
    const stripped = strip(overlay);
    expect(stripped).toContain('isHot:');
    expect(stripped).toContain('isUrgent:');
    expect(stripped).toContain('isHighReward:');
    expect(stripped).toContain('isExpiringSoon:');
  });

  it('mỗi stamp render với class hook `job-stamp-attention`', () => {
    expect(overlay).toContain('job-stamp-attention');
  });

  it('mỗi stamp có class `motion-reduce:animate-none motion-reduce:opacity-100`', () => {
    expect(overlay).toContain('motion-reduce:animate-none');
    expect(overlay).toContain('motion-reduce:opacity-100');
  });

  it('mỗi stamp có data-testid + data-stamp-key + data-stamp-index cho QA selector', () => {
    expect(overlay).toContain('data-testid="job-stamp"');
    expect(overlay).toContain('data-stamp-key');
    expect(overlay).toContain('data-stamp-index');
  });

  it('mỗi stamp có `aria-label` từ STAMPS registry', () => {
    expect(overlay).toMatch(/aria-label=\{def\.ariaLabel\}/);
  });

  it('render null khi danh sách stamp rỗng — caller không phải check', () => {
    const stripped = strip(overlay);
    expect(stripped).toMatch(/keys\.length\s*===\s*0[\s\S]{0,80}return\s+null/);
  });

  it('size variant "sm" và "md" đều được support', () => {
    expect(overlay).toMatch(/size\?\s*:\s*'sm'\s*\|\s*'md'/);
    // size === 'md' phân nhánh ở padding + labelClass + iconSizeClass.
    expect(overlay).toMatch(/size === 'md'/);
  });

  it('stamp position là absolute + offset (top:-8+idx*8, left:-8+idx*18) để không chồng', () => {
    // Visual canonical = homepage cũ: stamp sau lệch phải+xuống để không chồng hoàn toàn.
    expect(overlay).toContain('-8 + offsetY');
    expect(overlay).toContain('-8 + offsetX');
    expect(overlay).toContain('offsetX = idx * 18');
    expect(overlay).toContain('offsetY = idx * 8');
  });

  it('stamp pointer-events-none — không chặn card CTA', () => {
    expect(overlay).toContain('pointer-events-none');
  });

  it('KHÔNG import package mới — chỉ React type + internal stamp-defs', () => {
    const stripped = strip(overlay);
    const importLines = stripped.match(/^import\s[^;]+;?/gm) ?? [];
    expect(importLines.length).toBeGreaterThan(0);
    for (const line of importLines) {
      const isTypeOnly = /^import\s+type\s/.test(line.trim());
      if (!isTypeOnly) {
        expect(line).toMatch(/from\s+['"]\.\/stamp-defs['"]/);
      }
    }
  });
});

describe('hrp-ui-v1-public-card-truth-correction (T1A / RQ-03..RQ-05) — DRY check trên 3 public surface', () => {
  it('listing /viec-lam dùng `<JobStampOverlay>` (KHÔNG còn JobStampBadge flat pill)', () => {
    const page = raw(LISTING_PAGE);
    expect(page).toMatch(
      /import\s*\{\s*JobStampOverlay\s*\}\s*from\s+['"]@\/src\/domains\/job-board\/components\/landing\/stamp-overlay['"]/,
    );
    // RC-01: không còn import JobStampBadge (flat pill).
    expect(page).not.toMatch(/from\s+['"][^'"]*stamp-badge['"]/);
    expect(page).not.toContain('JobStampBadge');
  });

  it('listing /viec-lam KHÔNG tự sort STAMP_RANK inline (đã giao cho JobStampOverlay)', () => {
    const page = raw(LISTING_PAGE);
    const stripped = strip(page);
    // sort chỉ sống ở `stamp-defs.ts` (canonical). Nếu page có call STAMP_RANK[...] ngoài import
    // type narrowing, đó là drift — vẫn còn heuristic inline.
    expect(
      count(stripped, /STAMP_RANK\[/) - count(stripped, /from\s+['"][^'"]*stamp-defs['"]/g),
    ).toBeLessThanOrEqual(0);
  });

  it('listing /viec-lam truyền 4 flag cho JobStampOverlay (không partial 2-arg)', () => {
    const page = raw(LISTING_PAGE);
    // Phát hiện: page có gọi `<JobStampOverlay` thì phải kèm 4 prop boolean.
    expect(page).toMatch(/<JobStampOverlay/);
    // Không có call 2-arg hoặc 3-arg — `deriveStampsFromFlags` đã move vào component, nhưng
    // nếu page nào đó vẫn gọi trực tiếp `deriveStampsFromFlags(` thì phải đủ 4 arg.
    const partial = page.match(/deriveStampsFromFlags\s*\(([^)]*)\)/g) ?? [];
    for (const call of partial) {
      const args = call.match(/,/g)?.length ?? 0;
      // ≤ 3 dấu phẩy ⇒ < 4 arg ⇒ FAIL.
      expect(args, `partial deriveStampsFromFlags call: ${call}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('listing /viec-lam KHÔNG còn span stamp inline', () => {
    const page = raw(LISTING_PAGE);
    expect(page).not.toContain('data-testid="job-stamp"');
    expect(page).not.toContain('bg-red-500');
  });

  it('listing /viec-lam container có `position: relative` + không overflow-hidden', () => {
    // Stamp là absolute (-top-2 -left-2) — caller cần `position: relative` để không bay ra ngoài flow.
    const page = raw(LISTING_PAGE);
    // JobCard article element có class `relative` (container).
    expect(page).toMatch(/className="[^"]*relative[^"]*"/);
    // KHÔNG `overflow-hidden` ở CardHeader/article (stamp tràn viền).
    expect(page).not.toMatch(/overflow-hidden/);
  });

  it('detail /viec-lam/[slug] dùng `<JobStampOverlay>` (KHÔNG còn JobStampBadge)', () => {
    const page = raw(DETAIL_PAGE);
    // import có thể được wrap multi-line (`import {\\n  JobStampOverlay,\\n} from ...`) — regex
    // dưới đây cho phép xuống dòng giữa `{` và `JobStampOverlay` qua `[\s\S]*?`.
    expect(page).toMatch(
      /import\s*\{[\s\S]*?JobStampOverlay[\s\S]*?\}\s*from\s+['"]@\/src\/domains\/job-board\/components\/landing\/stamp-overlay['"]/,
    );
    expect(page).not.toContain('JobStampBadge');
    expect(page).not.toMatch(/from\s+['"][^'"]*stamp-badge['"]/);
  });

  it('detail /viec-lam/[slug] KHÔNG gọi deriveStampsFromFlags trực tiếp nữa (đã giao cho JobStampOverlay)', () => {
    // Sau hotfix: JobStampOverlay tự derive; page không nên pre-compute `stamps: StampKey[]`.
    const page = raw(DETAIL_PAGE);
    expect(page).not.toMatch(/deriveStampsFromFlags\s*\(/);
    expect(page).not.toMatch(/stamps=\{[^}]*StampKey/);
  });

  it('home FeaturedJobCard dùng `<JobStampOverlay>` (KHÔNG local RubberStamp)', () => {
    const card = raw(FEATURED_CARD);
    // RC-01: featured-job-card từng có local `function RubberStamp`. Sau hotfix, nó import
    // `<JobStampOverlay>` từ `./stamp-overlay` để đồng bộ visual với listing + detail.
    expect(card).toMatch(
      /import\s*\{[^}]*JobStampOverlay[^}]*\}\s*from\s*['"]\.\/stamp-overlay['"]/,
    );
    // KHÔNG còn local function `RubberStamp` ở featured-job-card.tsx.
    expect(card).not.toMatch(/function\s+RubberStamp\s*\(/);
  });

  it('home `/app/(portal)/home/page.tsx` không có inline stamp render', () => {
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