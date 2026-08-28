/**
 * /login — shared identity entry point (RQ-02/07, DEC-07)
 * V5-GO-LIVE-01: single canonical origin — KHÔNG còn chọn subtitle theo subdomain.
 *
 * Form phone + password → POST /api/auth/login → redirect về landing path theo role
 * (relative, do API trả) hoặc callback đã được sanitize, mặc định /admin.
 * Lỗi hiển thị chung "Sai số điện thoại hoặc mật khẩu" — không lộ tài khoản tồn tại.
 * KHÔNG lưu password vào URL/localStorage. Design: Warm Professionalism
 * (globals.css tokens — primary #F26522, background #FAF9F7, Be Vietnam Pro).
 */
import { Suspense } from 'react';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      {/* useSearchParams cần Suspense boundary khi prerender (Next 15) */}
      <Suspense fallback={<div className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Đang tải…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
