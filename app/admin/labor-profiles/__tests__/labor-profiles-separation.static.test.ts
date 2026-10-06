/**
 * labor-profiles-separation.static.test.ts — T1B Pre-P2 hotfix (DEC-P2-09..12)
 * + v1.1 PR #110 correction 1/1 (drop onSaved prop, canSeeSensitive gate,
 * copy sweep breadcrumb + button).
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
 *   8. v1.1: form KHÔNG nhận prop `onSaved` (Server Component → Client
 *      Component function prop sai kiến trúc); dùng `useRouter().refresh()`.
 *   9. v1.1: form nhận prop `canSeeSensitive`; nếu false → render banner
 *      "Không có quyền sửa" và disable inputs.
 *  10. v1.1: copy sweep — breadcrumb `Hồ sơ tiếp nhận` (KHÔNG `Hồ sơ người
 *      lao động`), button `Chuyển thành người lao động` (KHÔNG `Chuyển đổi
 *      thành nhân viên`).
 *  11. v1.2 T0 T1C: list <h1> = `Hồ sơ ứng viên`; CTA = `+ Tiếp nhận hồ sơ`;
 *      detail breadcrumb first item = `Hồ sơ ứng viên`; metadata.title =
 *      `Chi tiết hồ sơ ứng viên - Quản trị`; banner body = `Hồ sơ này đã
 *      được liên kết với người lao động.`; KHÔNG còn nút disabled
 *      `Chuyển thành người lao động` + `title="Tính năng đang được phát triển"`.
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
    const startIdx = CODE.list.indexOf("{ label: 'Tất cả'");
    expect(startIdx, "'Tất cả' chip not found').toBeGreaterThanOrEqual(0");
    const endIdx = CODE.list.indexOf("label: 'Kho chung'", startIdx);
    expect(endIdx, "'Kho chung' chip not found after 'Tất cả'").toBeGreaterThan(startIdx);
    const slice = CODE.list.slice(startIdx, endIdx + "label: 'Kho chung'".length + 80);
    const labelCount = (slice.match(/label:\s*'/g) ?? []).length;
    expect(labelCount, `chip block should have 4 entries, got ${labelCount}`).toBe(4);
  });
});

describe('/admin/labor-profiles list page — T1B Pre-P2 table column drop (DEC-P2-10)', () => {
  it('does NOT render a "Liên kết nhân viên" column', () => {
    expect(CODE.list).not.toContain('Liên kết nhân viên');
    expect(CODE.list).not.toContain('Đã liên kết');
  });

  it('thead has exactly 5 <th> entries (one less than before)', () => {
    const thCount = (CODE.list.match(/<th[\s>]/g) ?? []).length;
    expect(thCount, `expected 5 <th>, got ${thCount}`).toBe(5);
  });

  it('empty-state colSpan is 5 (matches 5 <th>)', () => {
    expect(CODE.list).toMatch(/<td\s+colSpan=\{5\}/);
    expect(CODE.list).not.toMatch(/<td\s+colSpan=\{6\}/);
  });
});

describe('/admin/labor-profiles list page — T1B Pre-P2 terminology fence', () => {
  // v1.2 T0 T1C: page title is the operator-facing "Hồ sơ ứng viên".
  it('keeps canonical page <h1> "Hồ sơ ứng viên"', () => {
    expect(CODE.list).toMatch(/<h1[^>]*>\s*Hồ sơ ứng viên\s*<\/h1>/);
  });
  it('keeps the CTA button "+ Tiếp nhận hồ sơ"', () => {
    expect(CODE.list).toMatch(/\+\s*Tiếp nhận hồ sơ/);
  });
});

describe('/admin/labor-profiles/[id] — T1B Pre-P2 read-only banner (DEC-P2-11)', () => {
  it('mounts the linked-readonly banner with a /admin/workers link when workerId set', () => {
    expect(CODE.detail).toContain('data-testid="linked-readonly-banner"');
    expect(CODE.detail).toContain('Đã chuyển thành người lao động');
    expect(CODE.detail).toContain('href="/admin/workers"');
  });

  it('hides the "Sửa thông tin" button when profile is linked (read-only)', () => {
    expect(CODE.detail).not.toMatch(/<button[^>]*>\s*Sửa thông tin\s*<\/button>/);
  });
});

describe('/admin/labor-profiles/[id] — v1.2 T0 T1C PRE-P2 HOTFIX (no fake button)', () => {
  // v1.2 T0 T1C §3: the disabled fake button "Chuyển thành người lao động"
  // (with title="Tính năng đang được phát triển") is REMOVED. The detail
  // page now renders a static non-interactive note instead.
  it('does NOT render the fake disabled "Chuyển thành người lao động" button', () => {
    // The fake button was: <button disabled ... title="Tính năng đang được phát triển">Chuyển thành người lao động</button>
    expect(CODE.detail).not.toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Chuyển thành người lao động[\s\S]*?<\/button>/);
    expect(CODE.detail).not.toContain('Chuyển thành người lao động');
    expect(CODE.detail).not.toContain('Tính năng đang được phát triển');
  });

  it('renders the static non-clickable worker-formation note', () => {
    // T0 T1C §3 verbatim: "Người lao động được tạo hoặc liên kết khi hoàn
    // tất quy trình tuyển dụng phù hợp." The note is a <p>, not a button.
    expect(CODE.detail).toContain(
      'Người lao động được tạo hoặc liên kết khi hoàn tất quy trình tuyển dụng phù hợp.',
    );
    expect(CODE.detail).toContain('data-testid="labor-profile-worker-formation-note"');
  });

  it('banner body uses "Hồ sơ này đã được liên kết với người lao động" (T0 T1C §2)', () => {
    expect(CODE.detail).toContain('Hồ sơ này đã được liên kết với người lao động');
    expect(CODE.detail).not.toContain('Hồ sơ tiếp nhận này đã được liên kết');
  });
});

describe('/admin/labor-profiles/[id] — T1B Pre-P2 edit form mount (DEC-P2-12)', () => {
  it('mounts <LaborProfileEditForm> only when canEdit', () => {
    expect(CODE.detail).toContain('LaborProfileEditForm');
    expect(CODE.detail).toMatch(/\{canEdit\s*\?\s*[\s\S]*?<LaborProfileEditForm/);
  });

  it('passes role + canSeeSensitive to the form (v1.1: dropped onSaved prop)', () => {
    expect(CODE.detail).toMatch(/role=\{session\.role\}/);
    expect(CODE.detail).toMatch(/canSeeSensitive=\{canSeeSensitive\}/);
    // v1.1: KHÔNG còn prop onSaved.
    expect(CODE.detail).not.toMatch(/onSaved=\{[^}]*\}/);
  });
});

describe('/admin/labor-profiles/[id] — v1.1 PR #110 correction 1/4 copy sweep', () => {
  it('breadcrumb first item label là "Hồ sơ ứng viên" (T0 T1C §2)', () => {
    // Find the Breadcrumb items array literal; verify the first entry label.
    const breadcrumbMatch = CODE.detail.match(/Breadcrumb[\s\S]*?items=\{\s*\[([\s\S]*?)\]/);
    expect(breadcrumbMatch, 'Breadcrumb items not found').toBeTruthy();
    const itemsBlock = breadcrumbMatch![1]!;
    // First entry label.
    const firstLabelMatch = itemsBlock.match(/label:\s*['"]([^'"]+)['"]/);
    expect(firstLabelMatch, 'first label chip not found').toBeTruthy();
    expect(firstLabelMatch![1]).toBe('Hồ sơ ứng viên');
    // Defensive: legacy "Hồ sơ người lao động" KHÔNG còn trong detail page.
    expect(CODE.detail).not.toContain("label: 'Hồ sơ người lao động'");
    // Defensive: legacy "Hồ sơ tiếp nhận" KHÔNG còn trong detail page.
    expect(CODE.detail).not.toContain("label: 'Hồ sơ tiếp nhận'");
  });

  it('page metadata title là "Chi tiết hồ sơ ứng viên - Quản trị" (T0 T1C §2)', () => {
    expect(CODE.detail).toMatch(/metadata[\s\S]*?title:\s*['"]Chi tiết hồ sơ ứng viên/);
    expect(CODE.detail).not.toMatch(/metadata[\s\S]*?title:\s*['"]Chi tiết hồ sơ tiếp nhận/);
  });

  it('convert-button copy "Chuyển thành người lao động" đã bị xoá (T0 T1C §3)', () => {
    // The fake disabled button is REMOVED entirely; the operator-facing
    // flow is taken over by the static note + P1-F task (DEC-01..06).
    expect(CODE.detail).not.toContain('Chuyển thành người lao động');
    expect(CODE.detail).not.toContain('Chuyển đổi thành nhân viên');
  });
});

describe('/admin/labor-profiles/[id] labor-profile-edit-form.tsx — T1B Pre-P2 (DEC-P2-12)', () => {
  it('form is a client component', () => {
    expect(SOURCE.form.startsWith("'use client'")).toBe(true);
  });

  it('form gates render on canEdit (ADMIN | HR_MANAGER)', () => {
    expect(CODE.form).toMatch(/role\s*===\s*['"]ADMIN['"]\s*\|\|\s*role\s*===\s*['"]HR_MANAGER['"]/);
    expect(CODE.form).toMatch(/if\s*\(\s*!canEditRole\s*\)\s*\{[\s\S]*?return null/);
  });

  it('v1.1: form KHÔNG nhận prop onSaved (Server → Client function prop sai kiến trúc)', () => {
    // The interface should not declare `onSaved`. Strip comments first so we
    // don't pick up textual mentions inside the JSDoc block.
    const interfaceBlock = CODE.form.match(/export interface LaborProfileEditFormProps[\s\S]*?\}/);
    expect(interfaceBlock, 'form Props interface not found').toBeTruthy();
    expect(interfaceBlock![0]).not.toMatch(/onSaved/);
  });

  it('v1.1: form nhận prop `canSeeSensitive: boolean` và gate save khi false', () => {
    expect(CODE.form).toMatch(/canSeeSensitive\s*:\s*boolean/);
    // Save button disabled khi !canEdit hoặc !anyDirty.
    expect(CODE.form).toMatch(/disabled=\{inputsDisabled\s*\|\|\s*!anyDirty\}/);
    // Banner no-sensitive-banner khi !canSeeSensitive.
    expect(CODE.form).toContain('data-testid="no-sensitive-banner"');
  });

  it('v1.1: form dùng useRouter().refresh() thay cho onSaved callback', () => {
    expect(CODE.form).toMatch(/useRouter\s*\(\s*\)/);
    expect(CODE.form).toMatch(/router\.refresh\(\)/);
    expect(CODE.form).not.toMatch(/window\.location\.reload/);
  });

  it('v1.1: form PATCH body chỉ chứa field DIRTY (so với initial values)', () => {
    // Each field must be gated by a `dirty.<field>` check before inclusion.
    expect(CODE.form).toMatch(/if\s*\(\s*dirty\.fullName\s*\)/);
    expect(CODE.form).toMatch(/if\s*\(\s*dirty\.phone\s*\)/);
    expect(CODE.form).toMatch(/if\s*\(\s*dirty\.cccdNumber\s*\)/);
    // Body is built incrementally (not a single JSON.stringify({...}) literal),
    // so we assert: PATCH source MUST NOT contain `workerId` anywhere as a
    // key sent to the server.
    expect(CODE.form).not.toMatch(/body(?:\.[a-zA-Z]+)?\.workerId/);
    // And no JSON.stringify call should embed workerId.
    const stringCalls = CODE.form.match(/JSON\.stringify\([\s\S]*?\)/g) ?? [];
    for (const call of stringCalls) {
      expect(call).not.toMatch(/workerId/);
    }
  });

  it('handles 409 LABOR_PROFILE_ALREADY_LINKED by setting locked status', () => {
    expect(CODE.form).toMatch(/res\.status\s*===\s*409/);
    expect(CODE.form).toMatch(/setStatus\(\{\s*kind:\s*['"]locked['"]/);
  });

  it('handles 403 FORBIDDEN distinctly (does not crash)', () => {
    expect(CODE.form).toMatch(/res\.status\s*===\s*403/);
  });

  it('v1.1: client-side masked-input guard (MASK_RE test on phone + cccdNumber)', () => {
    expect(CODE.form).toMatch(/MASK_RE\.test\(phone\)/);
    expect(CODE.form).toMatch(/MASK_RE\.test\(cccdNumber\)/);
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
  });
});