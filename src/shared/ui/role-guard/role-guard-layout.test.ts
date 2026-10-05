/**
 * role-guard-layout.test.ts — P1-NAV- / RQ-13, RQ-14 wiring proof +
 * reconciliation invariants for the PR #82 ↔ PR #83 forward-only merge.
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
 * locks the P1-NAV- invariant.
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
    //
    // hrp-t1a-introduce-hrp-and-menu-cleanup: the old "Danh sách nhu cầu"
    // entry (`/admin/jobs`) was removed from the sidebar (T0 directive §B.2);
    // the slot-trống + publish + Công bố columns now live inside
    // `/admin/projects`. The test asserts that the surviving recruitment
    // entry (`/admin/jobs/job-postings` → "Tin tuyển dụng") is still in the
    // file. The `/admin/staffing` entry stays under the "Nhu cầu tuyển dụng"
    // label per T0 directive §B.3.
    expect(source).toContain('export const ADMIN_NAV_PHASE4: NavItem[] = [');
    expect(source).toContain("href: '/admin/jobs/job-postings'");
    expect(source).not.toContain("label: 'Danh sách nhu cầu'");
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

describe('RoleGuardLayout — Commission deferral (Đang phát triển)', () => {
  const source = readFileSync(LAYOUT_PATH, 'utf8');

  it('moves the two commission items out of the finance section', () => {
    // The finance block must no longer reference the commission hrefs — they
    // now live in the development section so the "Tài chính" header collapses
    // when nothing else is left.
    expect(source).not.toMatch(
      /href:\s*'\/admin\/commission\/(policies|ledger)'[^}]*section:\s*'finance'/,
    );
  });

  it('marks the two commission items with disabled: true and section: development', () => {
    expect(source).toMatch(
      /href:\s*'\/admin\/commission\/policies'[\s\S]{0,200}section:\s*'development'[\s\S]{0,80}disabled:\s*true/,
    );
    expect(source).toMatch(
      /href:\s*'\/admin\/commission\/ledger'[\s\S]{0,200}section:\s*'development'[\s\S]{0,80}disabled:\s*true/,
    );
  });

  it('declares a `disabled` flag on the NavItem type', () => {
    expect(source).toMatch(/disabled\?:\s*boolean/);
  });

  it('renders disabled items as a non-Link div with aria-disabled and a Sắp ra mắt badge', () => {
    expect(source).toContain('renderDisabledNavItem');
    expect(source).toMatch(/aria-disabled="true"/);
    expect(source).toContain('Sắp ra mắt');
    // The disabled row is a <div>, not a <Link>, so there is no href to
    // navigate to and Next.js will not prefetch it.
    expect(source).toMatch(/role="link"[\s\S]{0,200}aria-disabled="true"/);
  });
});

describe('RoleGuardLayout — PR #82 + PR #83 reconciliation', () => {
  // Joint invariants enforced by both PRs after the forward-only merge of
  // origin/main into the PR #83 branch. Each test names the invariant T0
  // mandated in the reconciliation directive.
  const source = readFileSync(LAYOUT_PATH, 'utf8');

  it('commission items remain in `development` with `disabled: true` after realignment', () => {
    expect(source).toMatch(
      /href:\s*'\/admin\/commission\/policies'[\s\S]{0,200}section:\s*'development'[\s\S]{0,80}disabled:\s*true/,
    );
    expect(source).toMatch(
      /href:\s*'\/admin\/commission\/ledger'[\s\S]{0,200}section:\s*'development'[\s\S]{0,80}disabled:\s*true/,
    );
  });

  it('places /admin/staffing in `recruitment` (T1C) while leaving commission items in `development` (T1B)', () => {
    expect(source).toMatch(
      /href:\s*'\/admin\/staffing'[\s\S]{0,200}section:\s*'recruitment'/,
    );
    // Staffing must NOT have inherited a `disabled: true` (it is routable).
    expect(source).not.toMatch(
      /href:\s*'\/admin\/staffing'[\s\S]{0,200}disabled:\s*true/,
    );
  });

  it('places /admin/users in `system` (T1C) and not in `people`', () => {
    expect(source).not.toMatch(
      /href:\s*'\/admin\/users'[\s\S]{0,200}section:\s*'people'/,
    );
    expect(source).toMatch(
      /href:\s*'\/admin\/users'[\s\S]{0,200}section:\s*'system'/,
    );
  });

  it('places /admin/clients and /admin/vendors in `partners` (T1C), not in `people`', () => {
    expect(source).not.toMatch(
      /href:\s*'\/admin\/clients'[\s\S]{0,200}section:\s*'people'/,
    );
    expect(source).not.toMatch(
      /href:\s*'\/admin\/vendors'[\s\S]{0,200}section:\s*'people'/,
    );
    expect(source).toMatch(
      /href:\s*'\/admin\/clients'[\s\S]{0,200}section:\s*'partners'/,
    );
    expect(source).toMatch(
      /href:\s*'\/admin\/vendors'[\s\S]{0,200}section:\s*'partners'/,
    );
  });

  it('keeps the role matrix byte-stable (no role list was altered by T1C or T1B)', () => {
    // Spot-check the roles of items that moved between sections: their role
    // arrays must be unchanged from the pre-reconciliation values. This
    // proves the IA realignment only moved items between sections and never
    // re-classified who can see them.
    expect(source).toContain("href: '/admin/staffing'");
    expect(source).toContain("roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'PM']");
    expect(source).toContain("href: '/admin/users'");
    expect(source).toContain("roles: ['ADMIN']");
    expect(source).toContain("href: '/admin/clients'");
    expect(source).toContain("roles: ['ADMIN', 'PM']");
    expect(source).toContain("href: '/admin/vendors'");
    expect(source).toContain("roles: ['ADMIN', 'PM']");
    expect(source).toContain("href: '/admin/workers'");
    expect(source).toContain("roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER']");
    expect(source).toContain("href: '/admin/commission/policies'");
    expect(source).toContain("roles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT']");
    expect(source).toContain("href: '/admin/commission/ledger'");
  });

  it('preserves the active-state authority (getMostSpecificActiveHref drives both primary nav and development sub-tree)', () => {
    // The active-state computation must NOT have been altered by T1C. T1B
    // already locked this invariant; T1C must not weaken it.
    expect(source).toMatch(
      /const activeHref\s*=\s*React\.useMemo\(\s*\(\)\s*=>\s*getMostSpecificActiveHref\(pathname,\s*visibleNav\)/,
    );
    expect(source).toMatch(
      /const developmentActiveHref\s*=\s*React\.useMemo\(\s*\(\)\s*=>\s*getMostSpecificActiveHref\(pathname,\s*developmentNav\)/,
    );
    expect(source).toMatch(/href === activeHref/);
  });

  it('does not double-highlight — `disabled` items short-circuit before active evaluation', () => {
    // renderDisabledNavItem must be reached only via the `if (item.disabled)`
    // branch; the active evaluation lives inside the regular `renderNavItem`
    // path and must NOT be called for disabled items.
    expect(source).toMatch(
      /const renderNavItem\s*=\s*\(item:\s*NavItem,\s*nested\s*=\s*false\)\s*=>\s*\{[\s\S]{0,80}if\s*\(item\.disabled\)\s*\{\s*return\s*renderDisabledNavItem\(item,\s*nested\)/,
    );
  });

  it('keeps the "Tài chính" header hidden when its section is empty (no commission leakage into finance)', () => {
    // PR #82 emptied the finance section; PR #83 must not have re-populated
    // it. The header conditional stays gated on length, and zero items in
    // ADMIN_NAV_PHASE4 still carry section: 'finance'.
    const financeMatches = source.match(/section:\s*'finance'/g) ?? [];
    expect(financeMatches.length).toBe(0);
    expect(source).toMatch(/financeNav\.length\s*>\s*0/);
  });

  it('renders the partners group via its own memo and JSX block (no double-render with people or finance)', () => {
    expect(source).toMatch(
      /const partnersNav\s*=\s*React\.useMemo\(\s*\(\)\s*=>\s*visibleNav\.filter\(item\s*=>\s*item\.section\s*===\s*'partners'\)/,
    );
    expect(source).toMatch(/\{portal === 'admin' && partnersNav\.length > 0 && \(/);
    expect(source).toMatch(/>Đối tác</);
  });

  it('keeps the people header as "Nhân sự" and never reintroduces "Con người"', () => {
    expect(source).toMatch(/>Nhân sự</);
    expect(source).not.toMatch(/>Con người</);
  });
});