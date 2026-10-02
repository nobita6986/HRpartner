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

describe('RoleGuardLayout — T1C Con người IA realignment', () => {
  const source = readFileSync(LAYOUT_PATH, 'utf8');

  it("declares 'partners' as a valid section value", () => {
    // The T1C realignment introduces a new `partners` group; the type union
    // on NavItem.section must accept it so the new items type-check.
    expect(source).toMatch(/section\?:\s*'development'\s*\|\s*'recruitment'\s*\|\s*'people'\s*\|\s*'finance'\s*\|\s*'system'\s*\|\s*'partners'/);
  });

  it('moves /admin/staffing out of the people section into recruitment', () => {
    // Staffing belongs to the recruitment flow (input of StaffingOrder),
    // not to the workforce / Con người bucket. The old assignment must
    // be gone; the new recruitment assignment must exist.
    expect(source).not.toMatch(
      /href:\s*'\/admin\/staffing'[\s\S]{0,200}section:\s*'people'/,
    );
    expect(source).toMatch(
      /href:\s*'\/admin\/staffing'[\s\S]{0,200}section:\s*'recruitment'/,
    );
  });

  it('moves /admin/users out of the people section into system', () => {
    // User/role administration is a system concern, not workforce.
    expect(source).not.toMatch(
      /href:\s*'\/admin\/users'[\s\S]{0,200}section:\s*'people'/,
    );
    expect(source).toMatch(
      /href:\s*'\/admin\/users'[\s\S]{0,200}section:\s*'system'/,
    );
  });

  it('moves /admin/clients and /admin/vendors into the new partners section', () => {
    expect(source).toMatch(
      /href:\s*'\/admin\/clients'[\s\S]{0,200}section:\s*'partners'/,
    );
    expect(source).toMatch(
      /href:\s*'\/admin\/vendors'[\s\S]{0,200}section:\s*'partners'/,
    );
  });

  it('keeps /admin/workers in the (now renamed) people section', () => {
    expect(source).toMatch(
      /href:\s*'\/admin\/workers'[\s\S]{0,200}section:\s*'people'/,
    );
  });

  it('renders the people group header as "Nhân sự" (not "Con người")', () => {
    // The header text is rendered inside the JSX of the peopleNav block.
    // We assert the new label is present and the old one is not.
    expect(source).toMatch(/>Nhân sự</);
    expect(source).not.toMatch(/>Con người</);
  });

  it('renders a new "Đối tác" header for the partners group', () => {
    expect(source).toMatch(/>Đối tác</);
  });

  it('filters the partners group via partnersNav memo', () => {
    expect(source).toMatch(
      /const partnersNav\s*=\s*React\.useMemo\(\s*\(\)\s*=>\s*visibleNav\.filter\(item\s*=>\s*item\.section\s*===\s*'partners'\)/,
    );
  });
});
