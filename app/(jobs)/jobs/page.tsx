'use client';

import { useState, useEffect } from 'react';

// Aligned with the real public projection (PublicJobDto): the apply endpoint is
// keyed by `slug` (= project.code), not by a raw project id.
interface Job {
  id: string;
  slug: string;
  title: string;
  position?: string;
  description?: string;
  isPublic?: boolean;
  availableSlots: number;
  projectCode?: string;
  location?: string | null;
  shift?: string | null;
  shifts?: ReadonlyArray<{ code: string; hours: string }>;
  totalNeeded?: number;
  totalFilled?: number;
  badge?: 'TUYEN_GAP' | 'DA_NHAN_DU' | 'DANG_TUYEN';
}

// MP-2 DEC-01/DEC-02: the canonical apply returns ONLY a safe tracking code +
// status. No submissionId / sourceClaimId / PII is exposed to the applicant.
interface ApplyResult {
  trackingCode: string;
  status: string;
}

const BADGE_CLASSES: Record<string, string> = {
  TUYEN_GAP: 'bg-red-100 text-red-700',
  DA_NHAN_DU: 'bg-green-100 text-green-700',
  DANG_TUYEN: 'bg-blue-100 text-blue-700',
};

const BADGE_LABELS: Record<string, string> = {
  TUYEN_GAP: 'Tuyen Gap',
  DA_NHAN_DU: 'Da Nhan Du',
  DANG_TUYEN: 'Dang Tuyen',
};

interface JobCardProps { job: Job; onApply: (jobId: string) => void; }

function JobCard({ job, onApply }: JobCardProps) {
  const badgeClass = job.badge ? BADGE_CLASSES[job.badge] : '';
  const badgeLabel = job.badge ? BADGE_LABELS[job.badge] : '';

  return (
    <div className='rounded-xl p-6 flex flex-col gap-4' style={{ backgroundColor: 'var(--primary-container)', border: '1px solid var(--outline)' }}>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex-1'>
          <h3 className='text-lg font-semibold' style={{ color: 'var(--on-surface)' }}>{job.title}</h3>
          {job.projectCode && <p className='text-sm' style={{ color: 'var(--on-surface-variant)' }}>{job.projectCode}</p>}
        </div>
        {badgeLabel && (
          <span className={'px-2 py-1 rounded-full text-xs font-medium ' + badgeClass}>{badgeLabel}</span>
        )}
      </div>
      {job.description && (
        <p className='text-sm line-clamp-2' style={{ color: 'var(--on-surface-variant)' }}>{job.description}</p>
      )}
      <div className='flex flex-wrap gap-2 text-sm' style={{ color: 'var(--on-surface-variant)' }}>
        {job.location && <span className='flex items-center gap-1'>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
          </svg>
          {job.location}
        </span>}
        <span className='flex items-center gap-1'>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
          </svg>
          {job.availableSlots} slots
        </span>
      </div>
      {job.shifts && job.shifts.length > 0 && (
        <div className='flex flex-wrap gap-1'>
          {job.shifts.map((shift) => (
            <span key={shift.code} className='px-2 py-0.5 text-xs rounded' style={{ backgroundColor: 'var(--surface)', color: 'var(--on-surface-variant)' }}>
              {shift.code}: {shift.hours}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={() => onApply(job.id)}
        className='mt-auto w-full py-2 px-4 rounded-lg font-medium transition-colors'
        style={{ backgroundColor: job.availableSlots > 0 ? 'var(--primary)' : 'var(--outline)', color: job.availableSlots > 0 ? 'var(--on-primary, white)' : 'var(--on-surface-variant)' }}
        disabled={job.availableSlots === 0}
      >
        {job.availableSlots > 0 ? 'Ung tuyen ngay' : 'Da dong tuyen'}
      </button>
    </div>
  );
}

interface ApplyFormProps { job: Job | null; onClose: () => void; onSuccess: (result: ApplyResult) => void; }

// DEC-07: CV is METADATA ONLY in MP-2 (file name / MIME / size). The bytes are
// never read or uploaded. MIME allow-list PDF/JPEG/PNG, max 5 MiB.
const CV_MIME_ALLOW = ['application/pdf', 'image/jpeg', 'image/png'];
const CV_MAX_BYTES = 5 * 1024 * 1024;

// Friendly copy for the server error codes the canonical apply can return.
const APPLY_ERRORS: Record<string, string> = {
  DUPLICATE_APPLICATION: 'Bạn đã ứng tuyển vị trí này rồi. Hãy dùng mã đơn để tra cứu trạng thái.',
  JOB_NOT_AVAILABLE: 'Vị trí này hiện không còn nhận hồ sơ.',
  PROJECT_NOT_PUBLIC: 'Vị trí này hiện không còn nhận hồ sơ.',
  CONSENT_REQUIRED: 'Vui lòng đồng ý cho phép xử lý thông tin.',
  IDEMPOTENCY_PAYLOAD_MISMATCH: 'Thông tin đã thay đổi so với lần gửi trước, vui lòng gửi lại.',
  IDEMPOTENCY_KEY_REQUIRED: 'Không thể gửi đơn, vui lòng tải lại trang.',
  VALIDATION: 'Vui lòng kiểm tra lại thông tin đã nhập.',
};

function ApplyForm({ job, onClose, onSuccess }: ApplyFormProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const [cv, setCv] = useState<{ fileName: string; mimeType: string; sizeBytes: number } | null>(null);
  const [cvError, setCvError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // DEC-03/04: one idempotency key per attempt. Regenerated whenever the payload
  // changes, so an identical retry replays server-side (no double-insert) while
  // an edited resubmission is treated as a new application.
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    setIdemKey(crypto.randomUUID());
  }, [fullName, phone, cccdNumber, consent, cv?.fileName, cv?.sizeBytes]);

  function handleCvPick(e: React.ChangeEvent<HTMLInputElement>) {
    setCvError('');
    const file = e.target.files?.[0];
    if (!file) { setCv(null); return; }
    if (!CV_MIME_ALLOW.includes(file.type)) { setCv(null); setCvError('Chỉ chấp nhận tệp PDF, JPEG hoặc PNG.'); return; }
    if (file.size > CV_MAX_BYTES) { setCv(null); setCvError('Tệp vượt quá 5 MB.'); return; }
    // Metadata only — do NOT read the file bytes (DEC-07).
    setCv({ fileName: file.name, mimeType: file.type, sizeBytes: file.size });
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !phone.trim()) { setError('Vui lòng điền họ tên và số điện thoại.'); return; }
    if (!consent) { setError('Vui lòng đồng ý cho phép xử lý thông tin trước khi gửi.'); return; }
    if (cvError) { setError(cvError); return; }
    if (!job) return;
    setLoading(true);
    try {
      // Canonical apply (DEC-01): slug-keyed public endpoint → SECURITY DEFINER
      // boundary. Idempotency key travels in the header; consent as a flag.
      const res = await fetch(`/api/public/jobs/${encodeURIComponent(job.slug)}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'idempotency-key': idemKey },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          cccdNumber: cccdNumber.trim() || null,
          consent: true,
          cv,
        }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        const code = typeof data?.error === 'string' ? data.error : '';
        throw new Error(APPLY_ERRORS[code] ?? (typeof data?.message === 'string' ? data.message : 'Có lỗi xảy ra, vui lòng thử lại.'));
      }
      // Report success ONLY after the server confirms (201 + tracking code).
      onSuccess({ trackingCode: String(data.trackingCode ?? ''), status: String(data.status ?? 'NEW') });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!job) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className='w-full max-w-md rounded-xl p-6' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--outline)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-lg font-semibold' style={{ color: 'var(--on-surface)' }}>Ứng tuyển: {job.title}</h3>
          <button onClick={onClose} aria-label='Đóng' className='p-1 rounded hover:bg-black/10'>
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--on-surface)' }}>Họ và tên *</label>
            <input type='text' value={fullName} onChange={(e) => setFullName(e.target.value)} className='w-full px-3 py-2 rounded-lg border' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)' }} placeholder='Nguyễn Văn A' required />
          </div>
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--on-surface)' }}>Số điện thoại *</label>
            <input type='tel' value={phone} onChange={(e) => setPhone(e.target.value)} className='w-full px-3 py-2 rounded-lg border' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)' }} placeholder='0912345678' required />
          </div>
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--on-surface)' }}>Số CCCD (không bắt buộc)</label>
            <input type='text' value={cccdNumber} onChange={(e) => setCccdNumber(e.target.value)} className='w-full px-3 py-2 rounded-lg border' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)' }} placeholder='123456789012' />
          </div>
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--on-surface)' }}>CV (PDF/JPEG/PNG, ≤ 5 MB — không bắt buộc)</label>
            <input type='file' accept='.pdf,image/jpeg,image/png' onChange={handleCvPick} className='w-full text-sm' />
            {cv && <p className='text-xs mt-1' style={{ color: 'var(--on-surface-variant)' }}>{cv.fileName} ({Math.ceil(cv.sizeBytes / 1024)} KB)</p>}
            {cvError && <p className='text-xs mt-1' style={{ color: 'var(--error, #dc2626)' }}>{cvError}</p>}
          </div>
          <label className='flex items-start gap-2 text-sm' style={{ color: 'var(--on-surface-variant)' }}>
            <input type='checkbox' checked={consent} onChange={(e) => setConsent(e.target.checked)} className='mt-1' />
            <span>Tôi đồng ý cho phép thu thập và xử lý thông tin cá nhân phục vụ mục đích tuyển dụng.</span>
          </label>
          {error && <p className='text-sm' role='alert' style={{ color: 'var(--error, #dc2626)' }}>{error}</p>}
          <button type='submit' disabled={loading} className='py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50' style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}>
            {loading ? 'Đang gửi...' : 'Gửi đơn ứng tuyển'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [successResult, setSuccessResult] = useState<ApplyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/jobs')
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        } else {
          setError('Khong the tai danh sach viec lam');
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleApply = (jobId: string) => { const job = jobs.find((j) => j.id === jobId); if (job) { setSelectedJob(job); setSuccessResult(null); } };
  const handleSuccess = (result: ApplyResult) => { setSuccessResult(result); setSelectedJob(null); };

  return (
    <div className='min-h-screen py-12 px-4' style={{ backgroundColor: 'var(--surface)' }}>
      <div className='max-w-6xl mx-auto'>
        <header className='mb-10 text-center'>
          <h1 className='text-4xl font-bold mb-2' style={{ color: 'var(--on-surface)' }}>Job Board</h1>
          <p className='text-xl' style={{ color: 'var(--on-surface-variant)' }}>Tuyen dung</p>
        </header>
        {loading ? (
          <div className='flex justify-center py-20'>
            <div className='animate-spin rounded-full h-12 w-12 border-4' style={{ borderTopColor: 'var(--primary)' }} />
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {jobs.map((job) => <JobCard key={job.id} job={job} onApply={handleApply} />)}
          </div>
        )}
      </div>
      {selectedJob && <ApplyForm job={selectedJob} onClose={() => setSelectedJob(null)} onSuccess={handleSuccess} />}
      {successResult && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className='w-full max-w-md rounded-xl p-6 text-center' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--outline)' }}>
            <div className='w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center' style={{ backgroundColor: '#dcfce7' }}>
              <svg className='w-8 h-8 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
              </svg>
            </div>
            <h3 className='text-xl font-semibold mb-2' style={{ color: 'var(--on-surface)' }}>Đã gửi đơn ứng tuyển!</h3>
            <p className='mb-1' style={{ color: 'var(--on-surface-variant)' }}>Mã tra cứu của bạn:</p>
            <p className='mb-4 text-lg font-mono font-semibold select-all' style={{ color: 'var(--on-surface)' }}>{successResult.trackingCode}</p>
            <p className='text-sm mb-6' style={{ color: 'var(--on-surface-variant)' }}>Vui lòng lưu lại mã này để tra cứu trạng thái hồ sơ. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
            <div className='flex gap-2 justify-center'>
              <a href='/track' className='py-2 px-6 rounded-lg font-medium' style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}>Tra cứu trạng thái</a>
              <button onClick={() => setSuccessResult(null)} className='py-2 px-6 rounded-lg font-medium border' style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
