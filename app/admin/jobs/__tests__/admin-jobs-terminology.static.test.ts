/**
 * admin-jobs-terminology.static.test.ts — hrp-m2a-operational-ux-debt / F11.
 *
 * Static guard for the project-level publish button rename and the new
 * header glossary note (audit §8.11, execution decision §D Priority 2).
 *
 * The audit identified that the admin portal carries TWO `Publish` buttons
 * with different domain meanings:
 *   1. Project-level toggle on `/admin/jobs` (sets `Project.isPublic`).
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
 *     `/admin/jobs` header carries the two-surface glossary.
 *
 * This test enforces all three rules. Pure filesystem test — no DOM, no
 * React, no DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const JOBS_PAGE_PATH = join(process.cwd(), 'app/admin/jobs/page.tsx');
const EDITOR_SHELL_PATH = join(process.cwd(), 'app/admin/jobs/job-postings/[id]/editor-shell.tsx');

const JOBS_SOURCE = readFileSync(JOBS_PAGE_PATH, 'utf8');
const EDITOR_SOURCE = readFileSync(EDITOR_SHELL_PATH, 'utf8');

describe('hrp-m2a-operational-ux-debt / F11 — terminology on /admin/jobs', () => {
  // RQ-10 / AC-03 — button labels are Vietnamese.
  it('button label for publishing a project reads "Công bố dự án"', () => {
    expect(JOBS_SOURCE).toMatch(/Công bố dự án/);
  });

  it('button label for unpublishing a project reads "Bỏ công bố dự án"', () => {
    expect(JOBS_SOURCE).toMatch(/Bỏ công bố dự án/);
  });

  // RQ-10 / AC-03 — legacy English "Publish" button label is REMOVED from the JSX button on /admin/jobs/page.tsx.
  it('legacy English "Publish" button label is REMOVED from the JSX button on /admin/jobs/page.tsx', () => {
    // The button JSX on this page is a <button> whose text content is
    // derived from `job.isPublic ? 'Bỏ công bố dự án' : 'Công bố dự án'`.
    // Specifically, the legacy ternary `job.isPublic ? 'Unpublish' : 'Publish'`
    // must NOT be rendered as a <button> child anywhere on this page.
    expect(JOBS_SOURCE).not.toMatch(/job\.isPublic\s*\?\s*'Unpublish'\s*:\s*'Publish'/);
    // The literal `'Publish'` and `'Unpublish'` must not appear as a <button>'s
    // text content (prose inside <p> blocks / comments is allowed).
    expect(JOBS_SOURCE).not.toMatch(/>\s*Publish\s*<\/button>/);
    expect(JOBS_SOURCE).not.toMatch(/>\s*Unpublish\s*<\/button>/);
  });

  // RQ-10 / AC-03 — glossary <p> with data-testid is present.
  it('header glossary <p data-testid="jobs-terminology-note"> is present and references both surfaces', () => {
    // Match either single- or double-quoted attribute value.
    expect(JOBS_SOURCE).toMatch(/data-testid=("|')jobs-terminology-note\1/);
    // The glossary MUST explain both actions without exposing domain enum names.
    const glossarySlice = JOBS_SOURCE.match(
      /<p[^>]*data-testid=("|')jobs-terminology-note\1[^>]*>([\s\S]*?)<\/p>/,
    );
    expect(glossarySlice).not.toBeNull();
    const inner = glossarySlice![2]!;
    expect(inner).toContain('Công bố dự án');
    expect(inner).toContain('Đăng tin');
    expect(inner).toContain('tin tuyển dụng');
    expect(inner).not.toMatch(/JobPosting|PUBLISHED|Publish/);
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
    // The legacy ternary `job.isPublic ? 'Unpublish' : 'Publish'` rule no longer
    // applies (this test belongs to the Jobs page, not the editor shell). For
    // the editor shell, the rule is: raw canonical lifecycle operation names
    // MUST NOT appear as <button> children.
    expect(EDITOR_SOURCE).not.toMatch(/>\s*Publish\s*<\/button>/);
    expect(EDITOR_SOURCE).not.toMatch(/>\s*Unpublish\s*<\/button>/);
    expect(EDITOR_SOURCE).not.toMatch(/>\s*Archive\s*<\/button>/);
  });

  // RQ-12 / AC-13 — F11 business-button literals preserved on /admin/jobs.
  // (Already covered by the earlier `button label` assertions; this is a guard
  // against accidental rename during the editor-shell update.)
  it('F11 business-button literals on /admin/jobs are unchanged', () => {
    expect(JOBS_SOURCE).toMatch(/Công bố dự án/);
    expect(JOBS_SOURCE).toMatch(/Bỏ công bố dự án/);
  });

  // RQ-10 / AC-09 — encoding: LF-only, no UTF-8 BOM.
  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(JOBS_SOURCE).not.toMatch(/\r\n/);
    expect(JOBS_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});