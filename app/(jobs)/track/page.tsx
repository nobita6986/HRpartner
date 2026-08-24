'use client';

// MP-2 STEP-05 (RQ-04/RQ-07): applicant self-service tracking. Looks up a safe
// status projection by tracking code via GET /api/public/applications/:code.
// DEC-02: the endpoint returns an allow-list projection only — no PII ever
// reaches this page. Unknown code → generic "not found" (no existence signal);
// 429 → rate-limit notice. The code is entered by the applicant and is NOT put
// in the URL.

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
    <div className='min-h-screen py-12 px-4' style={{ backgroundColor: 'var(--surface)' }}>
      <div className='max-w-lg mx-auto'>
        <header className='mb-8 text-center'>
          <h1 className='text-3xl font-bold mb-2' style={{ color: 'var(--on-surface)' }}>Tra cứu hồ sơ</h1>
          <p style={{ color: 'var(--on-surface-variant)' }}>Nhập mã tra cứu bạn nhận được khi nộp đơn.</p>
        </header>
        <form onSubmit={handleSubmit} className='flex gap-2 mb-6'>
          <input
            type='text'
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder='VD: APP-XXXX-XXXX'
            className='flex-1 px-3 py-2 rounded-lg border font-mono'
            style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
            aria-label='Mã tra cứu'
          />
          <button type='submit' disabled={loading} className='py-2 px-5 rounded-lg font-medium transition-colors disabled:opacity-50' style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}>
            {loading ? 'Đang tra...' : 'Tra cứu'}
          </button>
        </form>

        {error && (
          <p className='text-sm text-center' role='alert' style={{ color: 'var(--error, #dc2626)' }}>{error}</p>
        )}

        {result && (
          <div className='rounded-xl p-6 flex flex-col gap-3' style={{ backgroundColor: 'var(--primary-container)', border: '1px solid var(--outline)' }}>
            <div className='flex items-center justify-between'>
              <span className='font-mono text-sm' style={{ color: 'var(--on-surface-variant)' }}>{result.trackingCode}</span>
              <span className={'badge ' + (STATUS_TONE[result.status] ?? 'badge-neutral')}>{result.statusLabel}</span>
            </div>
            {(result.jobTitle || result.positionTitle) && (
              <div>
                <p className='font-semibold' style={{ color: 'var(--on-surface)' }}>{result.jobTitle ?? result.positionTitle}</p>
                {result.positionTitle && result.jobTitle && (
                  <p className='text-sm' style={{ color: 'var(--on-surface-variant)' }}>{result.positionTitle}</p>
                )}
              </div>
            )}
            <p className='text-sm' style={{ color: 'var(--on-surface-variant)' }}>{result.nextStep}</p>
            <p className='text-xs' style={{ color: 'var(--on-surface-variant)' }}>Ngày nộp: {formatDate(result.submittedAt)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
