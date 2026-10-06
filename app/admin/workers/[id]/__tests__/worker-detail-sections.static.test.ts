/**
 * worker-detail-sections.static.test.ts — T1B detail surface fence.
 *
 * Khóa các invariant copy/semantic của detail page:
 *   - 7 nhóm (Nhận diện / Liên hệ / Giấy tờ / Việc làm / Ngân hàng / Liên kết / Audit).
 *   - Copy tiếng Việt, không leak "Nhân viên" / "Nhân sự" / "NLD".
 *   - CTA link sang /admin/workers kèm breadcrumb quay lại.
 *   - Sensitive field đi qua `canSeeSensitive` gate; nếu thiếu → "***".
 *   - Edit form gọi PATCH /api/workers/[id], không gọi POST.
 *   - Delete button chỉ dành cho ADMIN; idem key + reason bắt buộc.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DETAIL_DIR = join(process.cwd(), 'app/admin/workers/[id]');
const PAGE = readFileSync(join(DETAIL_DIR, 'page.tsx'), 'utf8');
const EDIT = readFileSync(join(DETAIL_DIR, 'worker-edit-form.tsx'), 'utf8');
const STATUS = readFileSync(join(DETAIL_DIR, 'worker-status-form.tsx'), 'utf8');
const DELETE = readFileSync(join(DETAIL_DIR, 'worker-delete-button.tsx'), 'utf8');

function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const PAGE_CODE = stripComments(PAGE);

describe('/admin/workers/[id] — 7 section surface', () => {
  it('renders exactly 7 section titles per T1B contract', () => {
    // Order: Nhận diện, Liên hệ, Giấy tờ, Việc làm, Ngân hàng, Liên kết, Audit
    expect(PAGE_CODE).toContain('1. Nhận diện');
    expect(PAGE_CODE).toContain('2. Liên hệ');
    expect(PAGE_CODE).toContain('3. Giấy tờ');
    expect(PAGE_CODE).toContain('4. Việc làm');
    expect(PAGE_CODE).toContain('5. Ngân hàng');
    expect(PAGE_CODE).toContain('6. Liên kết Hồ sơ tiếp nhận & phân công dự án');
    expect(PAGE_CODE).toContain('7. Audit cơ bản');
  });

  it('does not use legacy "Nhân viên" / "Nhân sự" / "NLD" surface strings', () => {
    expect(PAGE_CODE).not.toContain("'Nhân viên'");
    expect(PAGE_CODE).not.toContain("'Nhân sự'");
    expect(PAGE_CODE).not.toContain("'NLD'");
  });

  it('uses canonical Vietnamese status labels (T1B wording)', () => {
    expect(PAGE_CODE).toContain('Đang làm');
    expect(PAGE_CODE).toContain('Tạm ngưng');
    expect(PAGE_CODE).toContain('Đã nghỉ');
    expect(PAGE_CODE).toContain('Chờ xác minh');
    expect(PAGE_CODE).toContain('Cần xem xét');
  });

  it('masks sensitive field values when canSeeSensitive is false (4-layer defense)', () => {
    // Server-side gate: page chỉ render raw CCCD/bank khi canSeeSensitive.
    // Sensitive field default = '***' khi không có quyền.
    expect(PAGE_CODE).toMatch(/canSeeSensitive\s*\?\s*detail\.cccdNumber\s*:\s*detail\.cccdNumber\s*\?\s*'\*\*\*'\s*:\s*'—'/);
    expect(PAGE_CODE).toMatch(/canSeeSensitive\s*\?\s*detail\.bankAccount\s*:\s*detail\.bankAccount\s*\?\s*'\*\*\*'/);
  });

  it('edit form PATCH /api/workers/[id], never POST /api/workers', () => {
    expect(EDIT).toContain("`/api/workers/${workerId}`");
    expect(EDIT).toMatch(/method:\s*['"]PATCH['"]/);
    expect(EDIT).not.toMatch(/method:\s*['"]POST['"]/);
  });

  it('edit form rejects `*` masked values client-side (4-layer defense)', () => {
    expect(EDIT).toContain("v.includes('*')");
    expect(EDIT).toContain('ký tự mask');
  });

  it('edit form is dirty-tracking — only sends changed fields', () => {
    expect(EDIT).toContain('dirty.length === 0');
    expect(EDIT).toContain('for (const [k, v] of dirty)');
  });

  it('edit form does NOT send actorId / userId / accountUserId / workerId / id', () => {
    // Server ép actorId từ ctx.userId; client không ghi đè.
    expect(EDIT).not.toMatch(/body\.actorId\s*=/);
    expect(EDIT).not.toMatch(/['"]actorId['"]\s*:/);
    expect(EDIT).not.toMatch(/['"]userId['"]\s*:/);
    expect(EDIT).not.toMatch(/['"]accountUserId['"]\s*:/);
    expect(EDIT).not.toMatch(/['"]workerId['"]\s*:/);
    // id lấy từ URL; form không ghi đè.
    expect(EDIT).not.toMatch(/body\.id\s*=/);
  });

  it('edit form uses expectedUpdatedAt for optimistic CAS', () => {
    expect(EDIT).toContain('expectedUpdatedAt');
  });

  it('status form uses 3 enum fields with canonical Vietnamese labels', () => {
    expect(STATUS).toContain('INCOMPLETE');
    expect(STATUS).toContain('PENDING_VERIFY');
    expect(STATUS).toContain('VERIFIED');
    expect(STATUS).toContain('REJECTED');
    expect(STATUS).toContain('NONE');
    expect(STATUS).toContain('ACTIVE');
    expect(STATUS).toContain('SUSPENDED');
    expect(STATUS).toContain('TERMINATED');
    expect(STATUS).toContain('NORMAL');
    expect(STATUS).toContain('REVIEW');
    expect(STATUS).toContain('BLOCKED');
    expect(STATUS).toContain('Chưa đủ');
    expect(STATUS).toContain('Đang làm');
    expect(STATUS).toContain('Đã nghỉ');
    expect(STATUS).toContain('Bình thường');
  });

  it('delete button calls DELETE with idempotency key + reason, not POST', () => {
    expect(DELETE).toContain("`/api/workers/${workerId}`");
    expect(DELETE).toMatch(/method:\s*['"]DELETE['"]/);
    expect(DELETE).toContain('x-idempotency-key');
    expect(DELETE).toContain('reason');
  });

  it('delete button is in dialog flow (open/close + confirm) — phòng click nhầm', () => {
    expect(DELETE).toContain('setOpen(true)');
    expect(DELETE).toContain('Xóa vĩnh viễn');
    expect(DELETE).toContain('cleanup test row');
  });

  it('delete button shows blocking facts list on 409', () => {
    expect(DELETE).toContain('blockingFacts');
  });

  it('detail page enforces ADMIN-only permanent delete', () => {
    // Page guard: chỉ ADMIN mới thấy delete button (canDelete = role === 'ADMIN').
    expect(PAGE_CODE).toContain("canDelete = session.role === 'ADMIN'");
    expect(PAGE_CODE).toContain('canDelete && (');
  });

  it('detail page links source LaborProfile back to /admin/labor-profiles/[id]', () => {
    expect(PAGE_CODE).toContain('href={`/admin/labor-profiles/${detail.laborProfile.id}`}');
  });

  it('detail page uses server component + getServerSession redirect', () => {
    expect(PAGE_CODE).toContain('getServerSession()');
    expect(PAGE_CODE).toContain("redirect(`/auth/login?returnUrl=/admin/workers/${id}`)");
  });
});

describe('/admin/workers/[id] — encoding hygiene', () => {
  it('all four files are LF-only (no CRLF) and UTF-8 no-BOM', () => {
    for (const [name, src] of [
      ['page.tsx', PAGE],
      ['worker-edit-form.tsx', EDIT],
      ['worker-status-form.tsx', STATUS],
      ['worker-delete-button.tsx', DELETE],
    ] as const) {
      expect(src).not.toMatch(/\r\n/);
      expect(src.charCodeAt(0), `${name} starts with BOM`).not.toBe(0xfeff);
    }
  });
});
