/**
 * projects-role-visibility.static.test.ts — hrp-t1a-introduce-hrp-and-menu-cleanup
 * correction 1/1.
 *
 * Static guard for the role-aware UI of `/admin/projects`.
 *
 * T0 directive §B mandates:
 *   - ADMIN, HR_MANAGER → quản lý dự án + công bố.
 *   - PM                 → quản lý dự án, KHÔNG hiển thị Công bố.
 *   - HR_STAFF           → chỉ xem danh sách/slot/trạng thái; KHÔNG Thêm,
 *                          Sửa hoặc Công bố.
 *   - SALE               → backend `GET /api/projects` KHÔNG mở rộng
 *                          (SALE không có trong VIEWER_ROLES), và
 *                          incompatibility có sẵn này phải được ghi rõ
 *                          trên UI.
 *
 * The capability projection lives in `app/admin/projects/page.tsx`; the
 * gating lives in `app/admin/projects/projects-table-client.tsx`. Both
 * files are static-guarded below. The capability *matrix* is locked
 * by a series of unit tests because the API role sets are the source
 * of truth (must not drift between UI and backend).
 *
 * Pure filesystem test — no DOM, no React, no DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SERVER_PAGE_PATH = join(process.cwd(), 'app/admin/projects/page.tsx');
const CLIENT_PATH = join(process.cwd(), 'app/admin/projects/projects-table-client.tsx');
const GET_API_PATH = join(process.cwd(), 'app/api/projects/route.ts');
const PUBLISH_API_PATH = join(process.cwd(), 'app/api/projects/[id]/publish/route.ts');

const SERVER_SOURCE = readFileSync(SERVER_PAGE_PATH, 'utf8');
const CLIENT_SOURCE = readFileSync(CLIENT_PATH, 'utf8');
const GET_API_SOURCE = readFileSync(GET_API_PATH, 'utf8');
const PUBLISH_API_SOURCE = readFileSync(PUBLISH_API_PATH, 'utf8');

describe('hrp-t1a-introduce-hrp-and-menu-cleanup — correction 1/1 / role-aware /admin/projects', () => {
  // RQ-01 — server page derives capability from role.
  it('server page derives a capability object from the session role', () => {
    expect(SERVER_SOURCE).toMatch(/deriveCapability\s*\(/);
    expect(SERVER_SOURCE).toMatch(/ProjectsCapability/);
    // The four capability fields the directive requires.
    expect(SERVER_SOURCE).toMatch(/canView:\s*\(/);
    expect(SERVER_SOURCE).toMatch(/canCreate:\s*\(/);
    expect(SERVER_SOURCE).toMatch(/canEdit:\s*\(/);
    expect(SERVER_SOURCE).toMatch(/canPublish:\s*\(/);
  });

  // RQ-02 — capability projection is a MIRROR of backend authority
  // (`app/api/projects/route.ts` VIEWER_ROLES / ADMIN_ROLES and
  // `app/api/projects/[id]/publish/route.ts` PUBLISH_SCOPE_ROLES). The
  // UI must NOT widen any role set.
  it('capability sets mirror backend authority sets without expansion', () => {
    // canView ⇔ VIEWER_ROLES của GET /api/projects
    expect(SERVER_SOURCE).toContain("'ADMIN'");
    expect(SERVER_SOURCE).toContain("'HR_MANAGER'");
    expect(SERVER_SOURCE).toContain("'HR_STAFF'");
    expect(SERVER_SOURCE).toContain("'PM'");
    expect(SERVER_SOURCE).toContain("'DIRECTOR'");
    // SALE bị cố ý loại khỏi VIEWER_ROLES của correction 1/1.
    expect(SERVER_SOURCE).not.toContain("'SALE', 'HR_MANAGER'");
    // canCreate / canEdit ⇔ ADMIN_ROLES (POST/PUT /api/projects)
    expect(SERVER_SOURCE).toContain("'ADMIN', 'PM', 'HR_MANAGER'");
    // canPublish ⇔ PUBLISH_SCOPE_ROLES của POST /api/projects/[id]/publish
    expect(SERVER_SOURCE).toContain("'ADMIN', 'HR_MANAGER', 'SALE', 'DIRECTOR'");
  });

  // RQ-03 — server page passes capability AND role to the client.
  it('server page forwards capability + role to the client component', () => {
    expect(SERVER_SOURCE).toMatch(/<ProjectsTableClient\b/);
    expect(SERVER_SOURCE).toMatch(/capability=\{capability\}/);
    expect(SERVER_SOURCE).toMatch(/role=\{session\.role\}/);
  });

  // RQ-04 — client hides Thêm / Sửa khi capability không cho phép.
  it('client hides "+ Thêm dự án" button when capability.canCreate is false', () => {
    expect(CLIENT_SOURCE).toMatch(/capability\.canCreate\s*&&\s*\(/);
  });

  it('client hides the "Sửa" row action when capability.canEdit is false', () => {
    expect(CLIENT_SOURCE).toMatch(/capability\.canEdit\s*\?\s*</);
  });

  // RQ-05 — client hides nút Công bố / Bỏ công bố khi capability.canPublish
  // là false. PM và HR_STAFF rơi vào nhánh này.
  it('client gates the Công bố / Bỏ công bố button on capability.canPublish', () => {
    expect(CLIENT_SOURCE).toMatch(/capability\.canPublish\s*\?\s*\(/);
    // Defense-in-depth: handler từ chối nếu capability nói không.
    expect(CLIENT_SOURCE).toMatch(/if\s*\(!capability\.canPublish\)/);
  });

  // RQ-06 — SALE (và role khác ngoài VIEWER_ROLES) phải thấy câu giải thích
  // "incompatibility có sẵn" thay vì bảng rỗng hoặc lỗi chung chung.
  it('client renders an incompatibility panel when role is outside VIEWER_ROLES', () => {
    expect(CLIENT_SOURCE).toMatch(/projects-incompatibility-panel/);
    expect(CLIENT_SOURCE).toMatch(/incompatibility có sẵn/i);
    expect(CLIENT_SOURCE).toMatch(/GET \/api\/projects/);
  });

  // RQ-07 — capability type is exported và có 4 field bắt buộc.
  it('client exports ProjectsCapability with the four required fields', () => {
    expect(CLIENT_SOURCE).toMatch(/export interface ProjectsCapability/);
    expect(CLIENT_SOURCE).toMatch(/canView:\s*boolean/);
    expect(CLIENT_SOURCE).toMatch(/canCreate:\s*boolean/);
    expect(CLIENT_SOURCE).toMatch(/canEdit:\s*boolean/);
    expect(CLIENT_SOURCE).toMatch(/canPublish:\s*boolean/);
  });

  // RQ-08 — empty-state copy: correction 1/1 đổi "Chưa có dự án công khai."
  // thành "Chưa có dự án nào." (T0 §B.4).
  it('empty-state copy is "Chưa có dự án nào." (no longer "công khai")', () => {
    expect(CLIENT_SOURCE).toMatch(/Chưa có dự án nào\./);
    expect(CLIENT_SOURCE).not.toMatch(/Chưa có dự án công khai/);
  });

  // RQ-09 — encoding & LF-only (RQ-18 / AC-21).
  it('both files are LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SERVER_SOURCE).not.toMatch(/\r\n/);
    expect(CLIENT_SOURCE).not.toMatch(/\r\n/);
    expect(SERVER_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
    expect(CLIENT_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});

describe('hrp-t1a-introduce-hrp-and-menu-cleanup — correction 1/1 / capability matrix mirrors backend authority', () => {
  // RQ-10 — UI capability must stay byte-equal to backend role sets.
  // Drift between UI và API gây ra 403 hàng loạt trong runtime.
  it('UI ADMIN_ROLES (= capability.canCreate/canEdit) matches POST /api/projects ADMIN_ROLES', () => {
    const apiMatch = GET_API_SOURCE.match(/const ADMIN_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\)/);
    if (!apiMatch) throw new Error('backend ADMIN_ROLES không tìm thấy');
    const apiRoles = apiMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    expect(apiRoles).toEqual(['ADMIN', 'PM', 'HR_MANAGER']);

    // UI deriveCapability phải tạo Set cùng tập role.
    const uiMatch = SERVER_SOURCE.match(/const ADMIN_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\s+as const\)/);
    if (!uiMatch) throw new Error('UI ADMIN_ROLES không tìm thấy');
    const uiRoles = uiMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    expect(uiRoles).toEqual(['ADMIN', 'PM', 'HR_MANAGER']);
  });

  it('UI PUBLISH_SCOPE_ROLES (= capability.canPublish) matches POST /api/projects/[id]/publish', () => {
    const apiMatch = PUBLISH_API_SOURCE.match(/const PUBLISH_SCOPE_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\)/);
    if (!apiMatch) throw new Error('backend PUBLISH_SCOPE_ROLES không tìm thấy');
    const apiRoles = apiMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    expect(apiRoles).toEqual(['ADMIN', 'HR_MANAGER', 'SALE', 'DIRECTOR']);

    const uiMatch = SERVER_SOURCE.match(/const PUBLISH_SCOPE_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\s+as const\)/);
    if (!uiMatch) throw new Error('UI PUBLISH_SCOPE_ROLES không tìm thấy');
    const uiRoles = uiMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    expect(uiRoles).toEqual(['ADMIN', 'HR_MANAGER', 'SALE', 'DIRECTOR']);
  });

  it('UI VIEWER_ROLES excludes SALE (incompatibility có sẵn of GET /api/projects)', () => {
    // VIEWER_ROLES in UI must not contain SALE.
    const uiMatch = SERVER_SOURCE.match(/const VIEWER_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\s+as const\)/);
    if (!uiMatch) throw new Error('UI VIEWER_ROLES không tìm thấy');
    const uiRolesText = uiMatch[1];
    expect(uiRolesText).not.toMatch(/'SALE'/);
    expect(uiRolesText).toContain("'HR_STAFF'");
    expect(uiRolesText).toContain("'PM'");
  });
});

describe('hrp-t1a-introduce-hrp-and-menu-cleanup — correction 1/1 / sidebar recruitment flow reordered', () => {
  // RQ-11 — sidebar recruitment flow is the user-facing flow:
  //   Dự án → Nhu cầu tuyển dụng → Tin tuyển dụng → Đơn ứng tuyển
  const ROLE_GUARD_PATH = join(process.cwd(), 'src/shared/ui/role-guard/role-guard-layout.tsx');
  const ROLE_GUARD_SOURCE = readFileSync(ROLE_GUARD_PATH, 'utf8');

  it('recruitment section declares the four entries in the prescribed order', () => {
    // Tìm đoạn section: 'recruitment' đầu tiên (mở đầu ở mục Dự án) và assert
    // thứ tự href xuất hiện trong đoạn kéo dài đến trước nhóm Nhân sự / Đối tác.
    const recruitmentBlock = ROLE_GUARD_SOURCE.match(
      /\{ href:\s*'\/admin\/projects'[\s\S]*?section:\s*'recruitment'[\s\S]*?(?=\n\s*\{ href:\s*'\/admin\/workers'|\/\/ Nhân sự|\/\/ Đối tác|\/\/ Tài chính)/,
    );
    if (!recruitmentBlock) throw new Error('không tách được khối recruitment');
    const block = recruitmentBlock[0];
    const duAn = block.indexOf("href: '/admin/projects'");
    const nhuCau = block.indexOf("href: '/admin/staffing'");
    const tinTuyenDung = block.indexOf("href: '/admin/jobs/job-postings'");
    const donUngTuyen = block.indexOf("href: '/admin/applications'");
    expect(duAn).toBeGreaterThan(-1);
    expect(nhuCau).toBeGreaterThan(duAn);
    expect(tinTuyenDung).toBeGreaterThan(nhuCau);
    expect(donUngTuyen).toBeGreaterThan(tinTuyenDung);
  });

  it('/admin/projects sidebar item now lists HR_STAFF (read-only capability)', () => {
    // HR_STAFF được backend cho phép xem từ trước (GET /api/projects VIEWER_ROLES).
    // Correction 1/1 cập nhật sidebar để HR_STAFF cũng thấy mục Dự án.
    const block = ROLE_GUARD_SOURCE.match(
      /href:\s*'\/admin\/projects'[\s\S]{0,200}roles:\s*\[[^\]]+\]/,
    );
    if (!block) throw new Error('không tìm thấy nav item /admin/projects');
    expect(block[0]).toContain("'HR_STAFF'");
    expect(block[0]).toContain("'PM'");
  });
});