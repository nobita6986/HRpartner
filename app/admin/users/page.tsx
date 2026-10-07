/**
 * /admin/users — page route. Toàn bộ UI nằm ở `user-management.client.tsx`
 * để dễ test/review. Page chỉ re-export component client.
 *
 * hrp-v6-admin-users-permissions (DEC-01, DEC-04, PHASE_KHOAHOC DoD):
 *   - Tài khoản tạo mới hiển thị mật khẩu tạm MỘT LẦN.
 *   - Mật khẩu KHÔNG bao giờ ghi vào DB / log / state sau khi modal đóng.
 *   - Bảo vệ admin cuối cùng + self-modification ở service layer.
 */
export { default } from './user-management.client';
