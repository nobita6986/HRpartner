/**
 * jobs-terminology.static.test.ts — T1B Wave 2 (EP §5.2 / L-010..L-018).
 *
 * Static guard for `/admin/jobs` (Project list). Wave 1 already shipped the
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
 * Pure filesystem test — no DOM, no React, no DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const JOBS_PAGE_PATH = join(process.cwd(), 'app/admin/jobs/page.tsx');
const JOBS_SOURCE = readFileSync(JOBS_PAGE_PATH, 'utf8');

describe('hrp-admin-localization-wave2 — /admin/jobs terminology (L-010..L-018)', () => {
  // RQ-06 / AC-06 — column-derived publish status routed through dictionary.
  it('publish column status uses domain dictionary + shared <StatusBadge> (no raw English)', () => {
    // Wave 2 routes the raw ternary `Published` / `Unpublished` / `Closed`
    // through `projectPublishColumnLabel()`. The inline `STATUS_COLORS` map
    // is removed (no longer rendered as JSX).
    expect(JOBS_SOURCE).not.toMatch(/isPublic\s*\?\s*'Published'/);
    expect(JOBS_SOURCE).not.toMatch(/'Unpublished'\s*:\s*'Published'/);
    expect(JOBS_SOURCE).not.toMatch(/>\s*Closed\s*<\/span>/);
    // Dictionary import is present.
    expect(JOBS_SOURCE).toMatch(/projectPublishColumnLabel/);
    // Shared primitive is used.
    expect(JOBS_SOURCE).toMatch(/<StatusBadge\b/);
  });

  // RQ-06 — column header rebindings (EP §3.1 #1, §3.5 #7/#8/#9).
  it('table column headers are Vietnamese', () => {
    expect(JOBS_SOURCE).toMatch(/>\s*Dự án\s*</);
    expect(JOBS_SOURCE).toMatch(/>\s*Mã dự án\s*</);
    expect(JOBS_SOURCE).toMatch(/>\s*Trạng thái\s*</);
    expect(JOBS_SOURCE).toMatch(/>\s*Công bố\s*</);
  });

  // RQ-06 — legacy English column headers REMOVED from JSX.
  it('legacy English column headers (Publish / Project / Code / Status) are REMOVED from JSX', () => {
    expect(JOBS_SOURCE).not.toMatch(/>\s*Publish\s*<\/th>/);
    expect(JOBS_SOURCE).not.toMatch(/>\s*Project\s*<\/th>/);
    expect(JOBS_SOURCE).not.toMatch(/>\s*Code\s*<\/th>/);
    expect(JOBS_SOURCE).not.toMatch(/>\s*Status\s*<\/th>/);
  });

  // RQ-06 — empty state copy (EP §3.5 #49).
  it('empty state copy uses Vietnamese', () => {
    expect(JOBS_SOURCE).toMatch(/Chưa có dự án công khai/);
    // Legacy "Chưa có job public nào" removed.
    expect(JOBS_SOURCE).not.toMatch(/Chưa có job public nào/);
  });

  // F11 fence guard — Wave 1 business-button literals still present.
  it('F11 business-button literals on /admin/jobs are preserved', () => {
    expect(JOBS_SOURCE).toMatch(/Công bố dự án/);
    expect(JOBS_SOURCE).toMatch(/Bỏ công bố dự án/);
  });

  // Encoding: LF-only, no UTF-8 BOM (RQ-18 / AC-21).
  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(JOBS_SOURCE).not.toMatch(/\r\n/);
    expect(JOBS_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
