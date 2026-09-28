/**
 * PaginationControls.test.ts — Unit tests for URL-state pagination controls.
 *
 * Frozen contracts (TASK.md AC-05, RQ-05):
 *   - pageSize ∈ {20, 50, 100}. Default = 20 (omitted from URL).
 *   - page ≥ 1. Page 1 omits the `page` param.
 *   - Toggling pageSize clears `page`.
 *   - No mutation API; navigation only.
 *   - No POST/PATCH/DELETE.
 *
 // NOTE: This file is a vitest unit test (see vitest.unit.config.ts app glob).
// We use React.createElement directly because the unit-lane config does NOT
// match .test.tsx under app/**.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';

const mockState: { pathname: string; params: Record<string, string> } = {
  pathname: '/admin/recruiter-workbench',
  params: {},
};

vi.mock('next/navigation', () => ({
  usePathname: () => mockState.pathname,
  useSearchParams: () => new URLSearchParams(mockState.params),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { PaginationControls } from './PaginationControls';

function render(page: number, pageSize: number, total: number) {
  return renderToStaticMarkup(
    React.createElement(PaginationControls, { page, pageSize, total }),
  );
}

describe('PaginationControls', () => {
  beforeEach(() => {
    mockState.pathname = '/admin/recruiter-workbench';
    mockState.params = {};
  });

  it('renders exactly three page-size options (20, 50, 100)', () => {
    const html = render(1, 20, 0);
    expect(html).toContain('data-testid="page-size-20"');
    expect(html).toContain('data-testid="page-size-50"');
    expect(html).toContain('data-testid="page-size-100"');
  });

  it('omits pageSize from URL when default (20) is selected', () => {
    mockState.params = { sort: 'openedDesc', view: 'ALL' };
    const html = render(1, 20, 100);
    const m = html.match(/<a[^>]*data-testid="page-size-20"[^>]*href="([^"]*)"/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toContain('pageSize=');
    expect(m![1]).not.toContain('page=');
    expect(m![1]).toContain('sort=openedDesc');
    expect(m![1]).toContain('view=ALL');
  });

  it('adds pageSize=50 when non-default is selected, and clears page', () => {
    mockState.params = { page: '4', sort: 'openedDesc' };
    const html = render(4, 50, 100);
    const m = html.match(/<a[^>]*data-testid="page-size-50"[^>]*href="([^"]*)"/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain('pageSize=50');
    expect(m![1]).not.toContain('page=4');
    expect(m![1]).toContain('sort=openedDesc');
  });

  it('preserves unrelated params on Prev/Next links', () => {
    mockState.params = { sort: 'openedDesc', caseStatus: 'OPEN' };
    const html = render(2, 20, 200);
    expect(html).toContain('sort=openedDesc');
    expect(html).toContain('caseStatus=OPEN');
  });

  it('disables Prev on first page (aria-disabled, tabIndex=-1)', () => {
    const html = render(1, 20, 100);
    const m = html.match(/<a[^>]*data-testid="page-prev"[^>]*>/);
    expect(m).not.toBeNull();
    expect(m![0]).toContain('aria-disabled="true"');
    expect(m![0]).toContain('tabindex="-1"');
  });

  it('disables Next on last page', () => {
    const html = render(5, 20, 100);
    const m = html.match(/<a[^>]*data-testid="page-next"[^>]*>/);
    expect(m).not.toBeNull();
    expect(m![0]).toContain('aria-disabled="true"');
    expect(m![0]).toContain('tabindex="-1"');
  });

  it('enables Prev/Next in the middle of the range', () => {
    mockState.params = { page: '2' };
    const html = render(2, 20, 100);
    const mPrev = html.match(/<a[^>]*data-testid="page-prev"[^>]*>/);
    const mNext = html.match(/<a[^>]*data-testid="page-next"[^>]*>/);
    expect(mPrev![0]).toContain('aria-disabled="false"');
    expect(mNext![0]).toContain('aria-disabled="false"');
  });

  it('shows page indicator with safe page/count', () => {
    const html = render(3, 20, 80);
    expect(html).toContain('Trang 3 / 4');
    expect(html).toContain('80 kết quả');
  });

  it('clamps an out-of-range page safely (rendering does not crash)', () => {
    const html = render(99, 20, 10);
    expect(html).toContain('Trang 1 / 1');
  });

  it('omits POST/PATCH/DELETE; only <Link> navigation', () => {
    const html = render(2, 20, 100);
    expect(html).not.toMatch(/method="POST"/);
    expect(html).not.toMatch(/method="PATCH"/);
    expect(html).not.toMatch(/method="DELETE"/);
    expect(html).not.toContain('fetch(');
    expect(html).not.toContain('axios');
  });

  it('exposes aria-label="Phân trang" landmark', () => {
    const html = render(2, 20, 100);
    expect(html).toContain('aria-label="Phân trang"');
    expect(html).toContain('role="navigation"');
  });
});
