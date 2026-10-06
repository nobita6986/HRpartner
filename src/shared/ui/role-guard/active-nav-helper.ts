/**
 * active-nav-helper.ts — hrp-p1a03-jobposting-create-nav-fix / P1-NAV-01
 *                       + hrp-t1c-pre-p2-sidebar-active-nav-hotfix (T1C v1.0).
 *
 * Pure helper consumed by `RoleGuardLayout` to compute the single active sidebar
 * item for the current `pathname`. Pinned by RQ-08..RQ-14.
 *
 * Why this helper exists (P1-NAV-01):
 *   The prior implementation matched `pathname === href || pathname.startsWith(href + '/')`.
 *   For admin nav this caused double-active highlighting on `/admin/jobs/job-postings`:
 *   both `/admin/jobs` and `/admin/jobs/job-postings` matched the same pathname.
 *   The acceptance contract requires "longest matching href wins". This helper
 *   expresses that decision in one pure function so:
 *     1. The active-state computation is deterministic.
 *     2. The same authority can be reused for `<details open>` (development)
 *        and any future nav surface without forking the logic.
 *     3. Unit tests cover parent/child/sibling/no-match without rendering React.
 *
 * T1C pre-P2 sidebar alias addition:
 *   Several admin route families do not share a href prefix with any sidebar
 *   item (`/admin/staffing-orders/{id}` has no `/admin/staffing-orders` href
 *   in `ADMIN_NAV_PHASE4`, but it semantically belongs to the "Nhu cầu tuyển
 *   dụng" item at `/admin/staffing`). Without a bridge, those routes render
 *   zero active item and the layout's CSS-level "Tổng quan" fallback gives
 *   the false impression that `/admin` is active.
 *
 *   The fix is the explicit, deterministic `aliases` field on `NavHrefItem`
 *   plus a named export `ADMIN_NAV_WITH_ALIASES` (the canonical route-family
 *   map) so the resolution rule is testable in isolation and the JSX does
 *   NOT branch on pathnames. The longest matching CANDIDATE (item.href or
 *   any of its aliases) wins; the function returns the canonical `item.href`
 *   of the winning item, never the alias string.
 *
 * Pure / no React / no DOM / no side effects.
 */

export interface NavHrefItem {
  /** Unique href identifying the nav entry (e.g. '/admin/jobs/job-postings'). */
  readonly href: string;
  /**
   * Optional label — opaque to this helper; only `href` is consulted.
   */
  readonly label?: string;
  /**
   * Optional list of route-family patterns that should be treated as belonging
   * to this nav entry. Each alias is matched with the same prefix rule as
   * `href` (see {@link matches}): exact equality OR `pathname.startsWith(alias + '/')`.
   * Aliases are NEVER returned by {@link getMostSpecificActiveHref}; the
   * canonical `href` of the winning item is returned instead. This keeps the
   * sidebar highlight authority on the canonical href while letting
   * long-tail route families participate in active-state resolution.
   *
   * Example: `{ href: '/admin/staffing', aliases: ['/admin/staffing-orders'] }`
   * makes `/admin/staffing-orders/{id}` highlight the "Nhu cầu tuyển dụng"
   * item instead of falling back to `/admin`.
   */
  readonly aliases?: readonly string[];
}

/**
 * Return the active `href` for a given `pathname` among `visibleNav` items.
 *
 * Algorithm (deterministic):
 *   1. Iterate `visibleNav` once.
 *   2. For each item, build its candidate list = `[item.href, ...(item.aliases ?? [])]`.
 *   3. For each candidate, check whether `pathname` is on the candidate — two cases:
 *        - exact equality (`pathname === candidate`); OR
 *        - hierarchical descendant: `pathname` starts with `candidate + '/'`
 *          (so `/admin/staffing-orders/123` matches the alias
 *          `/admin/staffing-orders` but `/admin/staffing-orders-other` does NOT).
 *      The root path `/` is treated specially — a pathname equal to `/` matches
 *      `candidate === '/'` only (no descendant matching for the root).
 *   4. Among all matching candidates across all items, return the canonical
 *      `item.href` of the item that owns the LONGEST matching candidate.
 *      Longest wins — so for `pathname='/admin/jobs/job-postings/123'` the
 *      candidate `/admin/jobs/job-postings` (length 27) wins over `/admin/jobs`
 *      (length 11). The returned value is the canonical `href`, not the alias.
 *   5. If no candidate matches, return `null`.
 *
 * Returns the canonical href as a string. If two items share the same max
 * candidate length (impossible under the strict-IA + alias contract), the
 * function returns the first item encountered, preserving input order.
 */
export function getMostSpecificActiveHref<T extends NavHrefItem>(
  pathname: string | null | undefined,
  visibleNav: readonly T[],
): string | null {
  if (!pathname || typeof pathname !== 'string') return null;
  if (!Array.isArray(visibleNav)) return null;

  let winnerHref: string | null = null;
  let winnerLen = -1;
  for (const item of visibleNav) {
    if (!item || typeof item.href !== 'string' || item.href.length === 0) continue;
    const candidates: readonly string[] = [item.href, ...(item.aliases ?? [])];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string' || candidate.length === 0) continue;
      if (matches(pathname, candidate) && candidate.length > winnerLen) {
        winnerHref = item.href;
        winnerLen = candidate.length;
      }
    }
  }
  return winnerHref;
}

function matches(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Root case: do not prefix-match `/` — every non-root pathname would falsely
  // match the root item.
  if (href === '/') return false;
  // T1C pre-P2 hotfix (T0 directive §Yêu cầu R1): treat `/admin` as exact-only
  // too — it is the Tổng quan (Dashboard) item and must NEVER highlight as a
  // prefix fallback for any child route. Without this rule, every pathname
  // starting with `/admin/` would falsely match `/admin` and the longest-
  // prefix rule would always elect `/admin` for unknown long-tail routes,
  // violating "no fallback to Tổng quan" (R2 + R4).
  if (href === '/admin') return false;
  // Hierarchical descendant: `/admin/jobs` matches `/admin/jobs/job-postings`,
  // but `/admin/jobs-other` does NOT match `/admin/jobs`.
  return pathname.startsWith(href + '/');
}

/**
 * Canonical route-family alias map for the admin portal. Each entry pairs a
 * nav `href` (the canonical sidebar item) with the route patterns that
 * belong to it. The map is the single source of truth for "which
 * long-tail route families highlight which sidebar item"; layout code does
 * NOT branch on pathnames — it consumes `ADMIN_NAV_WITH_ALIASES` instead.
 *
 * Rules pinned by T0 directive (hrp-t1c-pre-p2-sidebar-active-nav-hotfix v1.0):
 *   - `/admin/projects*`              → /admin/projects
 *   - `/admin/staffing*`              → /admin/staffing
 *   - `/admin/staffing-orders*`       → /admin/staffing
 *   - `/admin/jobs/job-postings*`     → /admin/jobs/job-postings
 *   - `/admin/job-openings*`          → /admin/jobs/job-postings (when present)
 *   - `/admin/applications*`          → /admin/applications
 *   - `/admin/workers*`               → /admin/workers
 *   - `/admin/labor-profiles*`        → /admin/labor-profiles
 *
 * `clients / vendors / users / settings / media` and other nav families
 * already match via the longest-prefix rule (their hrefs ARE the prefix
 * for their own descendants), so no alias is required.
 *
 * This map is the layout-side data shape; it is intentionally kept as a
 * separate named export so a future layout (e.g. a worker portal with its
 * own long-tail routes) can build its own `*_NAV_WITH_ALIASES` from the
 * same resolution rule without modifying this helper.
 */
export const ADMIN_NAV_WITH_ALIASES: readonly NavHrefItem[] = [
  { href: '/admin' },
  { href: '/admin/projects' },
  { href: '/admin/staffing', aliases: ['/admin/staffing-orders'] },
  { href: '/admin/jobs/job-postings', aliases: ['/admin/job-openings'] },
  { href: '/admin/applications' },
  { href: '/admin/workers' },
  { href: '/admin/labor-profiles' },
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
