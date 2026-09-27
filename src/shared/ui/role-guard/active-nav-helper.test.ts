/**
 * active-nav-helper.test.ts — RQ-08..RQ-14 / AC-16..AC-19 unit tests.
 *
 * Pinned by `docs/tasks/hrp-p1a03-jobposting-create-nav-fix/TASK.md` AC-NAV-01..AC-NAV-08.
 * Pure-function tests; no React / no DOM.
 */
import { describe, expect, it } from 'vitest';
import { getMostSpecificActiveHref, type NavHrefItem } from './active-nav-helper';

const ADMIN_NAV_FIXTURE: readonly NavHrefItem[] = [
  { href: '/admin' },
  { href: '/admin/projects' },
  { href: '/admin/jobs' },
  { href: '/admin/jobs/job-postings' },
  { href: '/admin/applications' },
  { href: '/admin/staffing' },
  { href: '/admin/workers' },
  { href: '/admin/users' },
  { href: '/admin/clients' },
  { href: '/admin/vendors' },
  { href: '/admin/tickets' },
  { href: '/admin/attendance' },
  { href: '/admin/commission/policies' },
  { href: '/admin/commission/ledger' },
  { href: '/admin/reconciliation' },
  { href: '/admin/payroll' },
  { href: '/admin/settings' },
  { href: '/admin/media' },
];

describe('getMostSpecificActiveHref', () => {
  // RQ-08 / AC-16 — child wins over parent.
  it('returns /admin/jobs/job-postings when pathname is /admin/jobs/job-postings', () => {
    const winner = getMostSpecificActiveHref('/admin/jobs/job-postings', ADMIN_NAV_FIXTURE);
    expect(winner).toBe('/admin/jobs/job-postings');
  });

  // RQ-08 / AC-16 — child wins over parent for arbitrary nested IDs.
  it('returns /admin/jobs/job-postings when pathname is /admin/jobs/job-postings/{id}', () => {
    const winner = getMostSpecificActiveHref(
      '/admin/jobs/job-postings/abc-123',
      ADMIN_NAV_FIXTURE,
    );
    expect(winner).toBe('/admin/jobs/job-postings');
  });

  // RQ-08 / AC-16 — sibling root `/admin` is matched but `/admin/jobs` is the parent.
  it('returns /admin/jobs when pathname is /admin/jobs (parent only)', () => {
    const winner = getMostSpecificActiveHref('/admin/jobs', ADMIN_NAV_FIXTURE);
    expect(winner).toBe('/admin/jobs');
  });

  // RQ-08 / AC-16 — sibling `/admin` only matches at the root.
  it('returns /admin when pathname is /admin', () => {
    const winner = getMostSpecificActiveHref('/admin', ADMIN_NAV_FIXTURE);
    expect(winner).toBe('/admin');
  });

  // RQ-08 / AC-16 — no overlap when pathname does not match anything.
  it('returns null when pathname matches no item', () => {
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/jobs' },
      { href: '/admin/users' },
    ];
    expect(getMostSpecificActiveHref('/admin/random', fixture)).toBeNull();
  });

  // RQ-08 — exact-match on the deepest visible item.
  it('returns /admin/users when pathname is /admin/users (parent /admin also matches but is shorter)', () => {
    const winner = getMostSpecificActiveHref('/admin/users', ADMIN_NAV_FIXTURE);
    expect(winner).toBe('/admin/users');
  });

  // RQ-08 / AC-16 — `/admin/users` does NOT match `/admin/users-other`.
  it('does not false-match sibling routes that share a prefix but diverge on the next segment', () => {
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/users' },
      { href: '/admin/users-extra' },
    ];
    expect(getMostSpecificActiveHref('/admin/users-extra/123', fixture)).toBe('/admin/users-extra');
    expect(getMostSpecificActiveHref('/admin/users', fixture)).toBe('/admin/users');
  });

  // RQ-08 — child `/admin/jobs/job-postings` still wins when sibling `/admin/jobs-archive` exists.
  it('disambiguates across same-prefix siblings', () => {
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/jobs' },
      { href: '/admin/jobs-archive' },
      { href: '/admin/jobs/job-postings' },
    ];
    expect(getMostSpecificActiveHref('/admin/jobs/job-postings/123', fixture)).toBe(
      '/admin/jobs/job-postings',
    );
    expect(getMostSpecificActiveHref('/admin/jobs-archive/123', fixture)).toBe(
      '/admin/jobs-archive',
    );
  });

  // RQ-08 / AC-16 — root `/` does not falsely match every pathname.
  it('does not let "/" prefix-match every pathname', () => {
    const fixture: readonly NavHrefItem[] = [
      { href: '/' },
      { href: '/admin' },
    ];
    expect(getMostSpecificActiveHref('/admin/jobs', fixture)).toBe('/admin');
    expect(getMostSpecificActiveHref('/', fixture)).toBe('/');
  });

  // RQ-08 — empty / null pathname returns null.
  it('returns null for empty / null / undefined pathname', () => {
    expect(getMostSpecificActiveHref(null, ADMIN_NAV_FIXTURE)).toBeNull();
    expect(getMostSpecificActiveHref(undefined, ADMIN_NAV_FIXTURE)).toBeNull();
    expect(getMostSpecificActiveHref('', ADMIN_NAV_FIXTURE)).toBeNull();
  });

  // RQ-08 — empty / null visibleNav returns null without throwing.
  it('returns null for empty visibleNav', () => {
    expect(getMostSpecificActiveHref('/admin', [])).toBeNull();
  });

  // RQ-08 — first item wins on equal-length collisions (preserves input order).
  it('keeps input order on length-equal collisions', () => {
    const fixture: readonly NavHrefItem[] = [
      { href: '/a/b' },
      { href: '/c/d' },
    ];
    expect(getMostSpecificActiveHref('/a/b', fixture)).toBe('/a/b');
    expect(getMostSpecificActiveHref('/c/d', fixture)).toBe('/c/d');
  });

  // RQ-08 — malformed entries (empty href) are skipped, not thrown.
  it('skips malformed entries (empty href / non-string)', () => {
    const fixture = [
      { href: '' },
      { href: '/admin' },
      { href: 123 as unknown as string },
    ] as unknown as readonly NavHrefItem[];
    expect(getMostSpecificActiveHref('/admin', fixture)).toBe('/admin');
  });

  // RQ-08 — `null` non-array input is null.
  it('returns null when visibleNav is not an array', () => {
    expect(
      getMostSpecificActiveHref('/admin', null as unknown as readonly NavHrefItem[]),
    ).toBeNull();
  });
});
