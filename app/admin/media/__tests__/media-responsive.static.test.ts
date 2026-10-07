/**
 * media-responsive.static.test.ts — T1C admin-ux-hotfix 2 — DEC-08.
 *
 * Lock:
 *   - /admin/media có padding/gutter responsive (mobile → desktop).
 *   - Grid thư viện dùng 2 / 3 / 4 cols theo breakpoint (sm / lg).
 *   - Folder sidebar collapse thành 1 cột khi viewport < md.
 *   - KHÔNG dùng raw row click + horizontal scroll tràn viewport.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  join(process.cwd(), 'app/admin/media/media-library-client.tsx'),
  'utf8',
);

function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = stripComments(SOURCE);

describe('/admin/media — T1C admin-ux-hotfix 2 — responsive padding', () => {
  it('root container has horizontal + vertical padding that grows with viewport', () => {
    // Expect px-4 → sm:px-6 → lg:px-8 chained on the root.
    expect(CODE).toMatch(/px-4[^"]*sm:px-6[^"]*lg:px-8/);
  });

  it('root container is centered and bounded (max-w-7xl, mx-auto)', () => {
    expect(CODE).toMatch(/mx-auto[^"]*w-full[^"]*max-w-7xl|max-w-7xl[^"]*mx-auto/);
  });
});

describe('/admin/media — T1C admin-ux-hotfix 2 — responsive grid', () => {
  it('media grid collapses to 2 cols on mobile, 3 on sm, 4 on lg', () => {
    expect(CODE).toContain('grid-cols-2');
    expect(CODE).toContain('sm:grid-cols-3');
    expect(CODE).toContain('lg:grid-cols-4');
  });

  it('folder sidebar collapses to 1 col on mobile and shows fixed 220px sidebar at md+', () => {
    expect(CODE).toContain('grid-cols-1');
    expect(CODE).toContain('md:grid-cols-[220px_1fr]');
  });

  it('search form stacks vertically on mobile and aligns row at sm+', () => {
    expect(CODE).toMatch(/flex-col[^"]*sm:flex-row[^"]*sm:items-center/);
  });
});

describe('/admin/media — T1C admin-ux-hotfix 2 — encoding hygiene', () => {
  it('is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});