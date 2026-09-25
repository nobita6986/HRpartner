/**
 * job-posting-rich-text/profile.ts
 *
 * SINGLE SOURCE OF TRUTH for the JobPosting rich-text profile.
 *
 * Both A0 (admin authoring + persistence) and A1 (public detail rendering) MUST
 * import from this module. No other allowlist/limit/protocol constant may exist
 * for JobPosting rich content (see OD-P1A-02).
 *
 * Allowed:
 *   - nodes: doc, paragraph, text, heading (level 2 or 3), bulletList, orderedList, listItem
 *   - marks: bold, italic, link
 *
 * Limits (per rich field — description/requirements/benefits/applicationInstructions):
 *   - serialized UTF-8 JSON ≤ 64 KiB
 *   - node count ≤ 1,000
 *   - depth ≤ 16
 *   - link URL ≤ 2,048 bytes
 *   - links must use HTTPS; reject javascript:, data:, file:, protocol-relative
 *
 * `contentSchemaVersion` is locked to `1`. Any other value (including future
 * versions) is rejected fail-closed by the validator.
 */

export const JOB_POSTING_RICH_TEXT_SCHEMA_VERSION = 1 as const;

export const JOB_POSTING_RICH_TEXT_MAX_BYTES = 64 * 1024; // 64 KiB
export const JOB_POSTING_RICH_TEXT_MAX_NODES = 1_000;
export const JOB_POSTING_RICH_TEXT_MAX_DEPTH = 16;
export const JOB_POSTING_RICH_TEXT_MAX_URL_BYTES = 2_048;

export const JOB_POSTING_RICH_TEXT_ALLOWED_NODES = [
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
] as const;
export type JobPostingRichTextNodeName = (typeof JOB_POSTING_RICH_TEXT_ALLOWED_NODES)[number];

export const JOB_POSTING_RICH_TEXT_ALLOWED_MARKS = [
  'bold',
  'italic',
  'link',
] as const;
export type JobPostingRichTextMarkName = (typeof JOB_POSTING_RICH_TEXT_ALLOWED_MARKS)[number];

export const JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS = [2, 3] as const;

/** Tiptap/ProseMirror JSON shape (subset we care about). */
export interface JobPostingRichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface JobPostingRichTextNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JobPostingRichTextNode[];
  text?: string;
  marks?: JobPostingRichTextMark[];
}

/** Tiptap top-level JSON document. */
export interface JobPostingRichTextDoc {
  type?: string;
  content?: JobPostingRichTextNode[];
}
