/**
 * youtube.ts — hrp-t1c-jobposting-media-youtube / RQ-03 / DEC-02.
 *
 * Pure-function URL → videoId parser cho YouTube family. Không DB, không Prisma,
 * không I/O — chạy được cả client (để surface real-time UI feedback nếu Tier 1 muốn)
 * lẫn server (canonical validation tại `updateDraftContent` + service wrapper).
 *
 * Input: URL string (cualquier subpath của `youtube.com` / `youtu.be` family) HOẶC
 *        raw 11-char ID. Output: 11-char `[A-Za-z0-9_-]{11}` ID hoặc `null`.
 *
 * Không chấp nhận:
 *   - Host không thuộc `youtube.com` / `youtu.be` family.
 *   - Path không match `/watch?v=ID`, `/embed/ID`, `/shorts/ID`, hoặc youtu.be `/ID`.
 *   - ID không phải `[A-Za-z0-9_-]{11}` (YouTube convention cố định).
 *
 * Public render đi qua helper `youtubeEmbedUrl(videoId)` để build URL
 * `https://www.youtube-nocookie.com/embed/{videoId}?rel=0` — KHÔNG dùng
 * `youtube.com/embed` (tracking), KHÔNG autoplay (`?autoplay=1` KHÔNG xuất hiện),
 * KHÔNG iframe brand từ input HTML người dùng.
 */

export const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_VIDEO_ID_INNER = /^[A-Za-z0-9_-]{11}$/;

/** Host whitelist — case-insensitive, bao gồm cả subdomain phổ biến của YouTube. */
const YOUTUBE_HOSTS = new Set<string>([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

/**
 * Parse một input string (URL hoặc raw 11-char ID) thành 11-char video ID.
 *
 * Trả `null` cho mọi nhánh không hợp lệ:
 *   - Input rỗng / không phải string / quá dài (> 2048 — chặn ReDoS).
 *   - URL có host không thuộc YouTube family.
 *   - URL không có path khớp một trong bốn pattern `watch` / `embed` / `shorts` / youtu.be.
 *   - ID không match `[A-Za-z0-9_-]{11}`.
 *
 * Ví dụ (cố ý liệt kê đủ):
 *   `extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')` → `dQw4w9WgXcQ`
 *   `extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')` → `dQw4w9WgXcQ`
 *   `extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')` → `dQw4w9WgXcQ`
 *   `extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')` → `dQw4w9WgXcQ`
 *   `extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123')` → `dQw4w9WgXcQ`
 *   `extractYouTubeVideoId('https://www.youtube.com/watch?t=42s&v=dQw4w9WgXcQ')` → `dQw4w9WgXcQ`
 *   `extractYouTubeVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')` → `dQw4w9WgXcQ`
 *   `extractYouTubeVideoId('dQw4w9WgXcQ')` → `dQw4w9WgXcQ` (raw 11-char ID)
 *   `extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')` → `null`
 *   `extractYouTubeVideoId('https://www.youtube.com/watch?v=tooshort')` → `null`
 *   `extractYouTubeVideoId('https://www.youtube.com/feed/trending')` → `null`
 *   `extractYouTubeVideoId('')` → `null`
 *   `extractYouTubeVideoId('javascript:alert(1)')` → `null`
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (raw.length === 0 || raw.length > 2048) return null;

  // Short-circuit: nếu input đã là raw 11-char ID (đã trim) → trả luôn.
  if (YOUTUBE_VIDEO_ID_INNER.test(raw)) return raw;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  // Protocol: chỉ http / https. Reject `javascript:`, `data:`, `file:`, …
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const pathname = parsed.pathname;

  // Case A: host = youtu.be (subdomain family).
  // path = "/<id>" có thể kèm "/<id>?t=42s" (time param), hoặc "/" (root → null).
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length !== 1) return null;
    const candidate = segments[0];
    return YOUTUBE_VIDEO_ID_INNER.test(candidate) ? candidate : null;
  }

  // Case B: host = *.youtube.com.
  // Sub-case B1: /watch → id nằm trong query param `v`.
  if (pathname === '/watch') {
    const v = parsed.searchParams.get('v');
    if (!v) return null;
    return YOUTUBE_VIDEO_ID_INNER.test(v) ? v : null;
  }

  // Sub-case B2: /embed/<id> hoặc /shorts/<id> — id nằm trong path[1].
  if (pathname.startsWith('/embed/') || pathname.startsWith('/shorts/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length !== 2) return null;
    const candidate = segments[1];
    return YOUTUBE_VIDEO_ID_INNER.test(candidate) ? candidate : null;
  }

  // Các path khác (`/feed/...`, `/channel/...`, `/playlist?list=...`, ...) → reject.
  return null;
}

/** Canonical YouTube embed origin — privacy-enhanced, không tracking cookie YouTube brand. */
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

/**
 * Build URL `<iframe src>` cho public detail embed. `videoId` phải đã pass qua
 * `extractYouTubeVideoId`; helper này KHÔNG validate lại để giữ cheap tại render path.
 *
 * `?rel=0` giới hạn related videos sau khi play tới kênh cùng owner, giảm brand leak ra ngoài.
 * KHÔNG `?autoplay=1`. KHÔNG cần unbranded `&modestbranding=1` (đã được youtube-nocookie).
 */
export function youtubeEmbedUrl(videoId: string): string {
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${videoId}?rel=0`;
}