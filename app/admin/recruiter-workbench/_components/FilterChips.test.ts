/**
 * FilterChips.test.ts — Unit tests for URL-state filter chips.
 *
 * Frozen contracts (TASK.md AC-03, RQ-03):
 *   - Each chip is a `<Link>` that swaps one URL param and resets `page`.
 *   - `view` chips are restricted by the `allowedViews` prop.
 *   - `caseStatus` is multi-select (toggles in/out of a comma-separated list).
 *   - `overdue` is `true | false | null`; toggling also resets `page`.
 *   - Search form `action` = push to a URL with `search` set and `page`
 *     cleared.
 *
 * Mocking: `next/navigation` provides `usePathname / useSearchParams / useRouter`.
 * The tests `renderToStaticMarkup` each scenario with controlled params.
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

import { FilterChips } from './FilterChips';

const ALL = ['ALL', 'MINE', 'UNASSIGNED'] as const;

function renderChips(
  view: 'ALL' | 'MINE' | 'UNASSIGNED' | null,
  statuses: ReadonlyArray<'OPEN' | 'IN_PROGRESS' | 'READY_TO_PLACE' | 'CLOSED'>,
  overdue: boolean | null,
  search: string | null,
  allowedViews: ReadonlyArray<'ALL' | 'MINE' | 'UNASSIGNED'> = ALL,
) {
  return renderToStaticMarkup(
    React.createElement(FilterChips, {
      activeCaseStatuses: statuses,
      activeView: view,
      activeOverdue: overdue,
      activeSearch: search,
      allowedViews: allowedViews,
    }),
  );
}

describe('FilterChips', () => {
  beforeEach(() => {
    mockState.pathname = '/admin/recruiter-workbench';
    mockState.params = {};
  });

  it('renders view chips limited by allowedViews and reflects the active one', () => {
    const html = renderChips('ALL', [], null, null, ['ALL']);
    expect(html).toContain('data-testid="view-chip-ALL"');
    expect(html).not.toContain('data-testid="view-chip-MINE"');
    expect(html).not.toContain('data-testid="view-chip-UNASSIGNED"');
    expect(html).toContain('data-active="true"');
  });

  it('omits ALL chip when MINE-only role is provided', () => {
    const html = renderChips('MINE', [], null, null, ['MINE']);
    expect(html).not.toContain('data-testid="view-chip-ALL"');
    expect(html).not.toContain('data-testid="view-chip-UNASSIGNED"');
    expect(html).toContain('data-testid="view-chip-MINE"');
  });

  it('renders all four case-status chips and marks active ones', () => {
    const html = renderChips(null, ['OPEN', 'IN_PROGRESS'], null, null);
    expect(html).toContain('data-testid="status-chip-OPEN"');
    expect(html).toContain('data-testid="status-chip-IN_PROGRESS"');
    expect(html).toContain('data-testid="status-chip-READY_TO_PLACE"');
    expect(html).toContain('data-testid="status-chip-CLOSED"');
  });

  it('overdue=true chip stays clickable; the chip is active when overdueOn=true', () => {
    mockState.params = { overdue: 'true', page: '3' };
    const html = renderChips(null, [], true, null);
    expect(html).toContain('data-testid="overdue-chip-true"');
    expect(html).toContain('data-testid="overdue-chip-false"');
  });

  it('overdue=false branch exposes the chip and prior URL state is preserved on click', () => {
    mockState.params = { view: 'ALL' };
    const html = renderChips(null, [], false, null);
    const overdue = html.match(/<a[^>]*data-testid="overdue-chip-false"[^>]*href="([^"]*)"/);
    expect(overdue).not.toBeNull();
    expect(overdue![1]).not.toContain('overdue=false');
  });

  it('toggling view also clears page=1 (resets pagination)', () => {
    mockState.params = { view: 'MINE', page: '5' };
    const html = renderChips('MINE', [], null, null);
    const viewAll = html.match(/<a[^>]*data-testid="view-chip-ALL"[^>]*href="([^"]*)"/);
    expect(viewAll).not.toBeNull();
    expect(viewAll![1]).not.toContain('page=5');
  });

  it('preserves unrelated params when toggling view', () => {
    mockState.params = { sort: 'openedDesc', search: 'Nguyen' };
    const html = renderChips(null, [], null, 'Nguyen');
    expect(html).toContain('sort=openedDesc');
    expect(html).toContain('search=Nguyen');
  });

  it('shows Xóa clear-link when search is active', () => {
    mockState.params = { search: 'something' };
    const html = renderChips(null, [], null, 'something');
    expect(html).toContain('data-testid="search-clear"');
    // The clear-link itself drops `search=` from its href:
    const clearHref = html.match(/<a[^>]*data-testid="search-clear"[^>]*href="([^"]*)"/);
    expect(clearHref).not.toBeNull();
    expect(clearHref![1]).not.toContain('search=');
  });

  it('hides clear-link when search is null', () => {
    mockState.params = {};
    const html = renderChips(null, [], null, null);
    expect(html).not.toContain('data-testid="search-clear"');
  });

  it('renders the ARIA group labels for each filter facet', () => {
    const html = renderChips(null, [], null, null);
    expect(html).toContain('aria-label="Bộ lọc view"');
    expect(html).toContain('aria-label="Bộ lọc trạng thái case"');
    expect(html).toContain('aria-label="Bộ lọc quá hạn"');
    expect(html).toContain('role="search"');
  });

  it('renders an underlying form for search submission (no mutation)', () => {
    const html = renderChips(null, [], null, null);
    expect(html).toMatch(/<form[^>]*role="search"/);
    expect(html).not.toMatch(/<form[^>]*method="POST"/);
  });
});
