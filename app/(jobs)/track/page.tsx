'use client';

// MP-2 STEP-05 (RQ-04/RQ-07) + go-live-13 (RQ-11/DEC-15): applicant self-service
// tracking. Looks up a safe status projection by tracking code via
// GET /api/public/applications/:code.
// Owner decision (b) of 2026-08-31 SUPERSEDES decision (a) of the same day: the
// phone and the CCCD are partially masked ON THE SERVER (phone keeps 3 leading +
// 3 trailing characters, CCCD keeps only the last 4), so the raw values are never
// part of the HTTP response and cannot be recovered with browser devtools. This
// page renders the masked strings exactly as received; it never receives the
// originals, and it must never try to reconstruct them. Full name stays verbatim
// (DEC-07). Unknown code → generic "not found" (no existence signal); 429 →
// rate-limit notice. The code is entered by the applicant and is NOT put in the URL.

import { useState } from 'react';

interface TrackingDto {
  trackingCode: string;
  status: string;
  statusLabel: string;
  nextStep: string;
  submittedAt: string | null;
  jobTitle: string | null;
  jobCode: string | null;
  positionTitle: string | null;
  fullName: string;
  phoneMasked: string | null;
  cccdMasked: string | null;
}

const STATUS_TONE: Record<string, string> = {
  NEW: 'badge-neutral',
  NEEDS_INFO: 'badge-warning',
  SCREENING: 'badge-neutral',
  QUALIFIED: 'badge-success',
  REJECTED: 'badge-neutral',
  WITHDRAWN: 'badge-neutral',
  CONVERTED: 'badge-success',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
}

export default function TrackPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<TrackingDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) { setError('Vui lòng nhập mã tra cứu.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`/api/public/applications/${encodeURIComponent(c)}`, { cache: 'no-store' });
      if (res.status === 404) { setError('Không tìm thấy hồ sơ với mã này. Vui lòng kiểm tra lại.'); return; }
      if (res.status === 429) { setError('Bạn tra cứu quá nhiều lần. Vui lòng thử lại sau ít phút.'); return; }
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) { setError(typeof data?.message === 'string' ? data.message : 'Có lỗi xảy ra, vui lòng thử lại.'); return; }
      setResult(data.application as TrackingDto);
    } catch {
      setError('Không thể kết nối máy chủ, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen px-4 py-10 sm:py-14' style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className='mx-auto max-w-2xl'>
        <header className='mb-8 text-center'>
          <h1 className='mb-2 text-3xl font-bold' style={{ color: 'var(--color-on-surface)' }}>Tra cứu hồ sơ</h1>
          <p style={{ color: 'var(--color-on-surface-variant)' }}>Nhập mã tra cứu bạn nhận được khi nộp đơn.</p>
        </header>
        <form onSubmit={handleSubmit} className='mb-6 flex flex-col gap-3 sm:flex-row'>
          <input
            type='text'
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder='VD: APP-XXXX-XXXX'
            autoComplete='off'
            spellCheck={false}
            className='min-w-0 flex-1 rounded-xl border px-4 py-3 font-mono focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
            style={{ borderColor: 'var(--color-outline)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', outlineColor: 'var(--color-primary)' }}
            aria-label='Mã tra cứu'
          />
          <button
            type='submit'
            disabled={loading || !code.trim()}
            className='min-w-32 rounded-xl px-6 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', outlineColor: 'var(--color-primary)' }}
          >
            {loading ? 'Đang tra...' : 'Tra cứu'}
          </button>
        </form>

        {error && (
          <p className='text-center text-sm' role='alert' style={{ color: 'var(--color-error, #dc2626)' }}>{error}</p>
        )}

        {result && (
          <article className='flex flex-col gap-5 rounded-2xl border p-5 shadow-sm sm:p-7' style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <span className='break-all font-mono text-sm' style={{ color: 'var(--color-on-surface-variant)' }}>{result.trackingCode}</span>
              <span className={'badge ' + (STATUS_TONE[result.status] ?? 'badge-neutral')}>{result.statusLabel}</span>
            </div>

            <section className='rounded-xl p-4' style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
              <h2 className='mb-3 text-base font-semibold' style={{ color: 'var(--color-on-surface)' }}>Thông tin hồ sơ đã nộp</h2>
              <dl className='grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2'>
                <div>
                  <dt style={{ color: 'var(--color-on-surface-variant)' }}>Họ và tên</dt>
                  <dd className='mt-0.5 font-semibold' style={{ color: 'var(--color-on-surface)' }}>{result.fullName}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-on-surface-variant)' }}>Số điện thoại</dt>
                  <dd className='mt-0.5 font-semibold' style={{ color: 'var(--color-on-surface)' }}>{result.phoneMasked || 'Không cung cấp'}</dd>
                </div>
                <div className='sm:col-span-2'>
                  <dt style={{ color: 'var(--color-on-surface-variant)' }}>Số CCCD</dt>
                  <dd className='mt-0.5 font-semibold' style={{ color: 'var(--color-on-surface)' }}>{result.cccdMasked || 'Không cung cấp'}</dd>
                </div>
              </dl>
            </section>

            {(result.jobTitle || result.positionTitle) && (
              <div>
                <p className='font-semibold' style={{ color: 'var(--color-on-surface)' }}>{result.jobTitle ?? result.positionTitle}</p>
                {result.positionTitle && result.jobTitle && (
                  <p className='text-sm' style={{ color: 'var(--color-on-surface-variant)' }}>{result.positionTitle}</p>
                )}
                {result.jobCode && <p className='mt-1 text-xs font-mono' style={{ color: 'var(--color-on-surface-variant)' }}>{result.jobCode}</p>}
              </div>
            )}
            <p className='text-sm' style={{ color: 'var(--color-on-surface-variant)' }}>{result.nextStep}</p>
            <p className='text-xs' style={{ color: 'var(--color-on-surface-variant)' }}>Ngày nộp: {formatDate(result.submittedAt)}</p>
          </article>
        )}
      </div>
    </div>
  );
}
