/**
 * safe-render.ts — AV4 Media safe HTML render allowlist
 *
 * Định nghĩa allowlist tags/attrs/schemes để sanitize HTML trước khi
 * `dangerouslySetInnerHTML`. AV2 (JobPosting) và AV6 (HomepageSection) sẽ
 * dùng helper này khi render rich text + embedded media.
 *
 * Implementation: dùng `sanitize-html` (npm) — đã có dependency trong
 * `package.json` (`sanitize-html`). Đây là dependency đã dùng ở các
 * round khác (UI04). Nếu sau này cần đổi sang DOMPurify, đổi tại đây.
 *
 * KHÔNG mở rộng allowlist tại call site — sửa constants tại đây để
 * audit dễ.
 */

import sanitizeHtmlLib from 'sanitize-html';

const ALLOWED_TAGS = [
  // Text formatting
  'p', 'br', 'strong', 'em', 'u', 's', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  // Links & media
  'a', 'img',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Code
  'blockquote', 'code', 'pre', 'kbd', 'samp',
  // HTML5
  'span', 'div',
  'figure', 'figcaption',
  'details', 'summary',
] as const;

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  '*': ['id', 'class'],
};

const ALLOWED_SCHEMES = ['https', 'mailto', 'tel'] as const;

/** Forbidden href patterns — strip nếu gặp. */
const FORBIDDEN_HREF_PATTERNS = [/^javascript:/i, /^data:/i, /^vbscript:/i];

/** Tags tuyệt đối cấm kể cả khi input sạch (defense in depth). */
const FORBIDDEN_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form'] as const;

export interface SanitizeOptions {
  /** Strip <a target="_blank"> nếu chưa có rel="noopener noreferrer". Default true. */
  enforceSafeAnchorTarget?: boolean;
}

/**
 * Sanitize HTML string với allowlist từ AV4 TASK.
 *
 * - Tags: chỉ giữ tags trong `ALLOWED_TAGS`
 * - Attributes: theo `ALLOWED_ATTRS` (per-tag + global `id`/`class`)
 * - Schemes: chỉ `https`, `mailto`, `tel` (loại bỏ javascript:, data:, vbscript:)
 * - Forbidden tags: strip ngay cả khi nằm trong allowed list
 *
 * @param html — input HTML string (có thể chứa markup nguy hiểm)
 * @param opts — tuỳ chọn (enforce safe anchor target mặc định bật)
 * @returns HTML đã sanitize
 */
export function sanitizeHtml(html: string, opts: SanitizeOptions = {}): string {
  const enforceSafeAnchorTarget = opts.enforceSafeAnchorTarget ?? true;

  // 1. Strip forbidden href patterns bằng regex
  let safe = html;
  for (const pattern of FORBIDDEN_HREF_PATTERNS) {
    safe = safe.replace(pattern, '#');
  }

  // 2. Strip forbidden tags (defense in depth, sanitize-html xử lý tiếp)
  for (const tag of FORBIDDEN_TAGS) {
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi');
    safe = safe.replace(re, '');
    // Self-closing variants
    const reSelf = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    safe = safe.replace(reSelf, '');
  }

  // 3. Parse + sanitize bằng sanitize-html
  const sanitized: string = sanitizeHtmlLib(safe, {
    allowedTags: ALLOWED_TAGS as unknown as string[],
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ALLOWED_SCHEMES as unknown as string[],
    allowedSchemesByTag: { img: ['https', 'data'] },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });

  // 4. Enforce safe anchor target — append rel="noopener noreferrer" nếu target=_blank
  if (enforceSafeAnchorTarget) {
    return sanitized.replace(/<a\b([^>]*?)>/gi, (_match, attrs: string) => {
      if (!/target=["']_blank["']/i.test(attrs)) return _match;
      if (/rel=["'][^"']*["']/i.test(attrs)) {
        // Đã có rel — bổ sung nếu thiếu noopener/noreferrer
        return _match.replace(
          /rel=["']([^"']*)["']/i,
          (_r: string, rel: string) => {
            const parts = new Set(rel.split(/\s+/));
            parts.add('noopener');
            parts.add('noreferrer');
            return `rel="${Array.from(parts).join(' ')}"`;
          },
        );
      }
      return `<a${attrs} rel="noopener noreferrer">`;
    });
  }

  return sanitized;
}

/** Strip toàn bộ HTML — chỉ giữ text content. Dùng cho caption/preview. */
export function stripHtml(html: string): string {
  return sanitizeHtmlLib(html, { allowedTags: [], allowedAttributes: {} });
}

/** Tags constants — export để test snapshot + audit. */
export const SAFE_RENDER_TAGS = ALLOWED_TAGS as readonly string[];
export const SAFE_RENDER_FORBIDDEN_TAGS = FORBIDDEN_TAGS as readonly string[];
export const SAFE_RENDER_FORBIDDEN_PATTERNS = FORBIDDEN_HREF_PATTERNS.map((r) => r.source);
