/**
 * admin-nav-phase4-menu-labor-order.static.test.ts — T0 T1C PRE-P2 HOTFIX.
 *
 * Anti-regression fence for the T0 T1C §1 + §2 sweep on the people-section
 * nav. Locks the operational flow order ("Hồ sơ ứng viên" → "Người lao
 * động") and the bounded 8-surface terminations on `/admin/labor-profiles/**`.
 *
 * The test enforces:
 *  (a) The /admin/labor-profiles entry is positioned BEFORE the
 *      /admin/workers entry inside ADMIN_NAV_PHASE4 (T0 T1C §1).
 *  (b) The /admin/labor-profiles entry label is exactly "Hồ sơ ứng viên".
 *  (c) The /admin/workers entry label is exactly "Người lao động" (unchanged).
 *  (d) The people-group header text is "QUẢN LÝ LAO ĐỘNG" (was
 *      "NGƯỜI LAO ĐỘNG").
 *  (e) No operator-facing "Hồ sơ tiếp nhận" string remains on the 8 surfaces
 *      of `/admin/labor-profiles/**` (sidebar / list-title / metadata /
 *      list subhead / empty state / CTA / detail breadcrumb / form error).
 *  (f) No disabled "Chuyển thành người lao động" fake button remains on the
 *      detail page; the worker-formation note is in place.
 *  (g) Roles on both entries remain ['ADMIN', 'HR_STAFF', 'HR_MANAGER']
 *      (no widening).
 *  (h) URLs `/admin/labor-profiles` and `/admin/workers` byte-exact unchanged;
 *      `/admin/labor-profiles/new` remains routable but stays out of sidebar.
 *
 * Pure static test (no React, no DB, no router).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROLE_GUARD_PATH = join(process.cwd(), 'src/shared/ui/role-guard/role-guard-layout.tsx');
const LIST_PATH = join(process.cwd(), 'app/admin/labor-profiles/page.tsx');
const DETAIL_PATH = join(process.cwd(), 'app/admin/labor-profiles/[id]/page.tsx');
const FORM_PATH = join(process.cwd(), 'app/admin/labor-profiles/[id]/labor-profile-edit-form.tsx');

const ROLE_GUARD_SOURCE = readFileSync(ROLE_GUARD_PATH, 'utf8');
const LIST_SOURCE = readFileSync(LIST_PATH, 'utf8');
const DETAIL_SOURCE = readFileSync(DETAIL_PATH, 'utf8');
const FORM_SOURCE = readFileSync(FORM_PATH, 'utf8');

/**
 * Strip JS/TS comments so a documentation comment that cites an old wording
 * (e.g. "Hồ sơ tiếp nhận người lao động") does not get scanned as code.
 */
function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const ROLE_GUARD_CODE = stripComments(ROLE_GUARD_SOURCE);
const LIST_CODE = stripComments(LIST_SOURCE);
const DETAIL_CODE = stripComments(DETAIL_SOURCE);
const FORM_CODE = stripComments(FORM_SOURCE);

interface NavEntrySpec {
  readonly href: string;
  readonly label: string;
  readonly section: string;
  readonly roles: readonly string[];
  readonly icon: string;
}

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
    const section = /section:\s*'([^']+)'/.exec(inner)?.[1];
    const icon = /icon:\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(inner)?.[1];
    const rolesMatch = inner.match(/roles:\s*\[([^\]]+)\]/);
    const roles = rolesMatch
      ? Array.from(rolesMatch[1]!.matchAll(/'([A-Z_0-9]+)'/g)).map((m) => m[1]!)
      : [];
    if (href && label && section && icon) {
      entries.push({ href, label, section, roles, icon });
    }
  }
  return entries;
}

const entries = extractAdminNavEntries(ROLE_GUARD_SOURCE);

describe('T0 T1C PRE-P2 HOTFIX — sidebar order on people section', () => {
  it('/admin/labor-profiles is positioned BEFORE /admin/workers (T0 T1C §1)', () => {
    const profilesIdx = entries.findIndex((e) => e.href === '/admin/labor-profiles');
    const workersIdx = entries.findIndex((e) => e.href === '/admin/workers');
    expect(profilesIdx, 'profiles entry missing').toBeGreaterThanOrEqual(0);
    expect(workersIdx, 'workers entry missing').toBeGreaterThanOrEqual(0);
    expect(profilesIdx, 'profiles must precede workers in matrix').toBeLessThan(workersIdx);
  });

  it('/admin/labor-profiles entry label is "Hồ sơ ứng viên" (T0 T1C §2)', () => {
    const profiles = entries.find((e) => e.href === '/admin/labor-profiles');
    expect(profiles).toBeDefined();
    expect(profiles!.label).toBe('Hồ sơ ứng viên');
  });

  it('/admin/labor-profiles entry icon is UserRoundCheck', () => {
    const profiles = entries.find((e) => e.href === '/admin/labor-profiles');
    expect(profiles!.icon).toBe('UserRoundCheck');
  });

  it('/admin/workers entry label is still "Người lao động"', () => {
    const workers = entries.find((e) => e.href === '/admin/workers');
    expect(workers).toBeDefined();
    expect(workers!.label).toBe('Người lao động');
  });

  it('people group header text is "QUẢN LÝ LAO ĐỘNG" (T0 T1C §1)', () => {
    expect(ROLE_GUARD_CODE).toContain('QUẢN LÝ LAO ĐỘNG');
    expect(ROLE_GUARD_CODE).not.toContain('>NGƯỜI LAO ĐỘNG<');
  });

  it('role matrix [ADMIN, HR_MANAGER, HR_STAFF] on both entries (no widening)', () => {
    const profiles = entries.find((e) => e.href === '/admin/labor-profiles');
    const workers = entries.find((e) => e.href === '/admin/workers');
    expect([...profiles!.roles].sort()).toEqual(['ADMIN', 'HR_MANAGER', 'HR_STAFF']);
    expect([...workers!.roles].sort()).toEqual(['ADMIN', 'HR_MANAGER', 'HR_STAFF']);
  });

  it('section: "people" preserved on both entries', () => {
    const profiles = entries.find((e) => e.href === '/admin/labor-profiles');
    const workers = entries.find((e) => e.href === '/admin/workers');
    expect(profiles!.section).toBe('people');
    expect(workers!.section).toBe('people');
  });
});

describe('T0 T1C PRE-P2 HOTFIX — bounded copy sweep on /admin/labor-profiles/**', () => {
  // Surface 1: sidebar label
  it('sidebar label uses "Hồ sơ ứng viên" (not "Hồ sơ tiếp nhận")', () => {
    const profiles = entries.find((e) => e.href === '/admin/labor-profiles');
    expect(profiles!.label).not.toContain('tiếp nhận');
  });

  // Surface 2: list <h1>
  it('list <h1> uses "Hồ sơ ứng viên"', () => {
    expect(LIST_CODE).toMatch(/<h1[^>]*>\s*Hồ sơ ứng viên\s*<\/h1>/);
  });

  // Surface 3: list metadata.title
  it('list metadata.title = "Hồ sơ ứng viên - Quản trị"', () => {
    expect(LIST_CODE).toContain("title: 'Hồ sơ ứng viên - Quản trị'");
  });

  // Surface 4: list empty state
  it('list empty state = "Chưa có hồ sơ ứng viên nào."', () => {
    expect(LIST_CODE).toContain('Chưa có hồ sơ ứng viên nào.');
  });

  // Surface 5: list CTA
  it('list CTA = "+ Tiếp nhận hồ sơ"', () => {
    expect(LIST_CODE).toMatch(/\+\s*Tiếp nhận hồ sơ/);
  });

  // Surface 6: detail breadcrumb first item
  it('detail breadcrumb first item = "Hồ sơ ứng viên"', () => {
    const breadcrumbMatch = DETAIL_CODE.match(/Breadcrumb[\s\S]*?items=\{\s*\[([\s\S]*?)\]/);
    expect(breadcrumbMatch, 'Breadcrumb items not found').toBeTruthy();
    const itemsBlock = breadcrumbMatch![1]!;
    const firstLabelMatch = itemsBlock.match(/label:\s*['"]([^'"]+)['"]/);
    expect(firstLabelMatch).toBeTruthy();
    expect(firstLabelMatch![1]).toBe('Hồ sơ ứng viên');
  });

  // Surface 7: detail metadata.title
  it('detail metadata.title = "Chi tiết hồ sơ ứng viên - Quản trị"', () => {
    expect(DETAIL_CODE).toMatch(/metadata[\s\S]*?title:\s*['"]Chi tiết hồ sơ ứng viên/);
  });

  // Surface 8: form error copy
  it('form error messages use "Hồ sơ ứng viên"', () => {
    expect(FORM_CODE).toContain('Hồ sơ ứng viên');
    expect(FORM_CODE).not.toContain('Hồ sơ tiếp nhận');
  });
});

describe('T0 T1C PRE-P2 HOTFIX — remove fake "Chuyển thành người lao động" button', () => {
  it('detail page no longer contains the disabled fake button', () => {
    expect(DETAIL_CODE).not.toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Chuyển thành người lao động[\s\S]*?<\/button>/);
    expect(DETAIL_CODE).not.toContain('Tính năng đang được phát triển');
  });

  it('detail page renders the canonical worker-formation static note', () => {
    expect(DETAIL_CODE).toContain(
      'Người lao động được tạo hoặc liên kết khi hoàn tất quy trình tuyển dụng phù hợp.',
    );
    expect(DETAIL_CODE).toContain('data-testid="labor-profile-worker-formation-note"');
  });

  it('linked-banner body uses "Hồ sơ này đã được liên kết với người lao động"', () => {
    expect(DETAIL_CODE).toContain('Hồ sơ này đã được liên kết với người lao động');
    expect(DETAIL_CODE).not.toContain('Hồ sơ tiếp nhận này đã được liên kết');
  });
});

describe('T0 T1C PRE-P2 HOTFIX — anti-regression on legacy wording', () => {
  it('no operator-facing "Hồ sơ tiếp nhận" on /admin/labor-profiles/**', () => {
    expect(LIST_CODE).not.toContain('Hồ sơ tiếp nhận');
    expect(DETAIL_CODE).not.toContain('Hồ sơ tiếp nhận');
    expect(FORM_CODE).not.toContain('Hồ sơ tiếp nhận');
  });

  it('sidebar nav still does not carry legacy "Nhân sự" / "Hồ sơ NLD" labels', () => {
    expect(ROLE_GUARD_CODE).not.toMatch(/label:\s*'Nhân sự'/);
    expect(ROLE_GUARD_CODE).not.toMatch(/label:\s*'Hồ sơ NLD'/);
    expect(ROLE_GUARD_CODE).not.toMatch(/label:\s*'Tiếp nhận NLD'/);
  });

  it('URLs are byte-exact unchanged', () => {
    expect(ROLE_GUARD_CODE).toContain("href: '/admin/labor-profiles'");
    expect(ROLE_GUARD_CODE).toContain("href: '/admin/workers'");
    expect(ROLE_GUARD_CODE).not.toMatch(/href:\s*'\/admin\/labor-profiles\/new'/);
  });
});

describe('T0 T1C PRE-P2 HOTFIX — encoding hygiene', () => {
  it('role-guard-layout.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(ROLE_GUARD_SOURCE).not.toMatch(/\r\n/);
    expect(ROLE_GUARD_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
  it('list page is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(LIST_SOURCE).not.toMatch(/\r\n/);
    expect(LIST_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
  it('detail page is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(DETAIL_SOURCE).not.toMatch(/\r\n/);
    expect(DETAIL_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
  it('form page is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(FORM_SOURCE).not.toMatch(/\r\n/);
    expect(FORM_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});