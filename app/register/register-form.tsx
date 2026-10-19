'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Mật khẩu xác nhận chưa khớp.');
    if (password.length < 8) return setError('Mật khẩu cần có ít nhất 8 ký tự.');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-hrp-client': 'web' },
        body: JSON.stringify({ fullName, phone, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message ?? 'Không thể đăng ký lúc này. Vui lòng thử lại.');
        return;
      }
      setComplete(true);
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-sm rounded-2xl p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-card)' }}>
      <div className="mb-7 text-center">
        <img src="/hrp-logo.webp" alt="HRP — Việc làm miền Bắc" className="mx-auto mb-4 h-14 w-auto" />
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-on-surface)' }}>Tạo tài khoản HRP</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>Đăng ký để ứng tuyển nhanh hơn trên HR Partner.</p>
      </div>

      {complete ? (
        <div role="status" className="space-y-4 text-center">
          <p className="text-sm" style={{ color: 'var(--color-on-surface)' }}>Đăng ký thành công. Số điện thoại chưa được xác minh OTP; tính năng cần OTP sẽ chưa sử dụng được.</p>
          <Link href="/viec-lam" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 font-semibold text-white" style={{ background: 'var(--color-primary-dark)' }}>Xem việc làm</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="register-full-name" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>Họ và tên</label>
            <input id="register-full-name" autoComplete="name" required maxLength={200} value={fullName} onChange={(event) => setFullName(event.target.value)} className="block min-h-11 w-full rounded-xl px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]" style={{ border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }} />
          </div>
          <div>
            <label htmlFor="register-phone" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>Số điện thoại</label>
            <input id="register-phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0912345678" className="block min-h-11 w-full rounded-xl px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]" style={{ border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }} />
          </div>
          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>Mật khẩu</label>
            <input id="register-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="block min-h-11 w-full rounded-xl px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]" style={{ border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }} />
          </div>
          <div>
            <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>Nhập lại mật khẩu</label>
            <input id="register-confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="block min-h-11 w-full rounded-xl px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]" style={{ border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Xác minh OTP sẽ được bổ sung sau. Tài khoản mới chưa được đánh dấu xác minh số điện thoại.</p>
          {error && <p role="alert" className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="min-h-11 w-full rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--color-primary-dark)' }}>{loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}</button>
        </form>
      )}

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>Đã có tài khoản? <Link className="font-semibold underline" href="/login" style={{ color: 'var(--color-primary-dark)' }}>Đăng nhập</Link></p>
    </section>
  );
}
