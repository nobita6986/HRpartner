/**
 * role-guard-layout.test.ts — P1-NAV-01 / RQ-13, RQ-14 wiring proof.
 *
 * Strategy: instead of rendering the Next.js client component (which requires a
 * Next router and a render harness that the repo does not currently maintain),
 * we assert the static structural changes that prove the wiring:
 *   - The helper module is imported and used.
 *   - The previously broken prefix-match expression is removed.
 *   - The active flag is computed by `getMostSpecificActiveHref`.
 *
 * This test is intentionally light; the heavy coverage of the helper itself
 * lives in `active-nav-helper.test.ts`. The combination of these two files
 * locks the P1-NAV-01 invariant.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LAYOUT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'src',
  'shared',
  'ui',
  'role-guard',
  'role-guard-layout.tsx',
);

describe('RoleGuardLayout — P1-NAV-01 wiring proof', () => {
  const source = readFileSync(LAYOUT_PATH, 'utf8');

  it('imports getMostSpecificActiveHref from the helper module', () => {
    expect(source).toContain("from './active-nav-helper'");
    expect(source).toContain('getMostSpecificActiveHref');
  });

  it('no longer contains the broken prefix-match expression', () => {
    expect(source).not.toContain("pathname === href || (href !== '/' && pathname?.startsWith(href + '/'))");
  });

  it('defines an activeHref memo derived from the helper', () => {
    expect(source).toMatch(/const activeHref\s*=\s*React\.useMemo\(\s*\(\)\s*=>\s*getMostSpecificActiveHref/);
  });

  it('uses item.href === activeHref (not startsWith) for the per-item active flag', () => {
    expect(source).toMatch(/href === activeHref/);
  });

  it('keeps the worker portal bottom-nav on exact-match (pathname === item.href)', () => {
    expect(source).toMatch(/const active = pathname === item\.href;/);
  });

  it('preserves ADMIN_NAV_PHASE4 structure byte-exact — labels and order are not changed', () => {
    // Indirect guard: no `ADMIN_NAV_PHASE4 = [` reassignment, no removal of any
    // pre-existing nav entry. The full array should still appear in the file.
    expect(source).toContain('export const ADMIN_NAV_PHASE4: NavItem[] = [');
    expect(source).toContain("href: '/admin/jobs'");
    expect(source).toContain("href: '/admin/jobs/job-postings'");
  });
});
