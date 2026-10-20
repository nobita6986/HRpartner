'use client';

import { useEffect, useState } from 'react';

interface Status {
  configured: boolean;
  oaid: string;
  encryptionKeyConfigured: boolean;
  templateConfigured: boolean;
}

export function EtrustOtpSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [oaid, setOaid] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const response = await fetch('/api/admin/settings/etrust-otp', { cache: 'no-store' });
      const result = await response.json();
      if (response.ok) { setStatus(result.data); setOaid(result.data.oaid ?? ''); }
      else setError(result?.error?.message ?? 'Không đọc được trạng thái cấu hình.');
    } catch {
      setError('Không đọc được trạng thái cấu hình.');
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function save() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/settings/etrust-otp', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey, secretKey, oaid }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message ?? 'Không lưu được cấu hình ETrust.');
        return;
      }
      setApiKey('');
      setSecretKey('');
      setMessage('Đã lưu credentials mã hóa và Zalo OA ID. Giá trị bí mật không được hiển thị lại.');
      await refresh();
    } catch {
      setError('Không lưu được cấu hình ETrust.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 border-t pt-6" style={{ borderColor: 'var(--outline-variant)' }} aria-label="Cấu hình nhà cung cấp OTP">
      <h3 className="text-base font-semibold" style={{ color: 'var(--on-surface)' }}>Nhà cung cấp OTP ETrust</h3>
      <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
        Nhập cả API key và secret key khi cấu hình hoặc thay cặp khóa. Hệ thống mã hóa khi lưu và không trả lại giá trị đã lưu.
      </p>
      <div className="my-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}>
        Credentials: {status?.configured ? 'Đã cấu hình' : 'Chưa cấu hình'} · Khóa mã hóa máy chủ: {status?.encryptionKeyConfigured ? 'Sẵn sàng' : 'Chưa cấu hình'} · OAID/template/brandname: {status?.templateConfigured ? 'Sẵn sàng' : 'Chưa cấu hình'}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
          API key mới
          <input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }} className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3 text-sm" style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }} />
        </label>
        <label className="block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
          Secret key mới
          <input type="password" autoComplete="new-password" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }} className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3 text-sm" style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }} />
        </label>
        <label className="block text-sm font-medium md:col-span-2" style={{ color: 'var(--on-surface)' }}>
          Zalo OA ID
          <input type="text" autoComplete="off" value={oaid} onChange={(event) => setOaid(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }} className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3 text-sm" style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }} />
        </label>
      </div>
      <button type="button" onClick={save} disabled={busy || !apiKey.trim() || !secretKey.trim() || !oaid.trim()} className="mt-4 min-h-11 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--color-primary-dark)' }}>
        {busy ? 'Đang lưu…' : 'Lưu / thay cặp credentials'}
      </button>
      {message && <p role="status" className="mt-3 text-sm" style={{ color: 'var(--color-success, #087f5b)' }}>{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
      <p className="mt-3 text-xs" style={{ color: 'var(--on-surface-variant)' }}>Không dán credentials vào chat, ticket hoặc Git. Việc thay khóa sẽ có hiệu lực ngay cho các lượt gửi OTP tiếp theo.</p>
    </section>
  );
}
