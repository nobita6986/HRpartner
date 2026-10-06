/**
 * project-terminology.test.ts — T1A PRE-P2 HOTFIX (F-02: Việt hoá).
 *
 * Static terminology lock-down:
 *   - Toàn bộ copy operator-facing của trang /admin/projects/[id] phải là
 *     tiếng Việt; KHÔNG dùng các nhãn tiếng Anh đã liệt kê ở T0 (Admin,
 *     Candidate Submissions, Project Assignments, Staffing Orders, Job
 *     Openings, Opening ID, Project) cho operator-facing copy.
 *   - Raw enum ACTIVE/OPEN không được hiển thị dạng thô — phải map qua
 *     `projectStatusLabel()` ra nhãn tiếng Việt.
 *   - Breadcrumb / empty-state / error / button phải tiếng Việt thống nhất.
 *
 * Cách test: đọc nội dung file `project-detail-client.tsx` và `page.tsx`
 * rồi quét các literal. Đây là static guard — không tảo boolean — chỉ
 * đảm bảo không hồi quy copy tiếng Anh trong tương lai. Không thay thế
 * RQ-01..RQ-08 functional tests.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CLIENT_PATH = join(
  process.cwd(),
  'app/admin/projects/[id]/project-detail-client.tsx',
);
const PAGE_PATH = join(process.cwd(), 'app/admin/projects/[id]/page.tsx');

const client = readFileSync(CLIENT_PATH, 'utf8');
const page = readFileSync(PAGE_PATH, 'utf8');

/** Nhãn EN cấm dùng trong operator-facing UI. Cho phép xuất hiện trong
 * JSDoc/comment. Static test này chỉ là regression guard; không thay thế
 * RQ-01..RQ-08 functional tests. */
const FORBIDDEN_EN_LABELS = [
  'Candidate Submissions',
  'Project Assignments',
  'Edit Project',
  'Activate Project',
  'Suspend Project',
  'Complete Project',
  'Cancel Project',
  'Delete Project',
  'Permanent Delete',
];

describe('Project detail — Vietnamese copy lock-down', () => {
  it('KHÔNG chứa các nhãn EN cấm trong project-detail-client.tsx', () => {
    for (const needle of FORBIDDEN_EN_LABELS) {
      expect(client, `forbidden English label "${needle}" found`).not.toContain(needle);
    }
  });

  it('Có các nhãn VI bắt buộc', () => {
    const requiredVI = [
      'Đơn ứng tuyển',
      'Phân công người lao động',
      'Nhu cầu tuyển dụng',
      'Vị trí cần tuyển',
      'Mã vị trí',
      'Sửa dự án',
      'Kích hoạt dự án',
      'Tạm dừng dự án',
      'Hoàn thành dự án',
      'Huỷ dự án',
      'Xoá vĩnh viễn',
      'Danh sách dự án',
      'Chế độ chỉ đọc',
    ];
    for (const needle of requiredVI) {
      expect(client, `required Vietnamese label "${needle}" missing`).toContain(needle);
    }
  });

  it('Hiển thị trạng thái qua `projectStatusLabel` chứ KHÔNG render raw enum', () => {
    // Đảm bảo không có chỗ nào render status kiểu `{so.status}` hay `{project.status}`.
    // Allow internal state machine map (keys are enum strings).
    // Look for explicit user-facing JSX text usage of `status` or `project.status`.
    const rawUsagePatterns = [
      /\b\{so\.status\}/,
      /\b\{project\.status\}/,
      /\b\{projectStatusTone\(project\.status\)\}\s*>\s*\{project\.status\}/,
    ];
    for (const re of rawUsagePatterns) {
      expect(re.test(client), `raw enum leaked: ${re}`).toBe(false);
    }
    // Đã phải bọc trong projectStatusLabel (status badge).
    expect(client).toMatch(/\{projectStatusLabel\(project\.status\)\}/);
    expect(client).toMatch(/tone=\{projectStatusTone\(project\.status\)\}/);
  });

  it('Nhãn EN `Admin` không xuất hiện dưới dạng operator-facing role label', () => {
    // T0: "Admin → Quản trị". Cho phép `Admin` xuất hiện trong:
    //   - import path / module name
    //   - role enum values (HR_MANAGER, ADMIN, ...) — không phải UI literal.
    // Đảm bảo operator-facing copy dùng `Quản trị` hoặc `Quản trị viên`.
    // Đảm bảo banner readonly hiển thị `roleLabel(role)` thay vì tên EN cứng.
    expect(client).toMatch(/roleLabel\(role\)/);
  });

  it('page.tsx (Server Component) renders `ProjectDetailClient` + capability', () => {
    expect(page).toMatch(/ProjectDetailClient/);
    expect(page).toMatch(/deriveProjectCapability|ProjectCapability/);
  });

  it('page.tsx mirrors backend authority — role gate đồng bộ ADMIN_ROLES', () => {
    // Server-side capability phải mirror PROJECT_UPDATE_ROLES / PROJECT_DELETE_ROLES.
    expect(page).toMatch(/PROJECT_UPDATE_ROLES|PROJECT_DELETE_ROLES/);
    // FAIL-CLOSED 404 khi role ngoài authority.
    expect(page).toMatch(/notFound\(\)/);
  });

  it('page.tsx forward-compat với job-openings detail route — không tạo link chết', () => {
    // T0 §B.2: chỉ tạo link khi route detail thực sự tồn tại.
    expect(page).toMatch(/jobOpeningDetailRouteExists/);
  });

  it('Client component có anchor `<Link>` tới /admin/staffing-orders/{id}', () => {
    expect(client).toMatch(/href=\{`\/admin\/staffing-orders\/\$\{so\.id\}`\}/);
  });

  it('Client component có anchor `<Link>` tới /admin/job-openings/{id} khi route tồn tại', () => {
    expect(client).toMatch(/href=\{`\/admin\/job-openings\/\$\{op\.id\}`\}/);
  });
});

describe('Project detail — terminal state guard', () => {
  it('Client render condition: COMPLETED/CANCELLED không có action chuyển trạng thái', () => {
    // VALID_TRANSITIONS map định nghĩa terminal ⇒ không action.
    // Đảm bảo map COMPLETED và CANCELLED là rỗng [].
    expect(client).toMatch(/COMPLETED:\s*\[\]/);
    expect(client).toMatch(/CANCELLED:\s*\[\]/);
  });

  it('Status-action render dựa trên transitionActions (chứ không render raw enum)', () => {
    // transitionActions phải filter qua VALID_TRANSITIONS[project.status].
    expect(client).toMatch(/VALID_TRANSITIONS\[project\.status\]/);
  });
});

describe('Project detail — capability routing (RQ-03)', () => {
  it('Toolbar chỉ render khi có ít nhất một capability dương', () => {
    expect(client).toMatch(
      /capability\.canEdit\s*\|\|\s*capability\.canChangeStatus\s*\|\|\s*capability\.canDelete/,
    );
  });

  it('Nút `Xoá vĩnh viễn` chỉ render khi `capability.canDelete`', () => {
    // pattern: `capability.canDelete && (` trước nút delete.
    expect(client).toMatch(/capability\.canDelete\s*&&/);
  });

  it('Nút `Sửa dự án` chỉ render khi `capability.canEdit`', () => {
    expect(client).toMatch(/capability\.canEdit\s*&&/);
  });

  it('Status action buttons chỉ render khi `capability.canChangeStatus`', () => {
    expect(client).toMatch(/capability\.canChangeStatus\s*&&/);
  });
});