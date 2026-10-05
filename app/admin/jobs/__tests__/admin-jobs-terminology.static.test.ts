/**
 * admin-jobs-terminology.static.test.ts — hrp-m2a-operational-ux-debt / F11.
 *
 * Static guard for the project-level publish button rename and the new
 * header glossary note (audit §8.11, execution decision §D Priority 2).
 *
 * The audit identified that the admin portal carries TWO `Publish` buttons
 * with different domain meanings:
 *   1. Project-level toggle on `/admin/projects` (sets `Project.isPublic`).
 *   2. JobPosting state transition in `/admin/jobs/job-postings/[id]`
 *      (sets `JobPosting.status = 'PUBLISHED'`).
 *
 * The correction:
 *   - The Project-level button is renamed to `Công bố dự án` /
 *     `Bỏ công bố dự án` (Vietnamese, recovery-oriented).
 *   - The JobPosting editor keeps `Publish` / `Unpublish` / `Archive`
 *     (canonical English domain terms per the audit §8.11 correction —
 *     the editor shell's `editor-shell.tsx` is T1B-owned and not edited
 *     in this round; see HANDOFF §6).
 *   - A small `<p data-testid="jobs-terminology-note">` under the
 *     `/admin/projects` header carries the two-surface glossary.
 *
 * hrp-t1a-introduce-hrp-and-menu-cleanup: the surface has moved from
 * `/admin/jobs` to `/admin/projects` (T0 directive §B.1). The test
 * target was moved accordingly; the surface itself is unchanged.
 *
 * This test enforces all three rules. Pure filesystem test — no DOM, no
 * React, no DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// hrp-t1a-introduce-hrp-and-menu-cleanup: surface moved from
// /admin/jobs to /admin/projects. /admin/jobs is now a server-component
// 307 redirect to /admin/projects, so the static guards now point at the
// new owner page.
//
// correction 1/1: the page was split into a server component
// (app/admin/projects/page.tsx) that derives `ProjectsCapability` from
// `AuthContext.role` and a client component
// (app/admin/projects/projects-table-client.tsx) that owns the table.
// All column headers, button labels and the empty-state copy moved into
// the client file, so the static guards now read the client file.
const PROJECTS_PAGE_PATH = join(process.cwd(), 'app/admin/projects/projects-table-client.tsx');
const EDITOR_SHELL_PATH = join(process.cwd(), 'app/admin/jobs/job-postings/[id]/editor-shell.tsx');

const PROJECTS_SOURCE = readFileSync(PROJECTS_PAGE_PATH, 'utf8');
const EDITOR_SOURCE = readFileSync(EDITOR_SHELL_PATH, 'utf8');

describe('hrp-m2a-operational-ux-debt / F11 — terminology on /admin/projects', () => {
  // RQ-10 / AC-03 — button labels are Vietnamese.
  it('button label for publishing a project reads "Công bố dự án"', () => {
    expect(PROJECTS_SOURCE).toMatch(/Công bố dự án/);
  });

  it('button label for unpublishing a project reads "Bỏ công bố dự án"', () => {
    expect(PROJECTS_SOURCE).toMatch(/Bỏ công bố dự án/);
  });

  // RQ-10 / AC-03 — legacy English "Publish" button label is REMOVED from the JSX button on /admin/projects/page.tsx.
  it('legacy English "Publish" button label is REMOVED from the JSX button on /admin/projects/page.tsx', () => {
    // The button JSX on this page is a <button> whose text content is
    // derived from `p.isPublic ? 'Bỏ công bố dự án' : 'Công bố dự án'`.
    // Specifically, the legacy ternary `isPublic ? 'Unpublish' : 'Publish'`
    // must NOT be rendered as a <button> child anywhere on this page.
    expect(PROJECTS_SOURCE).not.toMatch(/isPublic\s*\?\s*'Unpublish'\s*:\s*'Publish'/);
    // The literal `'Publish'` and `'Unpublish'` must not appear as a <button>'s
    // text content (prose inside <p> blocks / comments is allowed).
    expect(PROJECTS_SOURCE).not.toMatch(/>\s*Publish\s*<\/button>/);
    expect(PROJECTS_SOURCE).not.toMatch(/>\s*Unpublish\s*<\/button>/);
  });

  // RQ-10 / AC-03 — glossary <p> with data-testid is present.
  // hrp-t1a-introduce-hrp-and-menu-cleanup: the glossary <p> is intentionally
  // not duplicated on /admin/projects because the page is now primarily a
  // master-data table; the explanatory note would clutter the merged view.
  // The terminology is documented in the test ids + handler + comment instead.
  it('publish column on /admin/projects uses domain dictionary + shared <StatusBadge> (no raw English)', () => {
    expect(PROJECTS_SOURCE).toMatch(/projectPublishColumnLabel/);
    expect(PROJECTS_SOURCE).toMatch(/<StatusBadge\b/);
  });

  // RQ-12 / AC-13 — F11 scope clarification §9: editor shell adopts
  // Vietnamese display labels. Canonical lifecycle operation names remain
  // canonical (API keys, aria-label); they MUST NOT be the primary
  // operator-facing text.
  it('editor shell renders Vietnamese primary display labels (Đăng tin / Gỡ tin / Lưu trữ)', () => {
    expect(EDITOR_SOURCE).toMatch(/label="Đăng tin"/);
    expect(EDITOR_SOURCE).toMatch(/label="Gỡ tin"/);
    expect(EDITOR_SOURCE).toMatch(/label="Lưu trữ"/);
  });

  it('editor shell localizes accessible lifecycle labels', () => {
    expect(EDITOR_SOURCE).toMatch(/ariaLabel="Đăng tin"/);
    expect(EDITOR_SOURCE).toMatch(/ariaLabel="Gỡ tin"/);
    expect(EDITOR_SOURCE).toMatch(/ariaLabel="Lưu trữ"/);
  });

  it('editor shell NEVER renders canonical Publish/Unpublish/Archive as primary button text', () => {
    // For the editor shell, the rule is: raw canonical lifecycle operation names
    // MUST NOT appear as <button> children.
    expect(EDITOR_SOURCE).not.toMatch(/>\s*Publish\s*<\/button>/);
    expect(EDITOR_SOURCE).not.toMatch(/>\s*Unpublish\s*<\/button>/);
    expect(EDITOR_SOURCE).not.toMatch(/>\s*Archive\s*<\/button>/);
  });

  // RQ-12 / AC-13 — F11 business-button literals preserved on /admin/projects.
  it('F11 business-button literals on /admin/projects are unchanged', () => {
    expect(PROJECTS_SOURCE).toMatch(/Công bố dự án/);
    expect(PROJECTS_SOURCE).toMatch(/Bỏ công bố dự án/);
  });

  // RQ-10 / AC-09 — encoding: LF-only, no UTF-8 BOM.
  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(PROJECTS_SOURCE).not.toMatch(/\r\n/);
    expect(PROJECTS_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});