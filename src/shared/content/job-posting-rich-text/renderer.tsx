/**
 * job-posting-rich-text/renderer.tsx
 *
 * Server-side React renderer for validated JobPosting rich content.
 *
 * RULES:
 *   - Uses `@tiptap/static-renderer/json/react` (server-safe, no DOM).
 *   - Renderer NEVER instantiates the Tiptap editor client. There is no DOM,
 *     no React state — only JSON → React elements.
 *   - All link `target` / `rel` attributes are owned by the renderer (security
 *     boundary — the JSON `attrs` cannot inject `target=_blank` without
 *     `rel="noopener noreferrer"`).
 *   - Renders text inside HTML elements (NOT dangerouslySetInnerHTML). Even
 *     if a node sneaks an inline HTML attribute, React escapes it on output.
 *   - Unhandled nodes/marks → `null` (fail-closed — silently drops, never
 *     renders raw payload).
 */

import { Fragment, type ReactNode } from 'react';
import {
  renderJSONContentToReactElement,
  type JSONNodeType,
} from '@tiptap/static-renderer/json/react';

import {
  JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS,
  JOB_POSTING_RICH_TEXT_ALLOWED_MARKS,
  JOB_POSTING_RICH_TEXT_ALLOWED_NODES,
  type JobPostingRichTextDoc,
} from './profile';
import {
  validateRichText,
  type ValidationResult,
} from './validator';

const ALLOWED_NODE_SET = new Set<string>(JOB_POSTING_RICH_TEXT_ALLOWED_NODES);
const ALLOWED_MARK_SET = new Set<string>(JOB_POSTING_RICH_TEXT_ALLOWED_MARKS);
const ALLOWED_HEADING_LEVELS_SET = new Set<number>(JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface RendererResultOk {
  ok: true;
  element: ReactNode;
}

interface RendererResultErr {
  ok: false;
  reason: string;
}

export type RendererResult = RendererResultOk | RendererResultErr;

/**
 * Render a validated rich-text doc into React elements.
 *
 * `contentSchemaVersion` MUST match `JOB_POSTING_RICH_TEXT_SCHEMA_VERSION`.
 * If validation fails, the renderer returns `null` (fail-closed) — callers
 * should surface a generic "section unavailable" UI rather than rendering
 * raw payload.
 */
export function renderJobPostingRichText(
  contentSchemaVersion: number | null | undefined,
  doc: unknown,
): RendererResult {
  const validation: ValidationResult = validateRichText(contentSchemaVersion, doc);
  if (!validation.ok) {
    return { ok: false, reason: validation.message };
  }
  if (!isPlainObject(doc) || doc.type !== 'doc') {
    return { ok: false, reason: 'Rich content không phải doc hợp lệ.' };
  }
  const render = renderJSONContentToReactElement({
    nodeMapping: {
      doc: ({ children }) => <Fragment>{children}</Fragment>,
      paragraph: ({ children }) => <p>{children}</p>,
      text: ({ node }) => {
        const text = typeof node.text === 'string' ? node.text : '';
        // Marks are applied by the renderer framework below; here we just emit
        // the raw text and rely on markMapping to wrap.
        return <>{text}</>;
      },
      heading: ({ node, children }) => {
        const level = (node.attrs as { level?: unknown } | undefined)?.level;
        if (typeof level !== 'number' || !ALLOWED_HEADING_LEVELS_SET.has(level)) {
          return null;
        }
        if (level === 2) return <h2>{children}</h2>;
        return <h3>{children}</h3>;
      },
      bulletList: ({ children }) => <ul>{children}</ul>,
      orderedList: ({ children }) => <ol>{children}</ol>,
      listItem: ({ children }) => <li>{children}</li>,
    },
    markMapping: {
      bold: ({ children }) => <strong>{children}</strong>,
      italic: ({ children }) => <em>{children}</em>,
      link: ({ mark, children }) => {
        const href = (mark.attrs as { href?: unknown } | undefined)?.href;
        if (typeof href !== 'string' || !href.toLowerCase().startsWith('https://')) {
          // Fail-closed — silently drop the link wrapper; text content remains.
          return <>{children}</>;
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      },
    },
    // Unhandled nodes/marks → drop. We only accept the approved profile.
    unhandledNode: () => null,
    unhandledMark: ({ children }) => <>{children}</>,
  });

  const element = render({ content: doc as unknown as JSONNodeType });
  return { ok: true, element };
}

/**
 * Type guard used by other modules (and tests) to check whether a payload
 * is at least shaped like a JobPosting rich-text doc, without doing full
 * validation. Full validation is `validateRichTextField`.
 */
export function looksLikeRichTextDoc(value: unknown): value is JobPostingRichTextDoc {
  return isPlainObject(value) && value.type === 'doc';
}

/**
 * Expose allowlist sets for tests + A1 public renderer reuse. A0/A1 must not
 * duplicate these — they MUST import from this module to keep one source of
 * truth (OD-P1A-02).
 */
export const JOB_POSTING_RICH_TEXT_ALLOW_LISTS = {
  nodes: ALLOWED_NODE_SET,
  marks: ALLOWED_MARK_SET,
  headingLevels: ALLOWED_HEADING_LEVELS_SET,
} as const;
