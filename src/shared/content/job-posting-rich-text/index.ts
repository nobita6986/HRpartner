/**
 * job-posting-rich-text/index.ts
 *
 * Public surface of the shared rich-content boundary.
 *
 * A0 (admin authoring/persistence) and A1 (public detail) MUST import from
 * this module. No duplicated allowlists, limits or link policy elsewhere in
 * the codebase. See OD-P1A-02 + DEC-05.
 */

export {
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
  JOB_POSTING_RICH_TEXT_MAX_BYTES,
  JOB_POSTING_RICH_TEXT_MAX_NODES,
  JOB_POSTING_RICH_TEXT_MAX_DEPTH,
  JOB_POSTING_RICH_TEXT_MAX_URL_BYTES,
  JOB_POSTING_RICH_TEXT_ALLOWED_NODES,
  JOB_POSTING_RICH_TEXT_ALLOWED_MARKS,
  JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS,
  type JobPostingRichTextNode,
  type JobPostingRichTextMark,
  type JobPostingRichTextDoc,
  type JobPostingRichTextNodeName,
  type JobPostingRichTextMarkName,
} from './profile';

export {
  validateSchemaVersion,
  validateRichTextField,
  validateRichText,
  isValidationFailure,
  type ValidationFailure,
  type ValidationSuccess,
  type ValidationResult,
  type RichTextErrorCode,
} from './validator';

export {
  renderJobPostingRichText,
  looksLikeRichTextDoc,
  type RendererResult,
} from './renderer';
