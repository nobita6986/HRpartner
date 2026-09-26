/**
 * SortDropdown.test.ts — Unit tests for the URL-state sort selector.
 *
 * Frozen contracts (TASK.md AC-04, RQ-04):
 *   - Exactly 4 sort values: `ageDesc | ageAsc | openedDesc | openedAsc`.
 *   - Default = `ageDesc`.
 *   - Selecting the default REMOVES `sort=` from URL (idempotent).
 *   - Selecting a non-default sets `sort=` and clears `page`.
 *   - The component does NOT call POST/PATCH/DELETE.
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

import { SortDropdown } from './SortDropdown';

describe('SortDropdown', () => {
  beforeEach(() => {
    mockState.pathname = '/admin/recruiter-workbench';
    mockState.params = {};
  });

  it('renders exactly four sort options', () => {
    const html = renderToStaticMarkup(React.createElement(SortDropdown, { activeSort: 'ageDesc' }));
    expect(html).toContain('data-testid="sort-link-ageDesc"');
    expect(html).toContain('data-testid="sort-link-ageAsc"');
    expect(html).toContain('data-testid="sort-link-openedDesc"');
    expect(html).toContain('data-testid="sort-link-openedAsc"');
  });

  it('marks ageDesc as the active default', () => {
    const html = renderToStaticMarkup(React.createElement(SortDropdown, { activeSort: 'ageDesc' }));
    expect(html).toMatch(/data-testid="sort-link-ageDesc"[^>]*data-active="true"/);
    expect(html).toMatch(/data-testid="sort-link-ageAsc"[^>]*data-active="false"/);
    expect(html).toMatch(/data-active-sort="ageDesc"/);
  });

  it('reflects the activeSort from props', () => {
    const html = renderToStaticMarkup(React.createElement(SortDropdown, { activeSort: 'openedAsc' }));
    expect(html).toMatch(/data-active-sort="openedAsc"/);
    expect(html).toMatch(/data-testid="sort-link-openedAsc"[^>]*data-active="true"/);
  });

  it('drops the sort param entirely when selecting the default value', () => {
    mockState.params = { sort: 'ageAsc', view: 'ALL', page: '2' };
    const html = renderToStaticMarkup(React.createElement(SortDropdown, { activeSort: 'ageAsc' }));
    const m = html.match(/<a[^>]*data-testid="sort-link-ageDesc"[^>]*href="([^"]*)"/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toContain('sort=');
    expect(m![1]).not.toContain('page=');
  });

  it('sets the sort param when selecting a non-default value', () => {
    mockState.params = { view: 'ALL', page: '3' };
    const html = renderToStaticMarkup(React.createElement(SortDropdown, { activeSort: 'ageDesc' }));
    const m = html.match(/<a[^>]*data-testid="sort-link-ageAsc"[^>]*href="([^"]*)"/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain('sort=ageAsc');
    expect(m![1]).not.toContain('page=');
  });

  it('preserves unrelated params (e.g. view, caseStatus) on sort links', () => {
    mockState.params = { view: 'MINE', caseStatus: 'OPEN,IN_PROGRESS' };
    const html = renderToStaticMarkup(React.createElement(SortDropdown, { activeSort: 'ageDesc' }));
    const m = html.match(/<a[^>]*data-testid="sort-link-openedDesc"[^>]*href="([^"]*)"/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain('view=MINE');
    expect(m![1]).toContain('caseStatus=OPEN%2CIN_PROGRESS');
  });

  it('does NOT include POST/PATCH/DELETE forms or mutation methods', () => {
    const html = renderToStaticMarkup(React.createElement(SortDropdown, { activeSort: 'ageDesc' }));
    expect(html).not.toMatch(/method="POST"/);
    expect(html).not.toMatch(/method="PATCH"/);
    expect(html).not.toMatch(/method="DELETE"/);
    expect(html).not.toContain('fetch(');
    expect(html).not.toContain('axios');
  });

  it('exposes an accessible nav landmark with aria-label', () => {
    const html = renderToStaticMarkup(React.createElement(SortDropdown, { activeSort: 'ageDesc' }));
    expect(html).toContain('aria-label="Sắp xếp"');
    expect(html).toContain('role="navigation"');
  });
});
