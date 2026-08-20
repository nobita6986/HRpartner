'use client';

/**
 * LoginForm (Phase 1 bcc-fence — RQ-02, DEC-07)
 * Client component: form phone + password, submit → POST /api/auth/login,
 * thành công → redirect callback/`/bcc`; thất bại → lỗi chung.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm({ subtitle = 'Đăng nhập hệ thống' }: { subtitle?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = searchParams.get('callback') ?? '/bcc';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) {
      setError('Vui lòng nhập số điện thoại và mật khẩu.');
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
        setError('Sai số điện thoại hoặc mật khẩu');
        return;
      }

      const data = await res.json();
      
      // Nếu API trả về URL đích cụ thể cho Role này (VD: https://worker.hrpartner.vn)
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }

      const safeCallback = callback.startsWith('/') && !callback.startsWith('//') ? callback : '/bcc';
      window.location.href = safeCallback;
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
        <img src="/logo.png" alt="HRP Logo" className="h-14 w-auto mx-auto mb-4" />
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-on-surface)' }}>
          Đăng nhập HRP
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
          {subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-on-surface-variant)' }}>
            Số điện thoại
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="username"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="block w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              border: '1px solid var(--color-outline-variant)',
              background: 'var(--color-surface-container-low)',
              color: 'var(--color-on-surface)',
              borderRadius: 'var(--radius-DEFAULT)',
            }}
            placeholder="0912345678"
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
            className="block w-full rounded-xl px-4 py-3 text-sm outline-none"
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
          style={{ background: 'var(--color-primary)', borderRadius: 'var(--radius-DEFAULT)' }}
        >
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
