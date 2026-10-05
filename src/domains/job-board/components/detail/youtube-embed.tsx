/**
 * youtube-embed.tsx — hrp-t1c-jobposting-media-youtube (RQ-03, DEC-02).
 *
 * Server Component render YouTube iframe responsive 16:9 với
 * `youtube-nocookie.com` (no tracking cookies, no autoplay) + `?rel=0` (ẩn related
 * video ngoài channel).
 *
 * An toàn:
 *  - `videoId` là 11-char canonical ID đã được server-side validate qua
 *    `extractYouTubeVideoId` (`src/domains/media/youtube.ts`). KHÔNG bao giờ nhận
 *    URL gốc, HTML, hay iframe code từ client/admin.
 *  - KHÔNG dùng `dangerouslySetInnerHTML`.
 *  - `allow` attribute giới hạn permissions cần thiết cho YouTube iframe API.
 *  - `referrerPolicy="strict-origin-when-cross-origin"` chặn leak full referrer.
 *  - `loading="lazy"` defer load đến khi user scroll tới.
 *
 * Props: `videoId` (11-char string, canonical). Khi `null`/rỗng → return null.
 */
export function YouTubeEmbed({ videoId }: { videoId: string | null }) {
  if (!videoId) return null;
  // Defensive: nếu `videoId` không khớp shape 11-char A-Za-z0-9_- (lỗi upstream),
  // KHÔNG render — KHÔNG nhận raw string, KHÔNG tự fix.
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;

  return (
    <section
      data-section="youtube-embed"
      data-source="REAL"
      aria-label="Video giới thiệu công việc"
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: 'var(--color-on-surface)' }}
      >
        Video giới thiệu
      </h2>
      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: '16 / 9' }}
      >
        <iframe
          src={src}
          title="Video giới thiệu công việc"
          // `allow` enumerate chính xác permissions YouTube embed yêu cầu.
          // KHÔNG thêm `autoplay` — RQ-03 explicitly yêu cầu KHÔNG autoplay.
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          // `referrerPolicy` chặn leak full URL referrer.
          referrerPolicy="strict-origin-when-cross-origin"
          // Defer load đến khi user scroll tới.
          loading="lazy"
          // Fullscreen đúng chuẩn (một số browser bỏ qua nếu thiếu).
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </section>
  );
}
