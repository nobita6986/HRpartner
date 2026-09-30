/**
 * Generic regression guard for Next.js App Router dynamic-segment collisions.
 *
 * Problem this guards against (canonical reference incident:
 * hrp-p1-runtime-route-slug-hotfix, pre-fix main @ 63d19107):
 *   Under the app-api-admin-applications tree, the canonical sibling routes
 *   used the dynamic segment named 'id' (e.g. [id].route.ts,
 *   [id]/actions/qualify.route.ts, [id]/actions/screen.route.ts,
 *   [id]/actions/convert.route.ts, [id]/actions/reject.route.ts,
 *   [id]/status.route.ts), but a newly-added
 *   applications/[submissionId]/claim.route.ts used the different
 *   dynamic-segment name 'submissionId' at the SAME path position.
 *   Next.js refuses to build and serves HTTP 500 with
 *   'You cannot use different slug names for the same dynamic path
 *   ("id" !== "submissionId")' for every request to the application.
 *
 * What this test does:
 *   1. Recursively walks every route.ts file under app/.
 *   2. Splits the relative path into path segments. Each dynamic segment
 *      (matching the literal [name] shape used by Next.js) is recorded
 *      as { position, slugName }.
 *   3. Groups dynamic segments by position (path position relative to
 *      app/). At a given position, if multiple distinct slug names
 *      appear under SIBLING parents, the test fails with a precise list of
 *      conflicting pairs.
 *
 * Properties:
 *   - Generic: does NOT hard-code an allowlist for any single route. The
 *     same guard catches every dynamic-segment collision in the App Router
 *     tree.
 *   - Deterministic: pure filesystem walk + path comparison. No imports
 *     of Next.js or app code.
 *   - Fast: O(routes) + O(routes times segments). Runs in the unit lane
 *     (vitest.unit.config.ts).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const APP_DIR = join(ROOT, 'app');

const DYNAMIC_SEGMENT = /^\[(?<name>[^[\]]+)\]$/;

interface RouteFile {
  /** Path relative to repo root, forward-slash separated. */
  rel: string;
  /** Path segments from app/ onwards (positional). */
  segments: string[];
}

function walkRoutes(dir: string, acc: RouteFile[] = []): RouteFile[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      // Skip build artefacts; only walk real source folders.
      if (name === 'node_modules' || name === '.next' || name === '__tests__') continue;
      walkRoutes(full, acc);
    } else if (st.isFile() && name === 'route.ts') {
      const relPosix = relative(ROOT, full).split(sep).join('/');
      // Strip the app/ prefix so position 0 is the first segment after app/.
      const after = relPosix.startsWith('app/') ? relPosix.slice('app/'.length) : relPosix;
      const segments = after.split('/').slice(0, -1); // drop route.ts
      acc.push({ rel: relPosix, segments });
    }
  }
  return acc;
}

interface Conflict {
  position: number;
  parentSegments: string[];
  slugNames: Set<string>;
  examples: Array<{ slug: string; route: string }>;
}

function detectCollisions(routes: RouteFile[]): Conflict[] {
  // Map: position (after parent up to but excluding the dynamic segment)
  // to a list of { slug, parentSegments, route }.
  const byPosition = new Map<
    string,
    Array<{ slug: string; parentSegments: string[]; route: string }>
  >();

  for (const r of routes) {
    r.segments.forEach((seg, idx) => {
      const m = seg.match(DYNAMIC_SEGMENT);
      if (!m || !m.groups) return;
      const slug = m.groups['name'] as string;
      const parentSegments = r.segments.slice(0, idx);
      const key = `${idx}::${parentSegments.join('/')}`;
      const arr = byPosition.get(key) ?? [];
      arr.push({ slug, parentSegments, route: r.rel });
      byPosition.set(key, arr);
    });
  }

  const conflicts: Conflict[] = [];
  for (const [, entries] of byPosition) {
    const slugs = new Set(entries.map((e) => e.slug));
    if (slugs.size > 1) {
      const first = entries[0]!;
      conflicts.push({
        position: first.parentSegments.length,
        parentSegments: first.parentSegments,
        slugNames: slugs,
        examples: entries.map((e) => ({ slug: e.slug, route: e.route })),
      });
    }
  }
  return conflicts;
}

function formatConflict(c: Conflict): string {
  const parent = c.parentSegments.length === 0 ? '<app-root>' : c.parentSegments.join('/');
  const sample = c.examples
    .slice(0, 8)
    .map((e) => `    [${e.slug}] in ${e.route}`)
    .join('\n');
  const more = c.examples.length > 8 ? `\n    ... and ${c.examples.length - 8} more` : '';
  return (
    `App Router dynamic-segment collision at position ${c.position} under ` +
    `'${parent}': slugs [${[...c.slugNames].join(', ')}] appear as siblings.\n` +
    `Next.js refuses to build and serves HTTP 500 with 'You cannot use different ` +
    `slug names for the same dynamic path'.\n${sample}${more}`
  );
}

describe('App Router dynamic-segment collision guard (P1 route-slug hotfix)', () => {
  it('every sibling dynamic-segment name at the same path position is identical', () => {
    const routes = walkRoutes(APP_DIR);
    expect(routes.length, 'no route.ts files were scanned - guard is meaningless').toBeGreaterThan(0);

    const conflicts = detectCollisions(routes);
    if (conflicts.length > 0) {
      const report = conflicts.map(formatConflict).join('\n\n');
      throw new Error(
        `Found ${conflicts.length} App Router dynamic-segment collision(s):\n\n${report}\n\n` +
          `Fix: pick one canonical slug name at each conflicting path position ` +
          `(the slug used by the longest-existing / canonical branch wins) and ` +
          `rename the offending folders so all siblings share that slug. ` +
          `The route handler must read params via the canonical slug name; ` +
          `domain naming inside the handler may be preserved by aliasing ` +
          `(for example: 'const submissionId = resolved.id;'). ` +
          `External HTTP URLs are unaffected.`,
      );
    }
    expect(conflicts).toEqual([]);
  });

  it('the canonical claim route is wired under the canonical [id] dynamic segment', () => {
    // Pointed (still generic-shape) check that fails the exact pre-fix
    // regression: there must NOT be an applications/[submissionId] route
    // file coexisting with applications/[id]/... route files.
    const routes = walkRoutes(APP_DIR);
    const subIdRoutes = routes.filter((r) =>
      r.segments.some((s) => s === '[submissionId]'),
    );
    expect(
      subIdRoutes,
      `Pre-fix regression: route files still use [submissionId] at a position where siblings use [id]. ` +
        `Offenders:\n  ${subIdRoutes.map((r) => r.rel).join('\n  ')}`,
    ).toEqual([]);
  });

  it('no [id]/[submissionId] dual-slug cohabitation anywhere in app/', () => {
    const routes = walkRoutes(APP_DIR);
    const offenders = routes.filter((r) => {
      const set = new Set(r.segments);
      return set.has('[id]') && set.has('[submissionId]');
    });
    expect(offenders, 'a single route file should not reference both [id] and [submissionId]').toEqual([]);
  });
});
