'use client';

/**
 * LoginForm — shared identity entry point (RQ-02, DEC-07, hrp-bi-worker-sync-v1 DEC-05)
 * Client component: form CCCD / phone + password, submit → POST /api/auth/login,
 * hỗ trợ bước đổi mật khẩu bắt buộc lần đầu (mustChangePassword) trước khi chuyển hướng.
 */
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  INTERNAL_FALLBACK_PATH,
  sanitizeCallbackPath,
} from '@/src/shared/routing/portal-landing';

export default function LoginForm({ subtitle = 'Đăng nhập hệ thống' }: { subtitle?: string }) {
  const searchParams = useSearchParams();
  const callback = searchParams.get('callback') ?? INTERNAL_FALLBACK_PATH;

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // State cho bước đổi mật khẩu lần đầu (mustChangePassword = true)
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [pendingRedirectTarget, setPendingRedirectTarget] = useState(INTERNAL_FALLBACK_PATH);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) {
      setError('Vui lòng nhập số CCCD/số điện thoại và mật khẩu.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        if (res.status === 429 && errJson?.message) {
          setError(errJson.message);
        } else {
          setError('Sai số CCCD/số điện thoại hoặc mật khẩu');
        }
        return;
      }

      const data = await res.json();

      // V5-GO-LIVE-01 (DEC-06): mọi đích đến phải là đường dẫn same-origin bắt đầu bằng
      // đúng một '/'.
      const target =
        sanitizeCallbackPath(data.redirectTo) ??
        sanitizeCallbackPath(callback) ??
        INTERNAL_FALLBACK_PATH;

      if (data.mustChangePassword) {
        setPendingRedirectTarget(target);
        setMustChangePassword(true);
        return;
      }

      window.location.href = target;
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeFirstPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword === password) {
      setError('Mật khẩu mới phải khác mật khẩu ban đầu.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentPassword: password,
          newPassword,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
        return;
      }
      window.location.href = pendingRedirectTarget;
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-sm rounded-2xl p-8"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        boxShadow: 'var(--shadow-card)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="text-center mb-8">
        <img src="/hrp-logo.webp" alt="HRP — Việc làm miền Bắc" className="h-14 w-auto mx-auto mb-4" />
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-on-surface)' }}>
          {mustChangePassword ? 'Đổi mật khẩu lần đầu' : 'Đăng nhập HRP'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
          {mustChangePassword
            ? 'Vì lý do bảo mật, vui lòng đặt mật khẩu mới cho tài khoản của bạn.'
            : subtitle}
        </p>
      </div>

      {mustChangePassword ? (
        <form onSubmit={handleChangeFirstPassword} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              Mật khẩu mới (tối thiểu 8 ký tự)
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full rounded-xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              style={{
                border: '1px solid var(--color-outline-variant)',
                background: 'var(--color-surface-container-low)',
                color: 'var(--color-on-surface)',
                borderRadius: 'var(--radius-DEFAULT)',
              }}
              placeholder="Nhập mật khẩu mới"
            />
          </div>

          <div>
            <label
              htmlFor="confirmNewPassword"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              Xác nhận mật khẩu mới
            </label>
            <input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="block w-full rounded-xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              style={{
                border: '1px solid var(--color-outline-variant)',
                background: 'var(--color-surface-container-low)',
                color: 'var(--color-on-surface)',
                borderRadius: 'var(--radius-DEFAULT)',
              }}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          {error && (
            <div
              className="text-sm px-4 py-3 rounded-xl"
              style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-primary-dark)', borderRadius: 'var(--radius-DEFAULT)' }}
          >
            {loading ? 'Đang lưu mật khẩu…' : 'Cập nhật mật khẩu & Tiếp tục'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-on-surface-variant)' }}>
              Số CCCD hoặc Số điện thoại
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full rounded-xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              style={{
                border: '1px solid var(--color-outline-variant)',
                background: 'var(--color-surface-container-low)',
                color: 'var(--color-on-surface)',
                borderRadius: 'var(--radius-DEFAULT)',
              }}
              placeholder="Nhập 12 số CCCD hoặc SĐT"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-on-surface-variant)' }}>
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              style={{
                border: '1px solid var(--color-outline-variant)',
                background: 'var(--color-surface-container-low)',
                color: 'var(--color-on-surface)',
                borderRadius: 'var(--radius-DEFAULT)',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-xl" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            // t1b-public-theme-picker-contrast (RQ-04, C7): bg P → PD.
            style={{ background: 'var(--color-primary-dark)', borderRadius: 'var(--radius-DEFAULT)' }}
          >
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      )}
    </div>
  );
}
