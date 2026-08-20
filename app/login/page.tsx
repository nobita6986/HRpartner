/**
 * /login (Phase 1 bcc-fence — RQ-02, DEC-07)
 *
 * Form phone + password → POST /api/auth/login → redirect về callback hoặc /bcc.
 * Lỗi hiển thị chung "Sai số điện thoại hoặc mật khẩu" — không lộ tài khoản tồn tại.
 * KHÔNG lưu password vào URL/localStorage. Design: Warm Professionalism
 * (globals.css tokens — primary #F26522, background #FAF9F7, Be Vietnam Pro).
 */
import { Suspense } from 'react';
import { headers } from 'next/headers';
import LoginForm from './login-form';

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || '';

  let subtitle = 'Đăng nhập hệ thống';
  if (host.includes('worker.hrpartner.vn')) {
    subtitle = 'Tra cứu bảng công cá nhân';
  } else if (host.includes('vendor.hrpartner.vn')) {
    subtitle = 'Cổng quản lý cung ứng nhân sự';
  } else if (host.includes('ctv.hrpartner.vn')) {
    subtitle = 'Cổng đối tác tuyển dụng';
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      {/* useSearchParams cần Suspense boundary khi prerender (Next 15) */}
      <Suspense fallback={<div className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Đang tải…</div>}>
        <LoginForm subtitle={subtitle} />
      </Suspense>
    </main>
  );
}
