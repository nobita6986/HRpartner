/**
 * youtube-embed.test.tsx — hrp-t1c-jobposting-media-youtube (RQ-03, DEC-02).
 *
 * Component-level test: render hoặc return null tuỳ `videoId` shape. Server Component
 * nên render bằng `renderToStaticMarkup` (react-dom/server) — KHÔNG cần DOM runtime.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { YouTubeEmbed } from './youtube-embed';

function render(props: { videoId: string | null }): string {
  return renderToStaticMarkup(createElement(YouTubeEmbed, props));
}

describe('YouTubeEmbed', () => {
  it('returns empty markup when videoId is null', () => {
    expect(render({ videoId: null })).toBe('');
  });

  it('returns empty markup when videoId is empty string', () => {
    expect(render({ videoId: '' })).toBe('');
  });

  it('returns empty markup when videoId does not match 11-char shape (defensive)', () => {
    expect(render({ videoId: 'not-valid' })).toBe('');
    expect(render({ videoId: 'short' })).toBe('');
    // 12 chars - too long
    expect(render({ videoId: 'abcdefghijkl' })).toBe('');
    // 10 chars - too short
    expect(render({ videoId: 'abcdefghij' })).toBe('');
  });

  it('renders iframe with youtube-nocookie.com embed + rel=0 when videoId is valid 11-char', () => {
    const html = render({ videoId: 'dQw4w9WgXcQ' });
    expect(html).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
    // React lowercases the camelCase `allowFullScreen` prop to `allowfullscreen` in HTML.
    expect(html.toLowerCase()).toContain('allowfullscreen');
    expect(html).toContain('loading="lazy"');
    // KHÔNG autoplay
    expect(html).not.toMatch(/autoplay=1/);
  });

  it('renders 16/9 aspect ratio wrapper', () => {
    const html = render({ videoId: 'dQw4w9WgXcQ' });
    // React strips the spaces inside the style value when stringified.
    expect(html).toMatch(/aspect-ratio:\s*16\s*\/\s*9/);
  });

  it('uses strict-origin-when-cross-origin referrer policy', () => {
    const html = render({ videoId: 'dQw4w9WgXcQ' });
    // React renders the camelCase `referrerPolicy` literally (case-insensitive in HTML).
    expect(html.toLowerCase()).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  });

  it('uses sandboxed allow attribute (no autoplay permission)', () => {
    const html = render({ videoId: 'dQw4w9WgXcQ' });
    // 'autoplay' permission is NOT in our allow list (per DEC-02).
    expect(html).not.toMatch(/allow="[^"]*\bautoplay\b/);
    // The other YouTube-required permissions ARE present.
    expect(html).toMatch(/accelerometer/);
    expect(html).toMatch(/encrypted-media/);
    expect(html).toMatch(/picture-in-picture/);
  });

  it('validates 11-char shape includes _ and -', () => {
    // Real YouTube IDs can contain _ and -
    expect(render({ videoId: 'a_b-cd_efgh' })).toContain('youtube-nocookie.com/embed/a_b-cd_efgh');
  });
});
