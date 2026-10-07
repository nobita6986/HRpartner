/**
 * Static terminology test cho /admin/users — hrp-v6-admin-users-permissions.
 *
 * Sau khi tách UI sang `user-management.client.tsx`, test đọc cả page.tsx
 * (re-export) và file client để giữ ràng buộc:
 *   - Tiêu đề / nhãn cột tiếng Việt, không leak thuật ngữ nội bộ (M7).
 *   - Vai trò render qua `roleLabel(...)` helper từ shared i18n.
 *   - Tổng: tiếng Việt.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE_SOURCE = readFileSync(join(process.cwd(), 'app/admin/users/page.tsx'), 'utf8');
const CLIENT_SOURCE = readFileSync(
  join(process.cwd(), 'app/admin/users/user-management.client.tsx'),
  'utf8',
);

describe('/admin/users Wave 3 terminology', () => {
  it('page.tsx chỉ re-export từ user-management.client', () => {
    expect(PAGE_SOURCE).toMatch(/export\s*\{\s*default\s*\}\s*from\s*['"]\.\/user-management\.client['"]/);
  });

  it('client file dùng shared role-label foundation', () => {
    expect(CLIENT_SOURCE).toContain("from '@/src/shared/i18n/role-labels'");
    expect(CLIENT_SOURCE).toContain('roleLabel(');
    expect(CLIENT_SOURCE).not.toMatch(/const ROLE_LABELS\s*:/);
  });

  it('Vietnamese account + identifier labels + Total line trong client file', () => {
    expect(CLIENT_SOURCE).toContain("'Mã người dùng'");
    expect(CLIENT_SOURCE).toContain("'Mã nhà cung cấp'");
    expect(CLIENT_SOURCE).toContain('Tổng: {total} tài khoản');
    expect(CLIENT_SOURCE).not.toMatch(/>\s*User ID\s*</);
    expect(CLIENT_SOURCE).not.toMatch(/>\s*Vendor ID\s*</);
    expect(CLIENT_SOURCE).not.toMatch(/Tổng: \{total\} users/);
  });

  it('KHÔNG hiển thị nhãn nội bộ "M7"', () => {
    // Trang / nhãn phụ KHÔNG được phép chứa "M7" hoặc "Phân hệ" (thuật ngữ nội bộ).
    expect(CLIENT_SOURCE).not.toMatch(/Phân hệ M7/);
    expect(CLIENT_SOURCE).not.toMatch(/>\s*M7\s*</);
    expect(CLIENT_SOURCE).not.toMatch(/M7\s*—/);
    expect(PAGE_SOURCE).not.toMatch(/M7/);
  });

  it('header dùng tiêu đề rõ ràng bằng tiếng Việt (không M7)', () => {
    expect(CLIENT_SOURCE).toContain('Tài khoản hệ thống');
    expect(CLIENT_SOURCE).toContain('Quản lý tài khoản người dùng');
  });

  it('action buttons: Tạo / Sửa / Vô hiệu hóa / Kích hoạt lại (tiếng Việt, không "Disable"/"Enable" thuần)', () => {
    expect(CLIENT_SOURCE).toContain('Tạo tài khoản');
    expect(CLIENT_SOURCE).toContain('Vô hiệu hóa');
    expect(CLIENT_SOURCE).toContain('Kích hoạt lại');
  });
});
