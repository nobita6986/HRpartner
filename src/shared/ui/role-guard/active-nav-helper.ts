/**
 * active-nav-helper.ts — hrp-p1a03-jobposting-create-nav-fix / P1-NAV-01.
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
 * Pure / no React / no DOM / no side effects.
 */

export interface NavHrefItem {
  /** Unique href identifying the nav entry (e.g. '/admin/jobs/job-postings'). */
  readonly href: string;
  /** Optional label — opaque to this helper; only `href` is consulted. */
  readonly label?: string;
}

/**
 * Return the active `href` for a given `pathname` among `visibleNav` items.
 *
 * Algorithm (deterministic):
 *   1. Iterate `visibleNav` once.
 *   2. For each item, check whether `pathname` is on the item — two cases:
 *        - exact equality (`pathname === item.href`); OR
 *        - hierarchical descendant: `pathname` starts with `item.href + '/'`
 *          (so `/admin/jobs/job-postings/123` matches `/admin/jobs/job-postings`
 *          but `/admin/jobs-other` does NOT match `/admin/jobs`).
 *      The root path `/` is treated specially — a pathname equal to `/` matches
 *      `href === '/'` only (no descendant matching for the root, to avoid
 *      false positives).
 *   3. Among all matching items, return the one with the longest `href`.
 *      Longest wins — so for `pathname='/admin/jobs/job-postings'` the item
 *      `/admin/jobs/job-postings` (length 27) wins over `/admin/jobs` (length 11).
 *   4. If no item matches, return `null`.
 *
 * Returns the href as a string. If two items share the same max length (impossible
 * under the strict-IA contract), the function returns the first one encountered,
 * preserving the input order.
 */
export function getMostSpecificActiveHref<T extends NavHrefItem>(
  pathname: string | null | undefined,
  visibleNav: readonly T[],
): string | null {
  if (!pathname || typeof pathname !== 'string') return null;
  if (!Array.isArray(visibleNav)) return null;

  let winner: string | null = null;
  let winnerLen = -1;
  for (const item of visibleNav) {
    if (!item || typeof item.href !== 'string' || item.href.length === 0) continue;
    if (matches(pathname, item.href)) {
      if (item.href.length > winnerLen) {
        winner = item.href;
        winnerLen = item.href.length;
      }
    }
  }
  return winner;
}

function matches(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Root case: do not prefix-match `/` — every non-root pathname would falsely
  // match the root item.
  if (href === '/') return false;
  // Hierarchical descendant: `/admin/jobs` matches `/admin/jobs/job-postings`,
  // but `/admin/jobs-other` does NOT match `/admin/jobs`.
  return pathname.startsWith(href + '/');
}
