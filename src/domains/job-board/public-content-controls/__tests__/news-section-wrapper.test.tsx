/**
 * public-content-controls/__tests__/news-section-wrapper.test.tsx —
 * Phase B / UI2 composition wrapper tests.
 *
 * Pattern mirrors `sticky-announcement.test.tsx`: server-render through
 * `react-dom/server.renderToStaticMarkup`. The wrapper is a Client Component
 * but does not depend on browser-only APIs, so static rendering exercises
 * the gate predicate.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewsSectionWrapper } from '../news-section-wrapper';

vi.mock('../use-public-content-controls', () => ({
  usePublicContentControls: vi.fn(),
}));

import { usePublicContentControls } from '../use-public-content-controls';

const demoContent = {
  id: 'news',
  enabled: true,
  order: 0,
  source: 'DEMO' as const,
  title: 'Tin tức & Cẩm nang',
  featured: {
    id: 'feat-1',
    title: 'Featured',
    excerpt: 'Excerpt',
    category: 'Cat',
    publishedAt: '2026-10-04T00:00:00.000Z',
    imageUrl: '/x.jpg',
    body: [],
  },
  others: [],
};

describe('<NewsSectionWrapper> (Phase B / UI2)', () => {
  it('returns empty markup when newsSectionEnabled is false', () => {
    vi.mocked(usePublicContentControls).mockReturnValue({
      loaded: true,
      newsSectionEnabled: false,
      stickyAnnouncement: {
        enabled: false,
        message: '',
        ctaLabel: null,
        ctaUrl: null,
        dismissible: true,
        textColor: 'on-primary',
        font: 'SANS',
        emphasis: 'BOLD',
        animation: 'NONE',
        contentRevision: 'rev-0',
      },
    });
    const html = renderToStaticMarkup(NewsSectionWrapper({ content: demoContent }));
    expect(html).toBe('');
  });

  it('renders the section when newsSectionEnabled is true', () => {
    vi.mocked(usePublicContentControls).mockReturnValue({
      loaded: true,
      newsSectionEnabled: true,
      stickyAnnouncement: {
        enabled: false,
        message: '',
        ctaLabel: null,
        ctaUrl: null,
        dismissible: true,
        textColor: 'on-primary',
        font: 'SANS',
        emphasis: 'BOLD',
        animation: 'NONE',
        contentRevision: 'rev-0',
      },
    });
    const html = renderToStaticMarkup(NewsSectionWrapper({ content: demoContent }));
    expect(html).toContain('data-section="news"');
  });
});