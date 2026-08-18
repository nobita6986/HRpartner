'use client';

import { useState, useEffect } from 'react';

interface Job {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  availableSlots: number;
  projectCode?: string;
  location?: string;
  shifts?: ReadonlyArray<{ code: string; hours: string }>;
  totalNeeded?: number;
  totalFilled?: number;
  badge?: 'TUYEN_GAP' | 'DA_NHAN_DU' | 'DANG_TUYEN';
}

interface ApplyResult {
  submissionId: string;
  submissionCode: string;
  sourceClaimId: string;
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

function ApplyForm({ job, onClose, onSuccess }: ApplyFormProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !phone.trim()) { setError('Vui long dien day du thong tin'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: job?.id, fullName, phone, cccdNumber }) });
      const data = await res.json();
      if (!res.ok) { throw new Error(data.error || 'Co loi xay ra'); }
      onSuccess(data.submission);
    } catch (err) { setError(err instanceof Error ? err.message : 'Co loi xay ra'); }
    finally { setLoading(false); }
  };

  if (!job) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className='w-full max-w-md rounded-xl p-6' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--outline)' }}>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-lg font-semibold' style={{ color: 'var(--on-surface)' }}>Ung tuyen: {job.title}</h3>
          <button onClick={onClose} className='p-1 rounded hover:bg-black/10'>
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--on-surface)' }}>Ho va ten *</label>
            <input type='text' value={fullName} onChange={(e) => setFullName(e.target.value)} className='w-full px-3 py-2 rounded-lg border' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)' }} placeholder='Nguyen Van A' required />
          </div>
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--on-surface)' }}>So dien thoai *</label>
            <input type='tel' value={phone} onChange={(e) => setPhone(e.target.value)} className='w-full px-3 py-2 rounded-lg border' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)' }} placeholder='0912345678' required />
          </div>
          <div>
            <label className='block text-sm font-medium mb-1' style={{ color: 'var(--on-surface)' }}>So CCCD (optional)</label>
            <input type='text' value={cccdNumber} onChange={(e) => setCccdNumber(e.target.value)} className='w-full px-3 py-2 rounded-lg border' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)' }} placeholder='123456789012' />
          </div>
          {error && <p className='text-sm' style={{ color: 'var(--error, #dc2626)' }}>{error}</p>}
          <button type='submit' disabled={loading} className='py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50' style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}>
            {loading ? 'Dang gui...' : 'Gui don ung tuyen'}
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
            <h3 className='text-xl font-semibold mb-2' style={{ color: 'var(--on-surface)' }}>Don ung tuyen da duoc gui!</h3>
            <p className='mb-4' style={{ color: 'var(--on-surface-variant)' }}>Ma don: <span className='font-mono font-semibold'>{successResult.submissionCode}</span></p>
            <p className='text-sm mb-6' style={{ color: 'var(--on-surface-variant)' }}>Chung toi se lien he voi ban trong thoi gian som nhat.</p>
            <button onClick={() => setSuccessResult(null)} className='py-2 px-6 rounded-lg font-medium' style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}>Dong</button>
          </div>
        </div>
      )}
    </div>
  );
}
