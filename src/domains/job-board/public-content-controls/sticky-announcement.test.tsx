/**
 * public-content-controls/sticky-announcement.test.tsx — server-render
 * (initial) tests for the StickyAnnouncement component.
 *
 * The first render is server-rendered: `mounted === false`, so the dismiss
 * state is never read. This is enough to verify all the suppression
 * predicates and the basic structure of the rendered output. The dismiss
 * flow is exercised in `sticky-announcement.mount.test.tsx` (jsdom).
 *
 * No `@testing-library/react` is used; the repo's convention is
 * `react-dom/server.renderToStaticMarkup` for static coverage.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { StickyAnnouncement } from './sticky-announcement';
import { safeStickyAnnouncement, type StickyAnnouncementDto } from './types';

function dto(overrides: Partial<StickyAnnouncementDto> = {}): StickyAnnouncementDto {
  return safeStickyAnnouncement({
    enabled: true,
    message: 'Hỗ trợ tư vấn 24/7 — gọi HRP ngay hôm nay!',
    ctaLabel: 'Gọi HRP',
    ctaUrl: 'tel:+849064984866',
    dismissible: true,
    textColor: 'on-primary',
    font: 'SANS',
    emphasis: 'BOLD',
    animation: 'NONE',
    contentRevision: 'rev-2026-10-04T09:00:00.000Z',
    ...overrides,
  });
}

function render(props: Parameters<typeof StickyAnnouncement>[0]): string {
  return renderToStaticMarkup(createElement(StickyAnnouncement, props));
}

describe('StickyAnnouncement — server-side first render', () => {
  it('renders the wrapper when enabled and the message is non-empty', () => {
    const html = render({ dto: dto() });
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Thông báo"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Hỗ trợ tư vấn 24/7');
    expect(html).toContain('data-testid="sticky-announcement"');
  });

  it('renders the CTA when ctaUrl + ctaLabel are both present', () => {
    const html = render({ dto: dto({ ctaUrl: 'https://hrpartner.vn/contact', ctaLabel: 'Liên hệ' }) });
    expect(html).toContain('data-testid="sticky-announcement-cta"');
    expect(html).toContain('Liên hệ');
    // External link — target="_blank" rel="noopener noreferrer".
    expect(html).toMatch(/target="_blank"/);
    expect(html).toMatch(/rel="noopener noreferrer"/);
    expect(html).toContain('href="https://hrpartner.vn/contact"');
  });

  it('uses target="_self" and no rel for internal pathnames', () => {
    const html = render({ dto: dto({ ctaUrl: '/contact', ctaLabel: 'Liên hệ' }) });
    expect(html).toMatch(/target="_self"/);
    expect(html).not.toMatch(/rel="noopener noreferrer"/);
  });

  it('renders the dismiss button when dismissible=true', () => {
    const html = render({ dto: dto({ dismissible: true }) });
    expect(html).toContain('data-testid="sticky-announcement-dismiss"');
    expect(html).toContain('aria-label="Đóng thông báo"');
  });

  it('does NOT render the dismiss button when dismissible=false', () => {
    const html = render({ dto: dto({ dismissible: false }) });
    expect(html).not.toContain('data-testid="sticky-announcement-dismiss"');
  });

  it('returns null when enabled is false', () => {
    const html = render({ dto: dto({ enabled: false }) });
    expect(html).toBe('');
  });

  it('returns null when the message is empty after trim', () => {
    const html = render({ dto: dto({ message: '   ' }) });
    expect(html).toBe('');
  });

  it('returns null when ctaUrl is set but ctaLabel is empty (mis-configured CTA)', () => {
    const html = render({ dto: dto({ ctaUrl: 'https://hrpartner.vn/x', ctaLabel: '  ' }) });
    expect(html).toBe('');
  });

  it('does NOT include `<marquee` in the rendered output for any animation', () => {
    const animations: Array<StickyAnnouncementDto['animation']> = [
      'NONE',
      'BLINK',
      'MARQUEE',
    ];
    for (const animation of animations) {
      const html = render({ dto: dto({ animation }) });
      expect(html.toLowerCase()).not.toContain('<marquee');
    }
  });

  it('renders a doubled message track when animation=MARQUEE', () => {
    const html = render({ dto: dto({ animation: 'MARQUEE' }) });
    // Two occurrences of the message in the rendered tree: the visible one
    // and the aria-hidden tail.
    const occurrences = (html.match(/Hỗ trợ tư vấn 24\/7/g) ?? []).length;
    expect(occurrences).toBe(2);
  });

  it('does NOT render a doubled message track for NONE or BLINK', () => {
    for (const animation of ['NONE', 'BLINK'] as const) {
      const html = render({ dto: dto({ animation }) });
      const occurrences = (html.match(/Hỗ trợ tư vấn 24\/7/g) ?? []).length;
      expect(occurrences).toBe(1);
    }
  });

  it('renders message as a text node, not as a dangerouslySetInnerHTML payload', () => {
    const html = render({ dto: dto({ message: 'a < b & c > d' }) });
    // The angle brackets must be present as raw text, NOT inside a string
    // that ends up in `innerHTML`. We assert by inspecting that the
    // characters appear directly and that no `dangerouslySetInnerHTML`
    // attribute is present (covered by the static fence, but a redundant
    // server-render check is cheap).
    expect(html).toContain('a &lt; b &amp; c &gt; d');
  });
});

describe('StickyAnnouncement — graceful handling of unsafe CTA URLs', () => {
  it('refuses to render the CTA when the URL fails normalization (re-validated at render)', () => {
    // Bypass resolveCtaHref and force an unsafe URL through. The component
    // must NOT emit a clickable anchor in that case.
    const html = render({
      dto: dto({ ctaUrl: 'javascript:alert(1)' as unknown as string, ctaLabel: 'Click me' }),
    });
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data-testid="sticky-announcement-cta"');
  });
});
