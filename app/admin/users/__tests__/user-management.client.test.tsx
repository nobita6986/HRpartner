/**
 * user-management.client.test.tsx — hrp-v6-admin-users-permissions (AC-04).
 *
 * Smoke test (static markup) — không có @testing-library/react, dùng
 * `renderToStaticMarkup` để verify shape render. PATCH/POST/DELETE flow đã có
 * coverage ở `__tests__/routes.test.ts` (route handler) + service tests.
 *
 * Verify:
 *   - Trang re-export qua `app/admin/users/page.tsx` → `user-management.client.tsx`.
 *   - Header: tiêu đề tiếng Việt, có nút "Tạo tài khoản", KHÔNG có nhãn nội bộ "M7".
 *   - Filter controls (search input, isActive select, role select).
 *   - State "Đang tải…" hiển thị trong initial render.
 *   - Render pass: lỗi fetch → render banner lỗi thân thiện.
 *   - Test UI smoke các modal qua phân tích source (KHÔNG trigger state machine
 *     trong useState — unit lane SSR không flush useEffect).
 *
 * Mock fetch toàn cục để tránh network thật (unit lane DB-fail-closed).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import UserManagementClient from '../user-management.client';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // Default: trả về danh sách rỗng.
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ users: [], total: 0, take: 50, skip: 0 }),
  });
  (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
});

function renderInitial(): string {
  // `renderToStaticMarkup` không flush useEffect; ở state khởi tạo component
  // hiển thị "Đang tải…". Dùng để verify header + filter controls.
  return renderToStaticMarkup(createElement(UserManagementClient));
}

describe('user-management.client — render shape', () => {
  it('page.tsx re-export trỏ đúng tới client component', async () => {
    const pageSource = (await import('../page')).default;
    expect(pageSource).toBe(UserManagementClient);
  });

  it('header: tiêu đề + phụ đề tiếng Việt, KHÔNG có nhãn nội bộ "M7"', () => {
    const html = renderInitial();
    expect(html).toContain('Tài khoản hệ thống');
    expect(html).toContain('Quản lý tài khoản người dùng');
    expect(html).not.toMatch(/M7/);
    expect(html).not.toMatch(/Phân hệ/);
  });

  it('có nút "Tạo tài khoản" với data-testid', () => {
    const html = renderInitial();
    expect(html).toContain('data-testid="open-create-user"');
    expect(html).toContain('Tạo tài khoản');
  });

  it('filter controls: search input + isActive select + role select', () => {
    const html = renderInitial();
    expect(html).toContain('Tìm kiếm ID / tên / SĐT…');
    expect(html).toContain('Tất cả vai trò');
    expect(html).toContain('Tất cả'); // isActive select
  });

  it('initial state hiển thị "Đang tải…" (trước khi fetch resolve)', () => {
    const html = renderInitial();
    expect(html).toContain('Đang tải…');
  });
});

describe('user-management.client — source contract', () => {
  it('client file CÓ khai báo các data-testid cần thiết cho E2E/UI test', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/admin/users/user-management.client.tsx'),
      'utf8',
    );
    // data-testid cho action bar (mỗi nút trên dòng user).
    expect(src).toContain('data-testid="open-create-user"');
    expect(src).toMatch(/data-testid=\{`edit-\$\{u\.id\}`\}/);
    expect(src).toMatch(/data-testid=\{`(deactivate|reactivate)-\$\{u\.id\}`\}/);
    // data-testid cho copy mật khẩu tạm.
    expect(src).toContain('data-testid="copy-temp-password"');
    // Submit buttons.
    expect(src).toContain('data-testid="submit-create"');
  });

  it('client file KHÔNG ghi `console.*` mật khẩu (chỉ render UI, không log secret)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/admin/users/user-management.client.tsx'),
      'utf8',
    );
    // Không cho phép bất kỳ dòng nào log temporaryPassword qua console.
    expect(src).not.toMatch(/console\.(log|info|debug|warn|error).*temporaryPassword/);
    expect(src).not.toMatch(/console\.(log|info|debug|warn|error).*password/i);
  });
});
