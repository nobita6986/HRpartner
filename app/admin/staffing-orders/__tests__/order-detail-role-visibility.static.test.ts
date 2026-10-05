/**
 * order-detail-role-visibility.static.test.ts — t1a-staffing-order-management.
 *
 * Static guard for `/admin/staffing-orders/[id]` detail page.
 *
 * T0 directive (RQ-03, RQ-04):
 *   - Trang chi tiết phải mở read-only cho mọi role có API read access
 *     (HR_STAFF, PM, DIRECTOR, ACCOUNTANT) — KHÔNG redirect 403 cứng.
 *   - Toolbar mutate (Sửa / Đánh dấu sắp đóng / Mở lại / Đóng / Hủy /
 *     Xóa vĩnh viễn) chỉ hiển thị với role có authority tương ứng
 *     (`canEdit` = ADMIN/HR_MANAGER/SALE; `canDelete` = ADMIN).
 *   - Phân công chuyên viên (RecruiterAssignmentManager) gate bằng
 *     `canAssign` = ADMIN/HR_MANAGER.
 *   - Read-only banner xuất hiện khi `canView && !canEdit`.
 *
 * Pure filesystem test — không có DOM, React hay DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SERVER_PAGE_PATH = join(
  process.cwd(),
  'app/admin/staffing-orders/[id]/page.tsx',
);
const CLIENT_PATH = join(
  process.cwd(),
  'app/admin/staffing-orders/[id]/order-management-client.tsx',
);
const EDIT_MODAL_PATH = join(
  process.cwd(),
  'app/admin/staffing-orders/[id]/edit-order-modal.tsx',
);
const API_ROUTE_PATH = join(
  process.cwd(),
  'app/api/staffing/orders/[id]/route.ts',
);
const SERVICE_PATH = join(
  process.cwd(),
  'src/domains/staffing/order.service.ts',
);

const SERVER_SOURCE = readFileSync(SERVER_PAGE_PATH, 'utf8');
const CLIENT_SOURCE = readFileSync(CLIENT_PATH, 'utf8');
const EDIT_MODAL_SOURCE = readFileSync(EDIT_MODAL_PATH, 'utf8');
const API_ROUTE_SOURCE = readFileSync(API_ROUTE_PATH, 'utf8');
const SERVICE_SOURCE = readFileSync(SERVICE_PATH, 'utf8');

describe('t1a-staffing-order-management — /admin/staffing-orders/[id] role visibility', () => {
  // RQ-04: page mở read-only cho mọi role có LIST_ROLES.
  it('server page chỉ 404 cho role NGOÀI VIEW_ROLES, không redirect 403 cứng', () => {
    // VIEW_ROLES phải chứa tất cả role có API read access.
    const viewMatch = SERVER_SOURCE.match(/const VIEW_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\s+as const\)/);
    if (!viewMatch) throw new Error('VIEW_ROLES không tìm thấy');
    const roles = viewMatch[1];
    expect(roles).toContain("'ADMIN'");
    expect(roles).toContain("'HR_MANAGER'");
    expect(roles).toContain("'HR_STAFF'");
    expect(roles).toContain("'PM'");
    expect(roles).toContain("'SALE'");
    expect(roles).toContain("'DIRECTOR'");
    expect(roles).toContain("'ACCOUNTANT'");
    // KHÔNG dùng redirect 403 cứng — dùng notFound() cho role ngoài view scope.
    expect(SERVER_SOURCE).toMatch(/VIEW_ROLES\.has\(/);
  });

  // RQ-04: page KHÔNG còn banner "Bạn không có quyền truy cập" cứng.
  it('server page KHÔNG còn hard-coded 403 banner "Bạn không có quyền truy cập"', () => {
    expect(SERVER_SOURCE).not.toMatch(/Bạn không có quyền truy cập trang này/);
  });

  // RQ-04: capability được derive từ session role.
  it('server page derive StaffingOrderCapability từ session role', () => {
    expect(SERVER_SOURCE).toMatch(/StaffingOrderCapability/);
    expect(SERVER_SOURCE).toMatch(/canView:/);
    expect(SERVER_SOURCE).toMatch(/canEdit:/);
    expect(SERVER_SOURCE).toMatch(/canChangeStatus:/);
    expect(SERVER_SOURCE).toMatch(/canAssign:/);
    expect(SERVER_SOURCE).toMatch(/canDelete:/);
  });

  // RQ-09: capability matrix mirror backend authority sets.
  it('server page MUTATE_ROLES mirror UPDATE_ROLES của API', () => {
    const apiMatch = API_ROUTE_SOURCE.match(/const UPDATE_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\s+as const\)/);
    if (!apiMatch) throw new Error('API UPDATE_ROLES không tìm thấy');
    const apiRoles = apiMatch[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    expect(apiRoles).toEqual(['ADMIN', 'HR_MANAGER', 'SALE']);

    const pageMatch = SERVER_SOURCE.match(/const MUTATE_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\s+as const\)/);
    if (!pageMatch) throw new Error('MUTATE_ROLES không tìm thấy');
    const pageRoles = pageMatch[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    expect(pageRoles).toEqual(['ADMIN', 'HR_MANAGER', 'SALE']);
  });

  it('server page DELETE_ROLES = ADMIN only (mirror DELETE_ROLES của API)', () => {
    const apiMatch = API_ROUTE_SOURCE.match(/const DELETE_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\s+as const\)/);
    if (!apiMatch) throw new Error('API DELETE_ROLES không tìm thấy');
    const apiRoles = apiMatch[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    expect(apiRoles).toEqual(['ADMIN']);

    const pageMatch = SERVER_SOURCE.match(/const DELETE_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\s+as const\)/);
    if (!pageMatch) throw new Error('page DELETE_ROLES không tìm thấy');
    const pageRoles = pageMatch[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    expect(pageRoles).toEqual(['ADMIN']);
  });

  it('server page ASSIGN_ROLES mirror MANAGE_ROLES của RecruiterAssignmentManager', () => {
    const pageMatch = SERVER_SOURCE.match(/const ASSIGN_ROLES\s*=\s*new Set\(\[\s*([^\]]+)\s*\]\s+as const\)/);
    if (!pageMatch) throw new Error('ASSIGN_ROLES không tìm thấy');
    const pageRoles = pageMatch[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    expect(pageRoles).toEqual(['ADMIN', 'HR_MANAGER']);
  });

  // RQ-04: client hiển thị read-only banner khi canView && !canEdit.
  it('client render read-only banner khi canView && !canEdit', () => {
    expect(CLIENT_SOURCE).toMatch(/readonly-banner/);
    expect(CLIENT_SOURCE).toMatch(/canView\s*&&\s*!capability\.canEdit/);
  });

  // CORRECTION 1/1 (T0): banner copy dùng "vai trò" thay vì "role".
  it('read-only banner dùng "vai trò" (không hiện "role")', () => {
    expect(CLIENT_SOURCE).toMatch(/vai trò/);
    expect(CLIENT_SOURCE).not.toMatch(/role \{role\} có quyền xem/);
  });

  // RQ-05: toolbar chỉ render khi canEdit.
  it('toolbar mutate chỉ render khi capability.canEdit', () => {
    expect(CLIENT_SOURCE).toMatch(/capability\.canEdit\s*&&\s*\(/);
  });

  it('toolbar "Xóa vĩnh viễn" chỉ render khi capability.canDelete', () => {
    expect(CLIENT_SOURCE).toMatch(/capability\.canDelete\s*&&/);
  });

  it('section "Chuyên viên tuyển dụng" gọi RecruiterAssignmentManager với canManage = capability.canAssign', () => {
    expect(CLIENT_SOURCE).toMatch(/canManage=\{capability\.canAssign\}/);
  });

  // RQ-05: state machine giữ nguyên — không thêm status mới.
  it('state machine VALID_TRANSITIONS mirror service.order.service', () => {
    const clientTransitions = CLIENT_SOURCE.match(/const VALID_TRANSITIONS[\s\S]*?\n\}\s*;/);
    if (!clientTransitions) throw new Error('VALID_TRANSITIONS không tìm thấy');
    const source = clientTransitions[0];
    // Phải giống order.service:
    //   OPEN → CLOSING_SOON|CLOSED|CANCELLED
    //   CLOSING_SOON → OPEN|CLOSED|CANCELLED
    //   CLOSED/CANCELLED = terminal
    expect(source).toMatch(/OPEN:\s*\['CLOSING_SOON'.*'CLOSED'.*'CANCELLED'\]/);
    expect(source).toMatch(/CLOSING_SOON:\s*\['OPEN'.*'CLOSED'.*'CANCELLED'\]/);
    expect(source).toMatch(/CLOSED:\s*\[\]/);
    expect(source).toMatch(/CANCELLED:\s*\[\]/);
    // Service cũng phải có cùng transition.
    expect(SERVICE_SOURCE).toMatch(/OPEN:\s*\['CLOSING_SOON',\s*'CLOSED',\s*'CANCELLED'\]/);
    expect(SERVICE_SOURCE).toMatch(/CLOSING_SOON:\s*\['OPEN',\s*'CLOSED',\s*'CANCELLED'\]/);
    expect(SERVICE_SOURCE).toMatch(/CLOSED:\s*\[\]/);
    expect(SERVICE_SOURCE).toMatch(/CANCELLED:\s*\[\]/);
  });

  // RQ-06: edit modal cho sửa title/description/deadline/slots; project READ-ONLY.
  it('EditOrderModal có field project read-only (projectId immutable)', () => {
    expect(EDIT_MODAL_SOURCE).toMatch(/data-testid="edit-project-readonly"/);
    expect(EDIT_MODAL_SOURCE).toMatch(/readOnly/);
  });

  it('EditOrderModal cho phép thêm/sửa/xoá slot với guard "đã phát sinh"', () => {
    expect(EDIT_MODAL_SOURCE).toMatch(/data-testid="edit-add-slot"/);
    expect(EDIT_MODAL_SOURCE).toMatch(/Đánh dấu xoá/);
    expect(EDIT_MODAL_SOURCE).toMatch(/đã phát sinh/);
  });

  it('EditOrderModal KHÔNG gửi projectId (immutable)', () => {
    // Payload object phải KHÔNG chứa projectId.
    const payloadMatch = EDIT_MODAL_SOURCE.match(/const payload = \{([\s\S]*?)\};/);
    if (!payloadMatch) throw new Error('payload object không tìm thấy');
    expect(payloadMatch[1]).not.toMatch(/projectId\s*:/);
  });

  // RQ-07 + CORRECTION 1/1: API DELETE chỉ ADMIN + typed 409 cho order có
  // phụ thuộc. Service là source of truth cho error message.
  it('API DELETE có typed error ORDER_NOT_DELETABLE + service guidance "Hủy nhu cầu"', () => {
    expect(API_ROUTE_SOURCE).toMatch(/ORDER_NOT_DELETABLE/);
    // CORRECTION 1/1: guidance message bây giờ ở service (giữ nguyên enum
    // error code ở API).
    expect(SERVICE_SOURCE).toMatch(/Hủy nhu cầu/);
  });

  it('API DELETE dùng withIdempotency đúng contract (route key DELETE:/api/staffing/orders/:id)', () => {
    expect(API_ROUTE_SOURCE).toMatch(/DELETE:\/api\/staffing\/orders\/\$\{id\}/);
    expect(API_ROUTE_SOURCE).toMatch(/IdempotencyConflictError/);
  });

  it('API DELETE thiếu x-idempotency-key trả 400 VALIDATION_ERROR', () => {
    expect(API_ROUTE_SOURCE).toMatch(/Thiếu header x-idempotency-key/);
    expect(API_ROUTE_SOURCE).toMatch(/VALIDATION_ERROR[\s\S]{0,200}x-idempotency-key/);
  });

  it('API PUT có hourlyRateVnd validation (safe integer, >=0 hoặc null) — typed 400', () => {
    expect(API_ROUTE_SOURCE).toMatch(/Number\.isSafeInteger/);
    expect(API_ROUTE_SOURCE).toMatch(/lương\/giờ/);
  });

  it('API PUT có validFrom/validTo validation (validTo >= validFrom) — typed 400', () => {
    expect(API_ROUTE_SOURCE).toMatch(/isIsoDateOnly/);
    expect(API_ROUTE_SOURCE).toMatch(/hiệu lực đến ngày[\s\S]{0,200}\$\{slot\.validTo\}/);
  });

  it('API PUT có typed error ORDER_NOT_EDITABLE + SLOT_HAS_DEPENDENCIES', () => {
    expect(API_ROUTE_SOURCE).toMatch(/ORDER_NOT_EDITABLE/);
    expect(API_ROUTE_SOURCE).toMatch(/SLOT_HAS_DEPENDENCIES/);
  });

  // RQ-08: page render header (code, title, project, description, deadline, status).
  it('client render header order với code/title/project/description/deadline', () => {
    expect(CLIENT_SOURCE).toMatch(/data-testid="order-header"/);
    expect(CLIENT_SOURCE).toMatch(/data-testid="order-code"/);
    expect(CLIENT_SOURCE).toMatch(/data-testid="order-title"/);
    expect(CLIENT_SOURCE).toMatch(/data-testid="order-project"/);
    expect(CLIENT_SOURCE).toMatch(/data-testid="order-deadline"/);
    expect(CLIENT_SOURCE).toMatch(/data-testid="order-description"/);
  });

  it('client render bảng vị trí với cột Mã, Tên, Cần, Đã tuyển, Còn thiếu, Ca, Lương, Địa điểm, Hiệu lực', () => {
    expect(CLIENT_SOURCE).toMatch(/data-testid="order-slots-section"/);
    // Header có thể ở 1 dòng (khi source gốc) hoặc multi-line (sau khi tách
    // dòng cho dễ đọc). Match cả hai shape.
    const singleLine = CLIENT_SOURCE.match(
      /\[\s*'Mã',\s*'Tên vị trí',\s*'Cần',\s*'Đã tuyển',\s*'Còn thiếu',\s*'Ca làm',\s*'Lương\/giờ',\s*'Địa điểm',\s*'Hiệu lực'\s*,?\s*\]/,
    );
    const multiLine = CLIENT_SOURCE.match(
      /'Mã',[\s\S]{0,80}'Tên vị trí',[\s\S]{0,80}'Cần',[\s\S]{0,80}'Đã tuyển',[\s\S]{0,80}'Còn thiếu',[\s\S]{0,80}'Ca làm',[\s\S]{0,80}'Lương\/giờ',[\s\S]{0,80}'Địa điểm',[\s\S]{0,80}'Hiệu lực'/,
    );
    expect(singleLine ?? multiLine).not.toBeNull();
  });

  it('client render bảng JobOpenings & Postings', () => {
    expect(CLIENT_SOURCE).toMatch(/data-testid="order-openings-section"/);
    // CORRECTION 1/1 (T0): toàn bộ text operator-facing Việt hoá sạch.
    // JobOpening → vị trí tuyển nội bộ; JobPosting → tin tuyển dụng.
    expect(CLIENT_SOURCE).toMatch(/Vị trí tuyển nội bộ &amp; Tin tuyển dụng/);
    expect(CLIENT_SOURCE).toMatch(/Vị trí tuyển nội bộ/);
    expect(CLIENT_SOURCE).toMatch(/Tin tuyển dụng/);
    // Không hiện raw enum text trong user-facing strings.
    expect(CLIENT_SOURCE).not.toMatch(/JobOpenings &amp; JobPostings/);
  });

  // CORRECTION 1/1 (T0): confirm dialog body không hiện "terminal" hay
  // "JobPosting" thô — dùng "trạng thái kết thúc" / "tin tuyển dụng".
  it('confirm dialog body dùng "trạng thái kết thúc" + "tin tuyển dụng"', () => {
    expect(CLIENT_SOURCE).toMatch(/trạng thái kết thúc/);
    expect(CLIENT_SOURCE).toMatch(/tin tuyển dụng/);
    expect(CLIENT_SOURCE).not.toMatch(/trạng thái terminal/);
    expect(CLIENT_SOURCE).not.toMatch(/JobPosting liên kết/);
  });

  // CORRECTION 1/1 (T0): user-visible strings thay vì raw enum:
  // "Order" → "Nhu cầu"; "Slot" → "Vị trí".
  it('confirm dialog body dùng "Nhu cầu" thay vì "Order"', () => {
    expect(CLIENT_SOURCE).toMatch(/Nhu cầu sẽ chuyển/);
    // "Order sẽ chuyển" KHÔNG còn trong dialog body
    expect(CLIENT_SOURCE).not.toMatch(/Order sẽ chuyển/);
  });

  // CORRECTION 1/1 (T0): nút Xóa vĩnh viễn hiển thị cho ADMIN ở MỌI
  // trạng thái (kể cả CLOSED/CANCELLED). Backend guard là authority.
  it('nút "Xóa vĩnh viễn" chỉ phụ thuộc capability.canDelete (không filter theo status)', () => {
    expect(CLIENT_SOURCE).toMatch(/capability\.canDelete\s*&&/);
    // KHÔNG có điều kiện order.status !== 'CLOSED' hay !== 'CANCELLED' cho delete
    const deleteMatch = CLIENT_SOURCE.match(/toolbar-delete[\s\S]{0,400}/);
    expect(deleteMatch).not.toBeNull();
    // Trong khối delete button, không có so sánh status CLOSED/CANCELLED.
    if (deleteMatch) {
      expect(deleteMatch[0]).not.toMatch(/order\.status\s*!==\s*['"]CLOSED['"]/);
      expect(deleteMatch[0]).not.toMatch(/order\.status\s*!==\s*['"]CANCELLED['"]/);
    }
  });

  // Encoding & LF-only
  it('tất cả file trong surface là LF-only, no UTF-8 BOM', () => {
    for (const src of [SERVER_SOURCE, CLIENT_SOURCE, EDIT_MODAL_SOURCE, API_ROUTE_SOURCE]) {
      expect(src).not.toMatch(/\r\n/);
      expect(src.charCodeAt(0)).not.toBe(0xfeff);
    }
  });
});
