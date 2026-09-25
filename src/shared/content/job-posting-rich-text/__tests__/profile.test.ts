/**
 * Unit tests for the shared JobPosting rich-text profile.
 *
 * These tests are PURE (no DB, no editor mount, no DOM) — they assert the
 * allowlist/limit constants and the version pinning. Validator and renderer
 * behaviour is covered in sibling test files.
 */

import { describe, it, expect } from 'vitest';
import {
  JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS,
  JOB_POSTING_RICH_TEXT_ALLOWED_MARKS,
  JOB_POSTING_RICH_TEXT_ALLOWED_NODES,
  JOB_POSTING_RICH_TEXT_MAX_BYTES,
  JOB_POSTING_RICH_TEXT_MAX_DEPTH,
  JOB_POSTING_RICH_TEXT_MAX_NODES,
  JOB_POSTING_RICH_TEXT_MAX_URL_BYTES,
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
} from '@/src/shared/content/job-posting-rich-text';

describe('job-posting-rich-text/profile', () => {
  it('locks schema version to 1 (fail-closed for future versions)', () => {
    expect(JOB_POSTING_RICH_TEXT_SCHEMA_VERSION).toBe(1);
  });

  it('only allows the approved node allowlist', () => {
    expect([...JOB_POSTING_RICH_TEXT_ALLOWED_NODES].sort()).toEqual(
      ['bulletList', 'doc', 'heading', 'listItem', 'orderedList', 'paragraph', 'text'].sort(),
    );
    // Explicit denials for OD-P1A-03 — image, iframe, video, code/codeBlock, raw HTML.
    for (const banned of ['image', 'iframe', 'video', 'code', 'codeBlock', 'html', 'script', 'style', 'blockquote', 'strike', 'underline', 'horizontalRule']) {
      expect(JOB_POSTING_RICH_TEXT_ALLOWED_NODES).not.toContain(banned);
    }
  });

  it('only allows the approved mark allowlist', () => {
    expect([...JOB_POSTING_RICH_TEXT_ALLOWED_MARKS].sort()).toEqual(['bold', 'italic', 'link'].sort());
    for (const banned of ['code', 'strike', 'underline', 'subscript', 'superscript', 'highlight']) {
      expect(JOB_POSTING_RICH_TEXT_ALLOWED_MARKS).not.toContain(banned);
    }
  });

  it('restricts heading levels to {2, 3}', () => {
    expect([...JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS].sort()).toEqual([2, 3]);
  });

  it('enforces documented limits (size, nodes, depth, URL)', () => {
    expect(JOB_POSTING_RICH_TEXT_MAX_BYTES).toBe(64 * 1024);
    expect(JOB_POSTING_RICH_TEXT_MAX_NODES).toBe(1_000);
    expect(JOB_POSTING_RICH_TEXT_MAX_DEPTH).toBe(16);
    expect(JOB_POSTING_RICH_TEXT_MAX_URL_BYTES).toBe(2_048);
  });
});
