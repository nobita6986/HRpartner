/**
 * media-alt.ts — hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-01..RQ-06).
 *
 * Pure helper phái sinh alt text từ filename cho Media records.
 * Server là authority cho alt khi status = PUBLIC; UI không bắt buộc nhập.
 *
 * Quy tắc:
 *  1. Lấy tên file gốc, bỏ path và extension.
 *  2. Strip prefix kỹ thuật timestamp/ISO timestamp/UUID (lặp để xử lý chain).
 *  3. Thay `_`, `-`, và chuỗi khoảng trắng liên tiếp bằng một khoảng trắng.
 *  4. Trim. Giữ nguyên dấu tiếng Việt.
 *  5. Nếu rỗng thì dùng DEFAULT_MEDIA_ALT.
 *  6. Giới hạn tối đa MAX_ALT_LENGTH ký tự.
 *
 * Deterministic: cùng input luôn cho cùng output. Không I/O, không Prisma.
 */

export const DEFAULT_MEDIA_ALT = 'Hình ảnh';
export const MAX_ALT_LENGTH = 500;

/**
 * Patterns strip đầu filename (lặp để strip chain).
 * Order: ISO timestamp → Unix epoch → UUID.
 */
const PREFIX_PATTERNS: readonly RegExp[] = [
  // ISO-ish timestamp yyyy-MM-ddTHH-mm-ss (with optional fractional/tz)
  /^\d{4}-\d{2}-\d{2}[T_\-]\d{2}-\d{2}-\d{2}(?:[._-]\d+)?(?:[-_.\s]+|$)/u,
  // Unix epoch seconds or ms (10–13 digits)
  /^\d{10,13}(?:[-_.\s]+|$)/u,
  // UUID v1/v4 form (8-4-4-4-12 hex)
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:[-_.\s]+|$)/iu,
];

/**
 * Derive alt text từ filename. Pure, deterministic.
 * @param filename tên file gốc (có thể chứa path + extension + prefix kỹ thuật)
 * @returns alt text ≤ MAX_ALT_LENGTH ký tự; fallback DEFAULT_MEDIA_ALT khi rỗng.
 */
export function deriveMediaAlt(filename: string): string {
  // 1. Lấy basename, bỏ extension
  const base = (filename ?? '').split(/[\\/]/).pop() ?? '';
  let stem = base.replace(/\.[^./]+$/u, '');

  // 2. Strip chuỗi prefix kỹ thuật (lặp để xử lý chain như
  //    "1715000000_<uuid>_foo.jpg" → "foo").
  let changed = true;
  let guard = 0;
  while (changed) {
    if (guard++ > 8) break; // safety: tránh vòng lặp vô hạn
    changed = false;
    for (const p of PREFIX_PATTERNS) {
      const m = stem.match(p);
      if (m && typeof m.index === 'number' && m.index === 0) {
        stem = stem.slice(m[0].length);
        changed = true;
        break;
      }
    }
  }

  // 3. Thay _, -, và chuỗi whitespace liên tiếp bằng 1 space
  let s = stem.replace(/[_\-\s]+/gu, ' ');

  // 4. Trim
  s = s.trim();

  // 5. Fallback
  if (!s) return DEFAULT_MEDIA_ALT;

  // 6. Giới hạn 500 chars (cắt + trimEnd)
  return s.length > MAX_ALT_LENGTH ? s.slice(0, MAX_ALT_LENGTH).trimEnd() : s;
}