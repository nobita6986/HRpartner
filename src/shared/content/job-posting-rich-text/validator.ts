/**
 * job-posting-rich-text/validator.ts
 *
 * Server-side JSON validator for JobPosting rich content.
 *
 * Runs BEFORE write to Postgres. Rejects (fail-closed):
 *   - non-object / non-array payloads
 *   - unknown contentSchemaVersion
 *   - serialized UTF-8 JSON > 64 KiB
 *   - node count > 1,000
 *   - depth > 16
 *   - unsupported node or mark types
 *   - heading levels other than 2 or 3
 *   - link marks with non-HTTPS, javascript:, data:, file: or protocol-relative URLs
 *   - link URLs > 2,048 bytes
 *   - empty text nodes are tolerated (Tiptap emits them for caret positioning).
 *
 * The validator NEVER throws on invalid input — it returns a structured
 * `ValidationFailure` so callers can map it to a 400 response with a stable
 * error code. This keeps the route layer simple and the error shape consistent.
 */

import {
  JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS,
  JOB_POSTING_RICH_TEXT_ALLOWED_MARKS,
  JOB_POSTING_RICH_TEXT_ALLOWED_NODES,
  JOB_POSTING_RICH_TEXT_MAX_BYTES,
  JOB_POSTING_RICH_TEXT_MAX_DEPTH,
  JOB_POSTING_RICH_TEXT_MAX_NODES,
  JOB_POSTING_RICH_TEXT_MAX_URL_BYTES,
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
  type JobPostingRichTextMark,
  type JobPostingRichTextNode,
} from './profile';

export type RichTextErrorCode =
  | 'INVALID_JSON'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'PAYLOAD_TOO_LARGE'
  | 'TOO_MANY_NODES'
  | 'DEPTH_EXCEEDED'
  | 'UNSUPPORTED_NODE'
  | 'UNSUPPORTED_MARK'
  | 'INVALID_HEADING_LEVEL'
  | 'INVALID_LINK_URL';

export interface ValidationFailure {
  ok: false;
  code: RichTextErrorCode;
  message: string;
}

export interface ValidationSuccess {
  ok: true;
  nodeCount: number;
  depth: number;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validationFailure(code: RichTextErrorCode, message: string): ValidationFailure {
  return { ok: false, code, message };
}

/** Convenience predicate used by routes and tests. */
export function isValidationFailure(result: ValidationResult): result is ValidationFailure {
  return result.ok === false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Validate that the declared contentSchemaVersion is supported.
 * Caller must pass the version that the row was authored under; this lets us
 * reject future versions explicitly without silently accepting unknown shapes.
 */
export function validateSchemaVersion(version: number): ValidationResult {
  if (!Number.isInteger(version)) {
    return validationFailure(
      'SCHEMA_VERSION_MISMATCH',
      `contentSchemaVersion phải là số nguyên (nhận ${typeof version}).`,
    );
  }
  if (version !== JOB_POSTING_RICH_TEXT_SCHEMA_VERSION) {
    return validationFailure(
      'SCHEMA_VERSION_MISMATCH',
      `contentSchemaVersion=${version} chưa được hỗ trợ (chỉ chấp nhận ${JOB_POSTING_RICH_TEXT_SCHEMA_VERSION}).`,
    );
  }
  return { ok: true, nodeCount: 0, depth: 0 };
}

/** Validate a single rich field. Returns counts so callers can log them. */
export function validateRichTextField(payload: unknown): ValidationResult {
  if (!isPlainObject(payload)) {
    return validationFailure('INVALID_JSON', 'Rich content phải là JSON object.');
  }
  if (typeof payload.type !== 'string') {
    return validationFailure('INVALID_JSON', 'Rich content thiếu trường "type" (node gốc).');
  }
  if (payload.type !== 'doc') {
    return validationFailure('UNSUPPORTED_NODE', `Node gốc phải là "doc" (nhận "${payload.type}").`);
  }
  if (payload.content !== undefined && !Array.isArray(payload.content)) {
    return validationFailure('INVALID_JSON', 'Trường "content" phải là mảng nếu có.');
  }

  const serialized = JSON.stringify(payload);
  if (utf8ByteLength(serialized) > JOB_POSTING_RICH_TEXT_MAX_BYTES) {
    return validationFailure(
      'PAYLOAD_TOO_LARGE',
      `Serialized JSON vượt ${JOB_POSTING_RICH_TEXT_MAX_BYTES} bytes.`,
    );
  }

  const nodes = (payload.content ?? []) as JobPostingRichTextNode[];
  let nodeCount = 1; // count the doc root
  let maxDepth = 1;
  const seen = new Set<unknown>();

  const visit = (node: JobPostingRichTextNode, depth: number): ValidationResult | null => {
    if (seen.has(node)) {
      return validationFailure('INVALID_JSON', 'Rich content chứa tham chiếu vòng (cycle).');
    }
    seen.add(node);

    if (depth > maxDepth) maxDepth = depth;
    if (depth > JOB_POSTING_RICH_TEXT_MAX_DEPTH) {
      return validationFailure(
        'DEPTH_EXCEEDED',
        `Độ sâu vượt ${JOB_POSTING_RICH_TEXT_MAX_DEPTH}.`,
      );
    }

    const t = node.type;
    if (typeof t !== 'string' || !JOB_POSTING_RICH_TEXT_ALLOWED_NODES.includes(t as never)) {
      return validationFailure('UNSUPPORTED_NODE', `Node "${String(t)}" không nằm trong allowlist.`);
    }

    if (t === 'heading') {
      const level = (node.attrs as { level?: unknown } | undefined)?.level;
      if (
        typeof level !== 'number' ||
        !JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS.includes(
          level as (typeof JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS)[number],
        )
      ) {
        return validationFailure(
          'INVALID_HEADING_LEVEL',
          `Heading level=${String(level)} không hợp lệ (chỉ chấp nhận 2 hoặc 3).`,
        );
      }
    }

    if (t === 'text') {
      if (typeof node.text !== 'string') {
        return validationFailure('INVALID_JSON', 'Text node phải có trường "text" là chuỗi.');
      }
      const marks = Array.isArray(node.marks) ? node.marks : [];
      for (const mark of marks as JobPostingRichTextMark[]) {
        const result = validateMark(mark);
        if (!result.ok) return result;
      }
    }

    if (t !== 'text') {
      if (node.text !== undefined && typeof node.text !== 'string') {
        return validationFailure('INVALID_JSON', `Node "${t}" có trường text không phải chuỗi.`);
      }
      if (Array.isArray(node.marks)) {
        return validationFailure(
          'UNSUPPORTED_MARK',
          `Node "${t}" không được có marks (chỉ text node mới có marks).`,
        );
      }
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content as JobPostingRichTextNode[]) {
        if (!isPlainObject(child)) {
          return validationFailure('INVALID_JSON', 'Mỗi node con phải là JSON object.');
        }
        nodeCount += 1;
        if (nodeCount > JOB_POSTING_RICH_TEXT_MAX_NODES) {
          return validationFailure(
            'TOO_MANY_NODES',
            `Số node vượt ${JOB_POSTING_RICH_TEXT_MAX_NODES}.`,
          );
        }
        const result = visit(child as JobPostingRichTextNode, depth + 1);
        if (result) return result;
      }
    }

    return null;
  };

  for (const child of nodes) {
    if (!isPlainObject(child)) {
      return validationFailure('INVALID_JSON', 'Mỗi node con của doc phải là JSON object.');
    }
    nodeCount += 1;
    if (nodeCount > JOB_POSTING_RICH_TEXT_MAX_NODES) {
      return validationFailure('TOO_MANY_NODES', `Số node vượt ${JOB_POSTING_RICH_TEXT_MAX_NODES}.`);
    }
    const err = visit(child, 2);
    if (err) return err;
  }

  return { ok: true, nodeCount, depth: maxDepth };
}

function validateMark(mark: JobPostingRichTextMark): ValidationResult {
  if (!isPlainObject(mark)) {
    return validationFailure('INVALID_JSON', 'Mark phải là JSON object.');
  }
  if (typeof mark.type !== 'string') {
    return validationFailure('INVALID_JSON', 'Mark thiếu trường "type".');
  }
  if (!JOB_POSTING_RICH_TEXT_ALLOWED_MARKS.includes(mark.type as never)) {
    return validationFailure('UNSUPPORTED_MARK', `Mark "${mark.type}" không nằm trong allowlist.`);
  }
  if (mark.type === 'link') {
    const href = (mark.attrs as { href?: unknown } | undefined)?.href;
    if (typeof href !== 'string' || href.length === 0) {
      return validationFailure('INVALID_LINK_URL', 'Link mark thiếu href hợp lệ.');
    }
    if (utf8ByteLength(href) > JOB_POSTING_RICH_TEXT_MAX_URL_BYTES) {
      return validationFailure(
        'INVALID_LINK_URL',
        `Link URL vượt ${JOB_POSTING_RICH_TEXT_MAX_URL_BYTES} bytes.`,
      );
    }
    const lower = href.trim().toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('file:') ||
      lower.startsWith('//')
    ) {
      return validationFailure(
        'INVALID_LINK_URL',
        'Link URL phải là HTTPS tuyệt đối (cấm javascript:, data:, file:, protocol-relative).',
      );
    }
    if (!lower.startsWith('https://')) {
      return validationFailure('INVALID_LINK_URL', 'Link URL chỉ chấp nhận scheme https://');
    }
  }
  return { ok: true, nodeCount: 0, depth: 0 };
}

/**
 * Convenience helper for routes: validate a contentSchemaVersion + payload pair.
 * Returns the first failure (version first, then field).
 */
export function validateRichText(
  contentSchemaVersion: number | null | undefined,
  payload: unknown,
): ValidationResult {
  if (contentSchemaVersion === null || contentSchemaVersion === undefined) {
    return validationFailure(
      'SCHEMA_VERSION_MISMATCH',
      'contentSchemaVersion là bắt buộc.',
    );
  }
  const v = validateSchemaVersion(contentSchemaVersion);
  if (!v.ok) return v;
  return validateRichTextField(payload);
}
