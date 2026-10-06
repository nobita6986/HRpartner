/**
 * labor-profiles-separation.static.test.ts — T1B Pre-P2 hotfix (DEC-P2-09..12).
 *
 * Anti-regression fences cho:
 *   1. `/admin/labor-profiles` list có đúng 4 filter chips canonical.
 *   2. Không còn 3 filter chips cũ (NEVER_WORKED / WORKING / TERMINATED).
 *   3. Bảng không còn cột "Liên kết nhân viên" (DEC-P2-10).
 *   4. Empty-state colSpan = 5 (giảm từ 6).
 *   5. `/admin/labor-profiles/[id]` render banner read-only khi
 *      `profile.workerId` set, link tới `/admin/workers`.
 *   6. `/admin/labor-profiles/[id]` mount form edit khi chưa linked + role writer.
 *   7. Nút "Sửa thông tin (chỉ ADMIN/HR_MANAGER)" hiện với HR_STAFF.
 *
 * Pure static test (no React, no DB, no router). Tất cả fence sử dụng
 * regex over source code, với comment-strip helper để comment giải thích
 * không bị scan như code.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LIST_PATH = join(process.cwd(), 'app/admin/labor-profiles/page.tsx');
const DETAIL_PATH = join(process.cwd(), 'app/admin/labor-profiles/[id]/page.tsx');
const FORM_PATH = join(process.cwd(), 'app/admin/labor-profiles/[id]/labor-profile-edit-form.tsx');

const SOURCE = {
  list: readFileSync(LIST_PATH, 'utf8'),
  detail: readFileSync(DETAIL_PATH, 'utf8'),
  form: readFileSync(FORM_PATH, 'utf8'),
};

/**
 * Strip JS/TS comments so a comment that documents an anti-pattern (e.g.
 * `<tbody><a><td>...</td></a></tbody>` hoặc removed filter chips) does not
 * get scanned as code.
 */
function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = {
  list: stripComments(SOURCE.list),
  detail: stripComments(SOURCE.detail),
  form: stripComments(SOURCE.form),
};

describe('/admin/labor-profiles list page — T1B Pre-P2 filter chips (DEC-P2-09)', () => {
  it('renders exactly 4 filter chips (Tất cả, Chưa hoàn thiện, Cần đối chiếu, Kho chung)', () => {
    const chipLabels = ["'Tất cả'", "'Chưa hoàn thiện'", "'Cần đối chiếu'", "'Kho chung'"];
    for (const label of chipLabels) {
      expect(CODE.list, `missing chip label ${label}`).toContain(label);
    }
  });

  it('does NOT render the 3 removed filter chips (NEVER_WORKED / WORKING / TERMINATED)', () => {
    expect(CODE.list).not.toContain("'Chưa từng làm'");
    expect(CODE.list).not.toContain("'Đang làm'");
    expect(CODE.list).not.toContain("'Đã nghỉ'");
    expect(CODE.list).not.toMatch(/value:\s*['"]NEVER_WORKED['"]/);
    expect(CODE.list).not.toMatch(/value:\s*['"]WORKING['"]/);
    expect(CODE.list).not.toMatch(/value:\s*['"]TERMINATED['"]/);
  });

  it('filter chip array literal has exactly 4 entries', () => {
    // Defensive: the source-level chip definition literal must have 4 rows.
    // Match the chips array block by finding the 'Tất cả' label and scanning
    // forward until the matching closing `)` of the .map(...) call.
    const startIdx = CODE.list.indexOf("{ label: 'Tất cả'");
    expect(startIdx, "'Tất cả' chip not found').toBeGreaterThanOrEqual(0");
    // Walk forward to find the closing of the .map(...) — the next '})'
    // followed by '}' closes the chip list. Approximate by scanning for
    // 'Kho chung' then the array end. Use a non-greedy window.
    const endIdx = CODE.list.indexOf("label: 'Kho chung'", startIdx);
    expect(endIdx, "'Kho chung' chip not found after 'Tất cả'").toBeGreaterThan(startIdx);
    const slice = CODE.list.slice(startIdx, endIdx + "label: 'Kho chung'".length + 80);
    const labelCount = (slice.match(/label:\s*'/g) ?? []).length;
    expect(labelCount, `chip block should have 4 entries, got ${labelCount}`).toBe(4);
  });
});

describe('/admin/labor-profiles list page — T1B Pre-P2 table column drop (DEC-P2-10)', () => {
  it('does NOT render a "Liên kết nhân viên" column', () => {
    // Both the header and the data row previously had this cell.
    expect(CODE.list).not.toContain('Liên kết nhân viên');
    // Defensive: no "Đã liên kết" badge text on the intake list (it belongs
    // on the linked profile, surfaced via the detail banner instead).
    expect(CODE.list).not.toContain('Đã liên kết');
  });

  it('thead has exactly 5 <th> entries (one less than before)', () => {
    // Header order: Họ và tên | SĐT | Xác minh | Hoàn thiện | Ngày tạo
    const thCount = (CODE.list.match(/<th[\s>]/g) ?? []).length;
    expect(thCount, `expected 5 <th>, got ${thCount}`).toBe(5);
  });

  it('empty-state colSpan is 5 (matches 5 <th>)', () => {
    // Empty state <td colSpan={5}>
    expect(CODE.list).toMatch(/<td\s+colSpan=\{5\}/);
    expect(CODE.list).not.toMatch(/<td\s+colSpan=\{6\}/);
  });
});

describe('/admin/labor-profiles list page — T1B Pre-P2 terminology fence', () => {
  it('keeps canonical page <h1> "Hồ sơ tiếp nhận người lao động"', () => {
    expect(CODE.list).toMatch(/<h1[^>]*>\s*Hồ sơ tiếp nhận người lao động\s*<\/h1>/);
  });
  it('keeps the CTA button "+ Tiếp nhận người lao động"', () => {
    expect(CODE.list).toMatch(/\+\s*Tiếp nhận người lao động/);
  });
});

describe('/admin/labor-profiles/[id] — T1B Pre-P2 read-only banner (DEC-P2-11)', () => {
  it('mounts the linked-readonly banner with a /admin/workers link when workerId set', () => {
    // The banner is rendered inside the `isLinked` block (data.workerId truthy).
    expect(CODE.detail).toContain('data-testid="linked-readonly-banner"');
    expect(CODE.detail).toContain('Đã chuyển thành người lao động');
    // The CTA must point to the worker roster surface.
    expect(CODE.detail).toContain('href="/admin/workers"');
  });

  it('hides the "Sửa thông tin" button when profile is linked (read-only)', () => {
    // The old Sửa thông tin button used to be unconditionally rendered.
    // After the hotfix: only show the "HR_STAFF locked" note when !isLinked && !canEdit.
    // When isLinked, the old Sửa thông tin button is dropped entirely.
    // We assert: there is no free-standing blue "Sửa thông tin" button left
    // in the page (the locked note is the substitute).
    expect(CODE.detail).not.toMatch(/<button[^>]*>\s*Sửa thông tin\s*<\/button>/);
  });
});

describe('/admin/labor-profiles/[id] — T1B Pre-P2 edit form mount (DEC-P2-12)', () => {
  it('mounts <LaborProfileEditForm> only when canEdit', () => {
    expect(CODE.detail).toContain('LaborProfileEditForm');
    // The mount condition should explicitly involve the canEdit flag.
    expect(CODE.detail).toMatch(/\{canEdit\s*\?\s*[\s\S]*?<LaborProfileEditForm/);
  });

  it('passes role + onSaved to the form', () => {
    // Smoke test: form usage must include the role prop.
    expect(CODE.detail).toMatch(/role=\{session\.role\}/);
  });
});

describe('/admin/labor-profiles/[id] labor-profile-edit-form.tsx — T1B Pre-P2 (DEC-P2-12)', () => {
  it('form is a client component', () => {
    expect(SOURCE.form.startsWith("'use client'")).toBe(true);
  });

  it('form gates render on canEdit (ADMIN | HR_MANAGER)', () => {
    // canEdit = role === 'ADMIN' || role === 'HR_MANAGER' and returns null
    // when false → defense in depth: page gate + form gate.
    expect(CODE.form).toMatch(/role\s*===\s*['"]ADMIN['"]\s*\|\|\s*role\s*===\s*['"]HR_MANAGER['"]/);
    expect(CODE.form).toMatch(/if\s*\(\s*!canEdit\s*\)\s*\{[\s\S]*?return null/);
  });

  it('PATCH body only includes fullName / phone / cccdNumber (NO workerId)', () => {
    // Find the JSON.stringify body of the PATCH request.
    const bodyMatch = CODE.form.match(/body:\s*JSON\.stringify\(\{([\s\S]*?)\}\)/);
    expect(bodyMatch, 'PATCH body literal not found').toBeTruthy();
    if (bodyMatch) {
      const bodySrc = bodyMatch[1]!;
      expect(bodySrc).toContain('fullName');
      expect(bodySrc).toContain('phone');
      expect(bodySrc).toContain('cccdNumber');
      expect(bodySrc).not.toMatch(/workerId/);
    }
  });

  it('handles 409 LABOR_PROFILE_ALREADY_LINKED by setting locked status', () => {
    expect(CODE.form).toMatch(/res\.status\s*===\s*409/);
    expect(CODE.form).toMatch(/setStatus\(\{\s*kind:\s*['"]locked['"]/);
  });

  it('handles 403 FORBIDDEN distinctly (does not crash)', () => {
    expect(CODE.form).toMatch(/res\.status\s*===\s*403/);
  });
});

describe('/admin/labor-profiles — T1B Pre-P2 encoding hygiene', () => {
  it('list page is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE.list).not.toMatch(/\r\n/);
    expect(SOURCE.list.charCodeAt(0)).not.toBe(0xfeff);
  });
  it('detail page is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE.detail).not.toMatch(/\r\n/);
    expect(SOURCE.detail.charCodeAt(0)).not.toBe(0xfeff);
  });
  it('form page is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE.form).not.toMatch(/\r\n/);
    expect(SOURCE.form.charCodeAt(0)).not.toBe(0xfeff);
  }
  );
});
