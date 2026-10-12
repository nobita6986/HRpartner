/**
 * youtube.test.ts — hrp-t1c-jobposting-media-youtube / RQ-03 / DEC-02.
 *
 * Pure-function coverage cho `extractYouTubeVideoId`. Không DB, không Prisma, không
 * wrapper-only mock — chạy lane unit hoàn toàn, đảm bảo canonical input set được cover.
 *
 * Các nhánh bắt buộc (theo DEC-02):
 *   - 7 dạng URL hợp lệ của YouTube family.
 *   - URL không hợp lệ: host lạ, path lạ, ID sai shape, protocol không phải http/https.
 *   - Edge: empty, whitespace, oversized (>2048), raw 11-char ID (không phải URL), JS pseudo-URL.
 */
import { describe, it, expect } from 'vitest';
import {
  extractYouTubeVideoId,
  youtubeEmbedUrl,
  YOUTUBE_EMBED_ORIGIN,
  YOUTUBE_VIDEO_ID_RE,
} from './youtube';

const VALID_ID = 'dQw4w9WgXcQ';

describe('extractYouTubeVideoId — DEC-02 happy branches', () => {
  it('accepts canonical /watch?v=ID on www.youtube.com', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
  });

  it('accepts canonical /watch?v=ID on bare youtube.com', () => {
    expect(extractYouTubeVideoId(`https://youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
  });

  it('accepts /watch?v=ID on m.youtube.com', () => {
    expect(extractYouTubeVideoId(`https://m.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
  });

it('accepts /watch?v=ID with extra playlist + start query params', () => {
    expect(
      extractYouTubeVideoId(
        `https://www.youtube.com/watch?v=${VALID_ID}&list=PLrAXtmRdnEQy6nuLMHjMZOz59OqE&index=2`,
      ),
    ).toBe(VALID_ID);
  });

  it('accepts /watch?v=ID with time param before v (some share links reorder)', () => {
    expect(
      extractYouTubeVideoId(`https://www.youtube.com/watch?t=42s&v=${VALID_ID}`),
    ).toBe(VALID_ID);
  });

  it('accepts /embed/<id>', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${VALID_ID}`)).toBe(VALID_ID);
  });

  it('accepts /shorts/<id>', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${VALID_ID}`)).toBe(VALID_ID);
  });

  it('accepts youtu.be/<id>', () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${VALID_ID}`)).toBe(VALID_ID);
  });

  it('accepts youtu.be/<id> with time query param', () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${VALID_ID}?t=42s`)).toBe(VALID_ID);
  });

  it('accepts music.youtube.com (subdomain family) /watch?v=ID', () => {
    expect(extractYouTubeVideoId(`https://music.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
  });

  it('accepts raw 11-char ID with no URL wrapper', () => {
    expect(extractYouTubeVideoId(VALID_ID)).toBe(VALID_ID);
  });

  it('trims surrounding whitespace before matching', () => {
    expect(extractYouTubeVideoId(`  ${VALID_ID}  `)).toBe(VALID_ID);
    expect(extractYouTubeVideoId(`\thttps://youtu.be/${VALID_ID}\n`)).toBe(VALID_ID);
  });

  it('accepts uppercase host (URL parser lowercases via hostname)', () => {
    expect(extractYouTubeVideoId(`HTTPS://WWW.YOUTUBE.COM/watch?v=${VALID_ID}`)).toBe(VALID_ID);
  });

  it('accepts http:// (not only https://)', () => {
    expect(extractYouTubeVideoId(`http://www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
  });
});

describe('extractYouTubeVideoId — DEC-02 reject branches', () => {
  it('rejects empty string', () => {
    expect(extractYouTubeVideoId('')).toBeNull();
  });

  it('rejects whitespace-only string', () => {
    expect(extractYouTubeVideoId('   ')).toBeNull();
  });

  it('rejects non-string input via type-jail (number passed to a string param)', () => {
    // @ts-expect-error — number is intentionally invalid input
    expect(extractYouTubeVideoId(42)).toBeNull();
    // @ts-expect-error — null is intentionally invalid input
    expect(extractYouTubeVideoId(null)).toBeNull();
    // @ts-expect-error — undefined is intentionally invalid input
    expect(extractYouTubeVideoId(undefined)).toBeNull();
  });

  it('rejects input that exceeds 2048 chars (DoS guard)', () => {
    const huge = `https://www.youtube.com/watch?v=${VALID_ID}&x=${'a'.repeat(2100)}`;
    expect(extractYouTubeVideoId(huge)).toBeNull();
  });

  it('rejects non-YouTube host (e.g. example.com)', () => {
    expect(extractYouTubeVideoId(`https://example.com/watch?v=${VALID_ID}`)).toBeNull();
    expect(extractYouTubeVideoId(`https://vimeo.com/${VALID_ID}`)).toBeNull();
    expect(extractYouTubeVideoId(`https://www.bilibili.com/video/${VALID_ID}`)).toBeNull();
  });

  it('rejects look-alike host (e.g. youtube.com.evil.tld)', () => {
    expect(extractYouTubeVideoId(`https://youtube.com.evil.tld/watch?v=${VALID_ID}`)).toBeNull();
    expect(extractYouTubeVideoId(`https://notyoutube.com/watch?v=${VALID_ID}`)).toBeNull();
  });

  it('rejects javascript: pseudo-URL (XSS guard)', () => {
    expect(extractYouTubeVideoId(`javascript:alert(1)`)).toBeNull();
    expect(extractYouTubeVideoId(`JAVASCRIPT:alert(1)`)).toBeNull();
  });

  it('rejects data: pseudo-URL', () => {
    expect(extractYouTubeVideoId(`data:text/html,<iframe src=javascript:alert(1)>`)).toBeNull();
  });

  it('rejects ftp: protocol', () => {
    expect(extractYouTubeVideoId(`ftp://www.youtube.com/watch?v=${VALID_ID}`)).toBeNull();
  });

  it('rejects garbage string that is not a URL', () => {
    expect(extractYouTubeVideoId('not a url')).toBeNull();
    expect(extractYouTubeVideoId('foo/bar/baz')).toBeNull();
  });

  it('rejects /watch path without v= query', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch`)).toBeNull();
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?list=PL123`)).toBeNull();
  });

  it('rejects /watch?v= with too-short ID (< 11 chars)', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=tooshort`)).toBeNull();
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=`)).toBeNull();
  });

  it('rejects /watch?v= with too-long ID (> 11 chars)', () => {
    expect(
      extractYouTubeVideoId(`https://www.youtube.com/watch?v=abcdefghijklmnop`),
    ).toBeNull();
  });

  it('rejects /watch?v= with invalid characters (e.g. punctuation)', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=abc!@#$%^`)).toBeNull();
  });

  it('rejects /feed/trending (YouTube path that has no video id)', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/feed/trending`)).toBeNull();
  });

  it('rejects /playlist?list=... (no video context)', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/playlist?list=PL123`)).toBeNull();
  });

  it('rejects /channel/<id> (channel page, not a video)', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw`)).toBeNull();
  });

  it('rejects /embed/<id>/extra (more than 2 path parts)', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${VALID_ID}/extra`)).toBeNull();
  });

  it('rejects /shorts/<id>/extra', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${VALID_ID}/extra`)).toBeNull();
  });

  it('rejects youtu.be root path (no id segment)', () => {
    expect(extractYouTubeVideoId(`https://youtu.be/`)).toBeNull();
    expect(extractYouTubeVideoId(`https://youtu.be`)).toBeNull();
  });

  it('rejects youtu.be/<id>/<anything> (more than one segment)', () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${VALID_ID}/more`)).toBeNull();
  });

  it('rejects youtu.be/<garbage>` (segment is not 11-char ID)', () => {
    expect(extractYouTubeVideoId(`https://youtu.be/garbage_id_with_too_many_chars`)).toBeNull();
  });

  it('rejects raw string that is 10 chars (off-by-one lower bound)', () => {
    expect(extractYouTubeVideoId('abcdefghij')).toBeNull(); // 10 chars
  });

  it('rejects raw string that is 12 chars (off-by-one upper bound)', () => {
    expect(extractYouTubeVideoId('abcdefghijkl')).toBeNull(); // 12 chars
  });
});

describe('youtubeEmbedUrl — DEC-03 embed surface', () => {
  it('builds the privacy-enhanced nocookie embed URL with rel=0', () => {
    expect(youtubeEmbedUrl(VALID_ID)).toBe(
      `${YOUTUBE_EMBED_ORIGIN}/embed/${VALID_ID}?rel=0`,
    );
  });

  it('does NOT include autoplay=1 in embed URL', () => {
    expect(youtubeEmbedUrl(VALID_ID)).not.toMatch(/autoplay/i);
  });

  it('does NOT include youtube.com (only youtube-nocookie.com)', () => {
    expect(youtubeEmbedUrl(VALID_ID)).not.toContain('youtube.com/embed');
    expect(youtubeEmbedUrl(VALID_ID)).not.toContain('youtube.com/');
  });

  it('uses https://youtube-nocookie.com, not http://', () => {
    expect(youtubeEmbedUrl(VALID_ID)).toMatch(/^https:\/\/www\.youtube-nocookie\.com\//);
  });

  it('constant YOUTUBE_VIDEO_ID_RE matches exactly 11-char [A-Za-z0-9_-]', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test('dQw4w9WgXcQ')).toBe(true);
    expect(YOUTUBE_VIDEO_ID_RE.test('_-abcDEF012')).toBe(true);
    expect(YOUTUBE_VIDEO_ID_RE.test('tooshort')).toBe(false);
    expect(YOUTUBE_VIDEO_ID_RE.test('abcdefghijkl')).toBe(false);
    expect(YOUTUBE_VIDEO_ID_RE.test('abc!@#$%^&*()')).toBe(false);
  });
});