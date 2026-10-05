import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/workers/page.tsx'), 'utf8');

/**
 * Strip JS/TS comments so a comment that documents an anti-pattern (or
 * a meta-comment explaining a rename) does not get scanned as visible
 * operator text. The T1B hotfix intentionally cites the legacy
 * "Nhân viên" wording in a comment to explain the rename.
 */
function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = stripComments(SOURCE);

describe('/admin/workers Wave 3 terminology', () => {
  it('uses the typed Worker dictionary and shared status presentation primitive', () => {
    expect(SOURCE).toContain("from '@/src/domains/workforce/worker-ui'");
    expect(SOURCE).toContain('workerStatusLabel(s)');
    expect(SOURCE).toContain('<StatusBadge');
    expect(SOURCE).not.toMatch(/const STATUS_CONFIG\s*:/);
    expect(SOURCE).not.toMatch(/\{cfg\.label\}/);
  });

  it('does not expose English table labels or raw status values', () => {
    expect(SOURCE).toContain("'Mã người dùng'");
    expect(SOURCE).toContain("'Thao tác'");
    expect(SOURCE).not.toMatch(/>\s*User ID\s*</);
    expect(SOURCE).not.toMatch(/>\s*\{w\.employmentStatus\}\s*</);
  });
});

describe('/admin/workers — T0 T1B HOTFIX UI NGƯỜI LAO ĐỘNG terminology', () => {
  // T0 directive §2: replace all "Nhân viên / Nhân sự / NLD" on the
  // /admin/workers surface with canonical "Người lao động".
  it('page <h1> is "Danh sách người lao động"', () => {
    expect(CODE).toMatch(/<h1[^>]*>\s*Danh sách người lao động\s*<\/h1>/);
  });

  it('does not contain legacy "Nhân viên" surface strings', () => {
    // The page is the workforce roster surface. "Nhân viên" (employee) is
    // inaccurate — the correct operator-facing term is "Người lao động".
    expect(CODE).not.toContain("'Nhân viên'");
    expect(CODE).not.toContain('"Nhân viên"');
    expect(CODE).not.toContain("'Thêm nhân viên'");
    expect(CODE).not.toContain('"Thêm nhân viên"');
    expect(CODE).not.toContain("'Sửa nhân viên'");
    expect(CODE).not.toContain('"Sửa nhân viên"');
    expect(CODE).not.toContain("'Chưa có nhân viên nào'");
    expect(CODE).not.toContain('"Chưa có nhân viên nào"');
    expect(CODE).not.toContain('Tổng: {total} nhân viên');
  });

  it('does not contain "Nhân sự" on the workers surface', () => {
    // "Nhân sự" is HR staff, not the workforce roster. Not applicable to
    // /admin/workers.
    expect(CODE).not.toContain("'Nhân sự'");
    expect(CODE).not.toContain('"Nhân sự"');
  });

  it('does not contain "NLD" on the workers surface', () => {
    // "NLD" is an abbreviation used on the LaborProfile list; the workers
    // surface uses "Người lao động" in full.
    expect(CODE).not.toContain("'NLD'");
    expect(CODE).not.toContain('"NLD"');
  });

  it('uses canonical "Người lao động" throughout the workforce surface', () => {
    // Positive check: the canonical term is present and used consistently.
    // The visible text uses lowercase "người lao động" (sentence-cased
    // inside JSX text nodes like "Danh sách người lao động" and
    // "Thêm người lao động mới"). The capitalised form "Người lao động"
    // only appears in the new explanatory comment block, which is
    // stripped by the test harness — so the visible-text assertion uses
    // the lowercase form.
    expect(CODE).toContain('người lao động');
    // Modal titles use "Thêm người lao động mới" / "Sửa người lao động".
    expect(CODE).toContain('Thêm người lao động mới');
    expect(CODE).toContain('Sửa người lao động');
    // Footer count uses "Tổng: {total} người lao động".
    expect(CODE).toMatch(/Tổng:\s*\{total\}\s*người lao động/);
    // Page <h1> uses "Danh sách người lao động".
    expect(CODE).toContain('Danh sách người lao động');
  });
});

describe('/admin/workers — T0 T1B encoding hygiene', () => {
  it('is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
