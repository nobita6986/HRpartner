/**
 * admin-nav-phase4-people-section.static.test.ts — hrp-m2a-operational-ux-debt / F2+F3.
 *
 * Static guard for the F2/F3 fix that adds `Hồ sơ tiếp nhận` (formerly
 * `Hồ sơ NLD`) to `ADMIN_NAV_PHASE4` under `section: 'people'`, and the T0
 * T1B follow-up that:
 *  - RENAME `/admin/workers` label `Nhân sự` → `Người lao động` (the
 *    workforce roster is "người lao động" — people being managed — not
 *    "nhân sự" which is HR staff).
 *  - REMOVE the dedicated `/admin/labor-profiles/new` sidebar entry
 *    (the route remains reachable via the list-page CTA and direct URL;
 *    the sidebar slot is consolidated so the section has one fewer
 *    duplicate destination).
 *  - RENAME the people-group header from "Nhân sự" → "NGƯỜI LAO ĐỘNG".
 *
 * The test enforces:
 *  (a) The /admin/labor-profiles entry exists with exact href / label /
 *      roles / icon, and its roles byte-mirror
 *      `app/admin/labor-profiles/page.tsx:16` `ALLOWED_ROLES` — no widening
 *      and no shrinking.
 *  (b) The /admin/labor-profiles/new entry is NOT in the sidebar array
 *      (the dedicated intake menu is removed; the route itself is
 *      unchanged and the page is still reachable via the in-page CTA).
 *  (c) Both workforce entries live under `section: 'people'` so the
 *      renderer puts them under the "NGƯỜI LAO ĐỘNG" sidebar header.
 *  (d) The /admin/workers entry label is exactly "Người lao động".
 *  (e) No accidental role drift to a forbidden role (HR_MANAGER / ADMIN /
 *      HR_STAFF only — no PM / SALE / DIRECTOR / ACCOUNTANT).
 *
 * Implementation note: `ADMIN_NAV_PHASE4` is a typed literal in source —
 * parsing it via regex keeps this guard a pure static test (no React, no DB).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROLE_GUARD_PATH = join(process.cwd(), 'src/shared/ui/role-guard/role-guard-layout.tsx');
const LABOR_PROFILES_PATH = join(process.cwd(), 'app/admin/labor-profiles/page.tsx');

const ROLE_GUARD_SOURCE = readFileSync(ROLE_GUARD_PATH, 'utf8');
const LABOR_PROFILES_SOURCE = readFileSync(LABOR_PROFILES_PATH, 'utf8');

const EXPECTED_ALLOWED_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const;
const FORBIDDEN_DRIFT_ROLES = ['PM', 'SALE', 'DIRECTOR', 'ACCOUNTANT', 'CTV', 'VENDOR', 'WORKER'] as const;

interface NavEntrySpec {
  readonly href: string;
  readonly label: string;
  readonly section: 'people' | 'recruitment' | 'partners' | 'finance' | 'system' | 'development';
  readonly roles: readonly string[];
  readonly icon: string;
}

/**
 * Extract every `NavItem` literal declared in `ADMIN_NAV_PHASE4` from the
 * `role-guard-layout.tsx` source. Pure regex-based parser; intentionally
 * tolerant of whitespace and trailing commas.
 */
function extractAdminNavEntries(source: string): NavEntrySpec[] {
  const arrayMatch = source.match(/export const ADMIN_NAV_PHASE4:\s*NavItem\[\]\s*=\s*\[([\s\S]*?)\];/);
  if (!arrayMatch) {
    throw new Error('ADMIN_NAV_PHASE4 literal not found in role-guard-layout.tsx');
  }
  const body = arrayMatch[1]!;
  // Match each object literal in the array (greedy per object, terminated by `},`).
  const entries: NavEntrySpec[] = [];
  const objectRx = /\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = objectRx.exec(body)) !== null) {
    const inner = match[1]!;
    const href = /href:\s*'([^']+)'/.exec(inner)?.[1];
    const label = /label:\s*'([^']+)'/.exec(inner)?.[1];
    const section = /section:\s*'([^']+)'/.exec(inner)?.[1] as NavEntrySpec['section'] | undefined;
    const icon = /icon:\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(inner)?.[1];
    const rolesMatch = inner.match(/roles:\s*\[([^\]]+)\]/);
    const roles = rolesMatch
      ? Array.from(rolesMatch[1]!.matchAll(/'([A-Z_]+)'/g)).map((m) => m[1]!)
      : [];
    if (href && label && section && icon) {
      entries.push({ href, label, section, roles, icon });
    }
  }
  return entries;
}

const entries = extractAdminNavEntries(ROLE_GUARD_SOURCE);

function findEntry(predicate: (entry: NavEntrySpec) => boolean): NavEntrySpec | undefined {
  return entries.find(predicate);
}

describe('hrp-m2a-operational-ux-debt / F2+F3 — sidebar people-section entries', () => {
  // RQ-01 / AC-01 — the /admin/labor-profiles entry exists with the new
  // operator-facing label "Hồ sơ tiếp nhận" (T0 T1B rename of the old
  // "Hồ sơ NLD" label).
  it('ADMIN_NAV_PHASE4 carries a /admin/labor-profiles entry under section="people"', () => {
    const entry = findEntry((e) => e.href === '/admin/labor-profiles');
    expect(entry, '/admin/labor-profiles entry missing').toBeDefined();
    expect(entry!.label).toBe('Hồ sơ tiếp nhận');
    expect(entry!.section).toBe('people');
    expect(entry!.icon).toBe('UserRoundCheck');
  });

  // T0 T1B — HOTFIX UI NGƯỜI LAO ĐỘNG §1.3: the dedicated
  // /admin/labor-profiles/new sidebar entry is removed. The route is still
  // routable — only the sidebar slot is dropped.
  it('ADMIN_NAV_PHASE4 does NOT carry a dedicated /admin/labor-profiles/new entry', () => {
    const entry = findEntry((e) => e.href === '/admin/labor-profiles/new');
    expect(entry, '/admin/labor-profiles/new should be removed from sidebar').toBeUndefined();
  });

  // RQ-01 / RQ-09 / AC-01 — roles set-equal the ALLOWED_ROLES in the page
  // (the existing sidebar roles array uses a slightly different order; the
  // page gate's order is irrelevant to authorization — what matters is
  // membership).
  it('roles set-equal app/admin/labor-profiles/page.tsx ALLOWED_ROLES', () => {
    // Sanity check: ALLOWED_ROLES constant exists in the page source.
    expect(LABOR_PROFILES_SOURCE).toMatch(
      /ALLOWED_ROLES\s*=\s*new Set\(\[\s*['"]ADMIN['"]\s*,\s*['"]HR_MANAGER['"]\s*,\s*['"]HR_STAFF['"]\s*\]\)/,
    );

    const listEntry = findEntry((e) => e.href === '/admin/labor-profiles');
    const listSorted = [...listEntry!.roles].sort();
    const expectedSorted = [...EXPECTED_ALLOWED_ROLES].sort();
    expect(listSorted).toEqual(expectedSorted);
  });

  // RISK-04 / AC-01 — no forbidden role drift.
  it.each(FORBIDDEN_DRIFT_ROLES)('does NOT include forbidden role "%s" on the /admin/labor-profiles entry', (role) => {
    const listEntry = findEntry((e) => e.href === '/admin/labor-profiles');
    expect(listEntry!.roles).not.toContain(role);
  });

  // RQ-09 / AC-01 — the /admin/labor-profiles entry is non-disabled (the
  // page exists and is reachable). The T1B fix does not gate it behind the
  // Đang phát triển block.
  it('/admin/labor-profiles entry is NOT disabled (the canonical page is reachable)', () => {
    // Source regex does not capture `disabled`; verify by string scan of the
    // exact object literal.
    const listSlice = ROLE_GUARD_SOURCE.match(/\{[^}]*href:\s*'\/admin\/labor-profiles'[^}]*\}/);
    expect(listSlice).not.toBeNull();
    expect(listSlice![0]).not.toMatch(/\bdisabled:\s*true\b/);
  });

  // T0 T1B — HOTFIX UI NGƯỜI LAO ĐỘNG §1.1: the workforce roster entry is
  // now "Người lao động" (people being managed), not "Nhân sự" (HR staff).
  it('preserves the /admin/workers entry under section="people" with label "Người lao động"', () => {
    const workers = findEntry((e) => e.href === '/admin/workers');
    expect(workers, '/admin/workers entry missing').toBeDefined();
    expect(workers!.label).toBe('Người lao động');
    expect(workers!.section).toBe('people');
  });

  // T0 T1B — HOTFIX UI NGƯỜI LAO ĐỘNG: visual order unchanged. The /admin/
  // labor-profiles entry sits AFTER /admin/workers (workforce roster first,
  // then candidate-side intake list).
  it('/admin/labor-profiles is positioned AFTER /admin/workers in ADMIN_NAV_PHASE4', () => {
    const workersIdx = entries.findIndex((e) => e.href === '/admin/workers');
    const listIdx = entries.findIndex((e) => e.href === '/admin/labor-profiles');
    expect(workersIdx).toBeGreaterThanOrEqual(0);
    expect(listIdx).toBeGreaterThan(workersIdx);
  });

  // T0 T1B — HOTFIX UI NGƯỜI LAO ĐỘNG: anti-regression fence. None of the
  // legacy labels is reintroduced anywhere in the sidebar source.
  it('does not reintroduce the legacy "Nhân sự" / "Hồ sơ NLD" / "Tiếp nhận NLD" labels', () => {
    expect(ROLE_GUARD_SOURCE).not.toMatch(/label:\s*'Nhân sự'/);
    expect(ROLE_GUARD_SOURCE).not.toMatch(/label:\s*'Hồ sơ NLD'/);
    expect(ROLE_GUARD_SOURCE).not.toMatch(/label:\s*'Tiếp nhận NLD'/);
  });

  // RQ-01 / AC-09 — encoding of the file is LF only (no CRLF, no BOM).
  it('role-guard-layout.tsx is LF-only (no CRLF)', () => {
    expect(ROLE_GUARD_SOURCE).not.toMatch(/\r\n/);
    expect(ROLE_GUARD_SOURCE.charCodeAt(0)).not.toBe(0xfeff); // no UTF-8 BOM
  });
});