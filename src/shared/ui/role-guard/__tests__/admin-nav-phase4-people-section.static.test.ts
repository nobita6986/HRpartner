/**
 * admin-nav-phase4-people-section.static.test.ts — hrp-m2a-operational-ux-debt / F2+F3
 * + v1.2 T0 T1C PRE-P2 HOTFIX (Hồ sơ ứng viên → Người lao động).
 *
 * Static guard for the F2/F3 fix that adds the intake list to
 * `ADMIN_NAV_PHASE4` under `section: 'people'`, the T0 T1B follow-up, and
 * the v1.2 T0 T1C PRE-P2 HOTFIX (reorder + relabel + section header).
 *
 * The expanded v1.2 sweep (bounded terminations, banner body, fake-button
 * removal, etc.) lives in `admin-nav-phase4-menu-labor-order.static.test.ts`.
 * This file keeps the F2/F3 + T1B + T1C narrow guard focused on
 * ADMIN_NAV_PHASE4 entry-level invariants.
 *
 * The test enforces:
 *  (a) The /admin/labor-profiles entry exists with exact href / label /
 *      roles / icon, and its roles byte-mirror
 *      `app/admin/labor-profiles/page.tsx:18` `ALLOWED_ROLES` — no widening.
 *  (b) The /admin/labor-profiles/new entry is NOT in the sidebar array.
 *  (c) Both workforce entries live under `section: 'people'`.
 *  (d) The /admin/workers entry label is exactly "Người lao động".
 *  (e) The /admin/labor-profiles entry label is exactly "Hồ sơ ứng viên"
 *      (v1.2 — was "Hồ sơ tiếp nhận" in T1B).
 *  (f) The /admin/labor-profiles entry is positioned BEFORE /admin/workers
 *      (v1.2 — was AFTER in T1B).
 *  (g) No accidental role drift to a forbidden role (HR_MANAGER / ADMIN /
 *      HR_STAFF only).
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
  // v1.2 T0 T1C: the /admin/labor-profiles entry exists with the new
  // operator-facing label "Hồ sơ ứng viên" (T0 T1C §2 — was "Hồ sơ
  // tiếp nhận" in T1B).
  it('ADMIN_NAV_PHASE4 carries a /admin/labor-profiles entry under section="people"', () => {
    const entry = findEntry((e) => e.href === '/admin/labor-profiles');
    expect(entry, '/admin/labor-profiles entry missing').toBeDefined();
    expect(entry!.label).toBe('Hồ sơ ứng viên');
    expect(entry!.section).toBe('people');
    expect(entry!.icon).toBe('UserRoundCheck');
  });

  // T0 T1B §1.3 + v1.2 T0 T1C: the dedicated /admin/labor-profiles/new
  // sidebar entry is removed. The route is still routable — only the
  // sidebar slot is dropped.
  it('ADMIN_NAV_PHASE4 does NOT carry a dedicated /admin/labor-profiles/new entry', () => {
    const entry = findEntry((e) => e.href === '/admin/labor-profiles/new');
    expect(entry, '/admin/labor-profiles/new should be removed from sidebar').toBeUndefined();
  });

  // Roles set-equal the ALLOWED_ROLES in the page (the existing sidebar
  // roles array uses a slightly different order; the page gate's order
  // is irrelevant to authorization — what matters is membership).
  it('roles set-equal app/admin/labor-profiles/page.tsx ALLOWED_ROLES', () => {
    expect(LABOR_PROFILES_SOURCE).toMatch(
      /ALLOWED_ROLES\s*=\s*new Set\(\[\s*['"]ADMIN['"]\s*,\s*['"]HR_MANAGER['"]\s*,\s*['"]HR_STAFF['"]\s*\]\)/,
    );

    const listEntry = findEntry((e) => e.href === '/admin/labor-profiles');
    const listSorted = [...listEntry!.roles].sort();
    const expectedSorted = [...EXPECTED_ALLOWED_ROLES].sort();
    expect(listSorted).toEqual(expectedSorted);
  });

  // No forbidden role drift.
  it.each(FORBIDDEN_DRIFT_ROLES)('does NOT include forbidden role "%s" on the /admin/labor-profiles entry', (role) => {
    const listEntry = findEntry((e) => e.href === '/admin/labor-profiles');
    expect(listEntry!.roles).not.toContain(role);
  });

  // /admin/labor-profiles entry is non-disabled (the page exists and is
  // reachable). The T1B + v1.2 T0 T1C fixes do not gate it behind the
  // Đang phát triển block.
  it('/admin/labor-profiles entry is NOT disabled (the canonical page is reachable)', () => {
    const listSlice = ROLE_GUARD_SOURCE.match(/\{[^}]*href:\s*'\/admin\/labor-profiles'[^}]*\}/);
    expect(listSlice).not.toBeNull();
    expect(listSlice![0]).not.toMatch(/\bdisabled:\s*true\b/);
  });

  // Workforce roster entry: "Người lao động" (people being managed), not
  // "Nhân sự" (HR staff).
  it('preserves the /admin/workers entry under section="people" with label "Người lao động"', () => {
    const workers = findEntry((e) => e.href === '/admin/workers');
    expect(workers, '/admin/workers entry missing').toBeDefined();
    expect(workers!.label).toBe('Người lao động');
    expect(workers!.section).toBe('people');
  });

  // v1.2 T0 T1C §1: visual order inverted — /admin/labor-profiles now
  // sits BEFORE /admin/workers to reflect the operational flow
  // (Ứng viên → Người lao động).
  it('/admin/labor-profiles is positioned BEFORE /admin/workers in ADMIN_NAV_PHASE4 (T0 T1C §1)', () => {
    const workersIdx = entries.findIndex((e) => e.href === '/admin/workers');
    const listIdx = entries.findIndex((e) => e.href === '/admin/labor-profiles');
    expect(workersIdx).toBeGreaterThanOrEqual(0);
    expect(listIdx).toBeGreaterThanOrEqual(0);
    expect(listIdx, 'profiles must be positioned BEFORE workers (T0 T1C §1)').toBeLessThan(workersIdx);
  });

  // Anti-regression fence. None of the legacy labels is reintroduced
  // anywhere in the sidebar source. The T1B "Hồ sơ tiếp nhận" sidebar
  // label is also gone (replaced by "Hồ sơ ứng viên" per v1.2 T0 T1C §2).
  it('does not reintroduce the legacy "Nhân sự" / "Hồ sơ NLD" / "Tiếp nhận NLD" / "Hồ sơ tiếp nhận" labels', () => {
    expect(ROLE_GUARD_SOURCE).not.toMatch(/label:\s*'Nhân sự'/);
    expect(ROLE_GUARD_SOURCE).not.toMatch(/label:\s*'Hồ sơ NLD'/);
    expect(ROLE_GUARD_SOURCE).not.toMatch(/label:\s*'Tiếp nhận NLD'/);
    expect(ROLE_GUARD_SOURCE).not.toMatch(/label:\s*'Hồ sơ tiếp nhận'/);
  });

  // Encoding hygiene: LF only, no UTF-8 BOM.
  it('role-guard-layout.tsx is LF-only (no CRLF)', () => {
    expect(ROLE_GUARD_SOURCE).not.toMatch(/\r\n/);
    expect(ROLE_GUARD_SOURCE.charCodeAt(0)).not.toBe(0xfeff); // no UTF-8 BOM
  });
});