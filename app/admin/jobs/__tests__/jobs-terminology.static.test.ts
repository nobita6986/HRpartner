/**
 * jobs-terminology.static.test.ts — T1B Wave 2 (EP §5.2 / L-010..L-018).
 *
 * Static guard for `/admin/projects` (Project list). Wave 1 already shipped the
 * F11 business-button literals `Công bố dự án` / `Bỏ công bố dự án` and
 * the editor shell display `Đăng tin / Gỡ tin / Lưu trữ` (fenced by
 * `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts`).
 *
 * This test focuses on the Wave 2 surface:
 *   - Column header `Publish` → `Công bố` (EP §3.1 #1 / T0 #1).
 *   - Column header `Project` → `Dự án` (EP §3.5 #7).
 *   - Column header `Code` → `Mã dự án` (EP §3.5 #8).
 *   - Column header `Status` → `Trạng thái` (EP §3.5 #9).
 *   - Publish column status: raw `Published` / `Unpublished` / `Closed`
 *     replaced with Vietnamese labels via `projectPublishColumnLabel()`.
 *   - No raw English `Published` / `Unpublished` / `Closed` in JSX.
 *   - Empty state copy updated.
 *
 * hrp-t1a-introduce-hrp-and-menu-cleanup: the surface has moved from
 * `/admin/jobs` to `/admin/projects` (T0 directive §B.1). The test
 * target was moved accordingly; the surface itself is unchanged.
 *
 * Pure filesystem test — no DOM, no React, no DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// hrp-t1a-introduce-hrp-and-menu-cleanup: surface moved from
// /admin/jobs to /admin/projects. /admin/jobs is now a server-component
// 307 redirect to /admin/projects, so the static guards now point at the
// new owner page.
const PROJECTS_PAGE_PATH = join(process.cwd(), 'app/admin/projects/page.tsx');
const PROJECTS_SOURCE = readFileSync(PROJECTS_PAGE_PATH, 'utf8');

describe('hrp-admin-localization-wave2 — /admin/projects terminology (L-010..L-018)', () => {
  // RQ-06 / AC-06 — column-derived publish status routed through dictionary.
  it('publish column status uses domain dictionary + shared <StatusBadge> (no raw English)', () => {
    // Wave 2 routes the raw ternary `Published` / `Unpublished` / `Closed`
    // through `projectPublishColumnLabel()`. The inline `STATUS_COLORS` map
    // is removed (no longer rendered as JSX).
    expect(PROJECTS_SOURCE).not.toMatch(/isPublic\s*\?\s*'Published'/);
    expect(PROJECTS_SOURCE).not.toMatch(/'Unpublished'\s*:\s*'Published'/);
    expect(PROJECTS_SOURCE).not.toMatch(/>\s*Closed\s*<\/span>/);
    // Dictionary import is present.
    expect(PROJECTS_SOURCE).toMatch(/projectPublishColumnLabel/);
    // Shared primitive is used.
    expect(PROJECTS_SOURCE).toMatch(/<StatusBadge\b/);
  });

  // RQ-06 — column header rebindings (EP §3.1 #1, §3.5 #7/#8/#9).
  // hrp-t1a-introduce-hrp-and-menu-cleanup: the headers array is built
  // dynamically from a string[]; the rendered text only exists at runtime,
  // not as a literal in source. The static guard therefore asserts on the
  // header literals present in the source array.
  it('table column headers are Vietnamese', () => {
    expect(PROJECTS_SOURCE).toMatch(/>\s*Dự án\s*</);
    expect(PROJECTS_SOURCE).toMatch(/'Mã dự án'/);
    expect(PROJECTS_SOURCE).toMatch(/>\s*Trạng thái\s*</);
    expect(PROJECTS_SOURCE).toMatch(/'Công bố'/);
  });

  // RQ-06 — legacy English column headers REMOVED from JSX.
  it('legacy English column headers (Publish / Project / Code / Status) are REMOVED from JSX', () => {
    expect(PROJECTS_SOURCE).not.toMatch(/>\s*Publish\s*<\/th>/);
    expect(PROJECTS_SOURCE).not.toMatch(/>\s*Project\s*<\/th>/);
    expect(PROJECTS_SOURCE).not.toMatch(/>\s*Code\s*<\/th>/);
    expect(PROJECTS_SOURCE).not.toMatch(/>\s*Status\s*<\/th>/);
  });

  // RQ-06 — empty state copy (EP §3.5 #49).
  it('empty state copy uses Vietnamese', () => {
    expect(PROJECTS_SOURCE).toMatch(/Chưa có dự án công khai/);
    // Legacy "Chưa có job public nào" removed.
    expect(PROJECTS_SOURCE).not.toMatch(/Chưa có job public nào/);
  });

  // F11 fence guard — Wave 1 business-button literals still present.
  it('F11 business-button literals on /admin/projects are preserved', () => {
    expect(PROJECTS_SOURCE).toMatch(/Công bố dự án/);
    expect(PROJECTS_SOURCE).toMatch(/Bỏ công bố dự án/);
  });

  // Encoding: LF-only, no UTF-8 BOM (RQ-18 / AC-21).
  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(PROJECTS_SOURCE).not.toMatch(/\r\n/);
    expect(PROJECTS_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
