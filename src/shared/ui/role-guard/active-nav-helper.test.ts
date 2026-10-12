/**
 * active-nav-helper.test.ts — RQ-08..RQ-14 / AC-16..AC-19 unit tests.
 *
 * Pinned by `docs/tasks/hrp-p1a03-jobposting-create-nav-fix/TASK.md` AC-NAV-01..AC-NAV-08.
 * Extended by `docs/tasks/hrp-t1c-pre-p2-sidebar-active-nav-hotfix/TASK.md` v1.0 §2
 * (T0 directive: each admin route must highlight exactly one menu; route
 * detail must not fall back to "Tổng quan"; alias resolution must be
 * explicit and deterministic).
 *
 * Pure-function tests; no React / no DOM.
 */
import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV_WITH_ALIASES,
  getMostSpecificActiveHref,
  type NavHrefItem,
} from './active-nav-helper';

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
    // T0 directive R1: `/admin` is exact-only (no prefix fallback to Tổng
    // quan for child routes). The original assertion
    //   expect(getMostSpecificActiveHref('/admin/jobs', fixture)).toBe('/admin')
    // was correct under the pre-T1C contract; under the T1C contract the
    // expected return is `null` (no item matches) because the visible nav
    // has no item for `/admin/jobs` either. The test now pins both rules:
    //   (a) `/` does not prefix-match every pathname (the original RQ-08
    //       invariant for the root);
    //   (b) `/admin` is exact-only and does not act as a fallback for
    //       `/admin/jobs` (the T0 directive R1+R2 invariant for the
    //       Tổng quan item).
    expect(getMostSpecificActiveHref('/admin/jobs', fixture)).toBeNull();
    expect(getMostSpecificActiveHref('/', fixture)).toBe('/');
    expect(getMostSpecificActiveHref('/admin', fixture)).toBe('/admin');
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

// ────────────────────────────────────────────────────────────────────────────
// T1C pre-P2 sidebar active-nav hotfix (T0 directive v1.0 §2 acceptance).
// ────────────────────────────────────────────────────────────────────────────

describe('getMostSpecificActiveHref — T1C pre-P2 sidebar alias resolution', () => {
  // The helper must keep honoring the exact behavior for the cases that
  // already pass. These cases run against the alias-aware canonical fixture
  // (ADMIN_NAV_WITH_ALIASES) and must produce the same canonical href the
  // pre-fix fixture produced, so consumers of the helper see no regression.

  it('R-1 — /admin highlights only on exact /admin (no fallback to Tổng quan for child routes)', () => {
    expect(getMostSpecificActiveHref('/admin', ADMIN_NAV_WITH_ALIASES)).toBe('/admin');
  });

  it('R-3a — /admin/projects/{id} highlights Dự án (/admin/projects)', () => {
    expect(
      getMostSpecificActiveHref('/admin/projects/abc-123', ADMIN_NAV_WITH_ALIASES),
    ).toBe('/admin/projects');
  });

  it('R-3b — /admin/staffing highlights Nhu cầu tuyển dụng', () => {
    expect(getMostSpecificActiveHref('/admin/staffing', ADMIN_NAV_WITH_ALIASES)).toBe(
      '/admin/staffing',
    );
  });

  it('R-3c — /admin/staffing-orders/{id} highlights Nhu cầu tuyển dụng (alias bridge)', () => {
    expect(
      getMostSpecificActiveHref(
        '/admin/staffing-orders/abc-123',
        ADMIN_NAV_WITH_ALIASES,
      ),
    ).toBe('/admin/staffing');
  });

  it('R-3c2 — /admin/staffing-orders (exact, no id) still highlights Nhu cầu tuyển dụng', () => {
    expect(
      getMostSpecificActiveHref('/admin/staffing-orders', ADMIN_NAV_WITH_ALIASES),
    ).toBe('/admin/staffing');
  });

  it('R-3d — /admin/jobs/job-postings/{id} highlights Tin tuyển dụng', () => {
    expect(
      getMostSpecificActiveHref(
        '/admin/jobs/job-postings/abc-123',
        ADMIN_NAV_WITH_ALIASES,
      ),
    ).toBe('/admin/jobs/job-postings');
  });

  it('R-3e — /admin/job-openings/{id} highlights Tin tuyển dụng (alias bridge, when route exists)', () => {
    expect(
      getMostSpecificActiveHref(
        '/admin/job-openings/abc-123',
        ADMIN_NAV_WITH_ALIASES,
      ),
    ).toBe('/admin/jobs/job-postings');
  });

  it('R-3f — /admin/applications/{id} highlights Đơn ứng tuyển', () => {
    expect(
      getMostSpecificActiveHref('/admin/applications/abc-123', ADMIN_NAV_WITH_ALIASES),
    ).toBe('/admin/applications');
  });

  it('R-3g — /admin/workers/{id} highlights Người lao động', () => {
    expect(
      getMostSpecificActiveHref('/admin/workers/abc-123', ADMIN_NAV_WITH_ALIASES),
    ).toBe('/admin/workers');
  });

  it('R-3h — /admin/labor-profiles/{id} highlights Hồ sơ ứng viên', () => {
    expect(
      getMostSpecificActiveHref(
        '/admin/labor-profiles/abc-123',
        ADMIN_NAV_WITH_ALIASES,
      ),
    ).toBe('/admin/labor-profiles');
  });

  it('R-4 — unknown /admin/* returns null (no Tổng quan fallback, no item active)', () => {
    expect(
      getMostSpecificActiveHref('/admin/lorem-ipsum', ADMIN_NAV_WITH_ALIASES),
    ).toBeNull();
    expect(
      getMostSpecificActiveHref('/admin/staffing-orders-other', ADMIN_NAV_WITH_ALIASES),
    ).toBeNull();
  });

  it('R-5 — the helper returns at most one href for any pathname (invariant)', () => {
    const samples = [
      '/admin',
      '/admin/projects/abc-123',
      '/admin/staffing',
      '/admin/staffing-orders/abc-123',
      '/admin/jobs/job-postings/abc-123',
      '/admin/job-openings/abc-123',
      '/admin/applications/abc-123',
      '/admin/workers/abc-123',
      '/admin/labor-profiles/abc-123',
      '/admin/lorem-ipsum',
    ];
    for (const p of samples) {
      const result = getMostSpecificActiveHref(p, ADMIN_NAV_WITH_ALIASES);
      // The helper returns a single string-or-null; the contract "at most one
      // active item" is encoded in the return type. This test pins the type
      // contract so future edits do not silently turn it into an array.
      expect(typeof result === 'string' || result === null).toBe(true);
    }
  });

  it('R-7 — regression: /admin/jobs does not steal /admin/jobs/job-postings/* highlighting', () => {
    // The existing /admin/jobs/job-postings child must still win over the
    // /admin/jobs parent. The admin fixture intentionally keeps /admin/jobs
    // so the longest-candidate rule keeps it dominant; this case re-asserts
    // the contract on the alias-aware fixture too.
    expect(
      getMostSpecificActiveHref(
        '/admin/jobs/job-postings/abc-123',
        ADMIN_NAV_WITH_ALIASES,
      ),
    ).toBe('/admin/jobs/job-postings');
  });

  it('R-7b — explicit child /admin/jobs/job-postings wins when alias for /admin/job-openings is also a candidate', () => {
    // Both /admin/jobs/job-postings and /admin/job-openings are valid
    // candidates (the canonical href and its alias). The canonical href is
    // longer, so it must win on equal-pathname exact match.
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/jobs/job-postings', aliases: ['/admin/job-openings'] },
    ];
    expect(
      getMostSpecificActiveHref('/admin/jobs/job-postings', fixture),
    ).toBe('/admin/jobs/job-postings');
  });

  it('R-7c — alias never returns the alias string; it returns the canonical href', () => {
    // This is the heart of the contract: even when a long-tail route only
    // matches via the alias, the helper returns the canonical href that the
    // sidebar item actually uses (so the layout can light up the correct
    // <Link> via the existing `href === activeHref` rule).
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/staffing', aliases: ['/admin/staffing-orders'] },
    ];
    const winner = getMostSpecificActiveHref(
      '/admin/staffing-orders/abc-123',
      fixture,
    );
    expect(winner).toBe('/admin/staffing');
    expect(winner).not.toBe('/admin/staffing-orders');
  });

  it('R-7d — alias sibling divergence: /admin/staffing-orders-other does not match /admin/staffing alias', () => {
    // The alias rule uses the same prefix-with-separator rule as the href
    // rule. /admin/staffing-orders-other must not falsely match the alias
    // /admin/staffing-orders (length 21) → which would otherwise light up
    // the staffing item for a non-existent route.
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/staffing', aliases: ['/admin/staffing-orders'] },
    ];
    expect(
      getMostSpecificActiveHref('/admin/staffing-orders-other/abc', fixture),
    ).toBeNull();
  });

  it('R-7e — alias depth disambiguation: /admin/staffing-orders/{id}/sub still matches the alias', () => {
    // The alias rule treats the alias like a nav prefix, so deeper
    // descendants must continue matching. This guards against an accidental
    // exact-only alias rule.
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/staffing', aliases: ['/admin/staffing-orders'] },
    ];
    expect(
      getMostSpecificActiveHref(
        '/admin/staffing-orders/abc-123/edit-order',
        fixture,
      ),
    ).toBe('/admin/staffing');
  });

  it('R-7f — alias never overrides a deeper canonical candidate from another item', () => {
    // If the nav has both /admin/staffing-orders directly AND a longer
    // /admin/staffing item, the longer item wins (longest-candidate-wins).
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/staffing' },
      { href: '/admin/staffing-orders' },
    ];
    expect(
      getMostSpecificActiveHref(
        '/admin/staffing-orders/abc-123',
        fixture,
      ),
    ).toBe('/admin/staffing-orders');
  });

  it('R-7g — aliases on multiple items do not produce double-active for the same pathname', () => {
    // Two items both carry aliases; the longest candidate across all items
    // wins. The contract is "≤ 1 active item" → encoded by the helper
    // returning one string-or-null.
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/jobs/job-postings', aliases: ['/admin/job-openings'] },
      { href: '/admin/staffing', aliases: ['/admin/staffing-orders'] },
    ];
    expect(
      getMostSpecificActiveHref('/admin/staffing-orders/abc', fixture),
    ).toBe('/admin/staffing');
    expect(
      getMostSpecificActiveHref('/admin/job-openings/abc', fixture),
    ).toBe('/admin/jobs/job-postings');
  });

  it('R-8 — existing P1-NAV longest-prefix contract holds for sibling /admin/jobs-archive after aliases were added', () => {
    // Regression: introducing aliases must not weaken the existing
    // /admin/jobs-archive sibling-divergence proof.
    const fixture: readonly NavHrefItem[] = [
      { href: '/admin/jobs' },
      { href: '/admin/jobs-archive' },
      { href: '/admin/jobs/job-postings', aliases: ['/admin/job-openings'] },
    ];
    expect(getMostSpecificActiveHref('/admin/jobs-archive/123', fixture)).toBe(
      '/admin/jobs-archive',
    );
    expect(
      getMostSpecificActiveHref('/admin/jobs/job-postings/123', fixture),
    ).toBe('/admin/jobs/job-postings');
    expect(getMostSpecificActiveHref('/admin/job-openings/123', fixture)).toBe(
      '/admin/jobs/job-postings',
    );
  });

  it('R-malformed-aliases — non-string / empty alias entries are skipped without throwing', () => {
    const fixture = [
      { href: '/admin/staffing', aliases: ['', 123 as unknown as string, '/admin/staffing-orders'] },
    ] as unknown as readonly NavHrefItem[];
    expect(
      getMostSpecificActiveHref('/admin/staffing-orders/abc', fixture),
    ).toBe('/admin/staffing');
  });
});
