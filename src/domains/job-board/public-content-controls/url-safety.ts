/**
 * public-content-controls/url-safety.ts — strict CTA URL validator.
 *
 * Mirrors `chat-links.ts` defensive posture:
 *   - relative pathnames starting with `/` and not `//` are accepted;
 *   - absolute URLs must use `https:` scheme (no `http:`, `javascript:`,
 *     `data:`, `vbscript:`, `file:`);
 *   - URLs containing embedded credentials (`user:pw@host`) are rejected;
 *   - any URL whose normalized form contains a `javascript:` substring is
 *     rejected (defense against URL parsers that mis-handle control chars).
 *
 * Exports:
 *   - `normalizeCtaUrl(raw)` — throws `InvalidCtaUrlError` on bad input.
 *   - `resolveCtaHref(raw)` — defense-in-depth projection; returns `null`
 *     on any failure (mirrors `resolveChatHref` / `resolvePhoneNumber`).
 *   - `isExternalUrl(canonical)` — `true` when the canonical URL is an
 *     absolute `https://` URL (used by the component to decide
 *     `target="_blank"` vs `target="_self"`).
 */

const URL_INPUT_MAX_LENGTH = 2048;

export class InvalidCtaUrlError extends Error {
  readonly code: 'INVALID_CTA_URL';
  constructor(message = 'URL CTA không hợp lệ.') {
    super(message);
    this.name = 'InvalidCtaUrlError';
    this.code = 'INVALID_CTA_URL';
  }
}

/**
 * Normalize a CTA URL. Empty / null / undefined return `null`. Anything that
 * is not (a) a relative pathname starting with `/` (but not `//`) or
 * (b) an absolute `https://` URL throws `InvalidCtaUrlError`.
 */
export function normalizeCtaUrl(
  raw: string | null | undefined,
): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > URL_INPUT_MAX_LENGTH) {
    throw new InvalidCtaUrlError('URL CTA vượt quá 2048 ký tự.');
  }

  // Reject `javascript:` / `data:` / `vbscript:` / `file:` substrings even
  // before parsing — defense in depth against URL parsers that mis-handle
  // control characters or whitespace.
  if (/javascript:/i.test(trimmed)) {
    throw new InvalidCtaUrlError('URL CTA chứa scheme không hợp lệ.');
  }
  if (/vbscript:/i.test(trimmed)) {
    throw new InvalidCtaUrlError('URL CTA chứa scheme không hợp lệ.');
  }
  if (/^\s*data:/i.test(trimmed)) {
    throw new InvalidCtaUrlError('URL CTA chứa scheme không hợp lệ.');
  }
  if (/^\s*file:/i.test(trimmed)) {
    throw new InvalidCtaUrlError('URL CTA chứa scheme không hợp lệ.');
  }

  // Relative pathname path: must start with `/` and not `//` (which would
  // be a protocol-relative URL pointing off-origin).
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    // Reject control characters inside the pathname that could be used to
    // confuse downstream consumers (e.g. CR/LF, NULL). The regex itself
    // is a deny-list of control chars (0x00–0x1F) and DEL (0x7F); the
    // `no-control-regex` rule is disabled because the intent of this
    // check IS to detect control characters.
    /* eslint-disable-next-line no-control-regex */
    if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
      throw new InvalidCtaUrlError('URL CTA chứa ký tự điều khiển.');
    }
    return trimmed;
  }

  // Absolute URL: only `https:` is allowed.
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new InvalidCtaUrlError('URL CTA không hợp lệ.');
  }
  if (url.protocol !== 'https:') {
    throw new InvalidCtaUrlError('URL CTA chỉ chấp nhận https.');
  }
  if (url.username || url.password) {
    throw new InvalidCtaUrlError('URL CTA không được chứa thông tin đăng nhập.');
  }
  // Defense-in-depth: a parser that accepts garbage may still leak a
  // `javascript:` substring via embedded `\` or unicode. Reject any
  // normalized form that still contains one.
  if (/javascript:/i.test(url.toString())) {
    throw new InvalidCtaUrlError('URL CTA chứa scheme không hợp lệ.');
  }
  return url.toString();
}

/**
 * Defense-in-depth projection for stored values. Returns the canonical
 * string when the input is acceptable and `null` otherwise. Use this at
 * the public-render boundary to guarantee a value or absence.
 */
export function resolveCtaHref(raw: string | null | undefined): string | null {
  try {
    return normalizeCtaUrl(raw);
  } catch {
    return null;
  }
}

/** True when the canonical URL is an absolute `https://` URL. */
export function isExternalUrl(canonical: string | null): boolean {
  if (canonical === null) return false;
  // `new URL` is safe here because the canonical string is the output of
  // `normalizeCtaUrl`, which already enforced `https:` or `/`.
  try {
    const u = new URL(canonical, 'https://placeholder.invalid');
    return u.protocol === 'https:' && u.hostname !== 'placeholder.invalid';
  } catch {
    return false;
  }
}
