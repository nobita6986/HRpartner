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
    // The glossary MUST mention both surfaces by their actual labels.
    const glossarySlice = JOBS_SOURCE.match(
      /<p[^>]*data-testid=("|')jobs-terminology-note\1[^>]*>([\s\S]*?)<\/p>/,
    );
    expect(glossarySlice).not.toBeNull();
    const inner = glossarySlice![2]!;
    expect(inner).toContain('Công bố dự án');
    expect(inner).toContain('Publish');
    expect(inner).toContain('JobPosting');
    expect(inner).toContain('PUBLISHED');
  });

  // RQ-07 / AC-04 — JobPosting editor shell keeps the canonical English
  // `Publish` label (NOT renamed). This is the audit §8.11 boundary.
  it('editor shell keeps the canonical English `Publish` label (NOT renamed)', () => {
    expect(EDITOR_SOURCE).toMatch(/label="Publish"/);
    // The editor shell is not edited in this round (T1B-owned per audit §G.A.1).
    // We assert the editorial note from this round does NOT leak into the
    // editor shell source. The Vietnamese rename label must not appear.
    expect(EDITOR_SOURCE).not.toMatch(/Công bố dự án/);
    expect(EDITOR_SOURCE).not.toMatch(/Bỏ công bố dự án/);
  });

  // RQ-10 / AC-09 — encoding: LF-only, no UTF-8 BOM.
  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(JOBS_SOURCE).not.toMatch(/\r\n/);
    expect(JOBS_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});