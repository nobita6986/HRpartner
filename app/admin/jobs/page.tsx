/**
 * /admin/jobs -- Admin Job Board
 *
 * Phase 5 UAT/Cutover STEP-01 (RQ-01): wire from API (no more MOCK_*).
 *
 * F00A bước 5: HR xem danh sach job, submissions, claims.
 * 3 tabs: Jobs | Submissions | Claims
 */
'use client';

import { useState, useEffect } from 'react';

type Tab = 'jobs' | 'submissions' | 'claims';

interface Job {
  id: string;
  title: string;
  projectCode: string;
  availableSlots: number;
  totalNeeded: number;
  status: 'TUYEN_GAP' | 'DA_NHAN_DU' | 'DANG_TUYEN';
}

interface Submission {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  projectName: string | null;
  status: string;
  createdAt: string;
}

interface Claim {
  id: string;
  workerId: string;
  workerName: string | null;
  claimType: string;
  accepted: boolean;
  acceptedBy: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  TUYEN_GAP: 'bg-red-100 text-red-700',
  DA_NHAN_DU: 'bg-green-100 text-green-700',
  DANG_TUYEN: 'bg-blue-100 text-blue-700',
  NEW: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-green-100 text-green-700',
  SCREENING: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-gray-100 text-gray-700',
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={'px-2 py-1 rounded-full text-xs font-medium ' + colorClass}>
      {status}
    </span>
  );
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

export default function AdminJobsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('jobs');

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState('');

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState('');

  // Claims state
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState('');

  // ── Fetch jobs (public) ────────────────────────────────────────────────
  useEffect(() => {
    setJobsLoading(true);
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((d) => {
        if (d.jobs && Array.isArray(d.jobs)) {
          setJobs(d.jobs.map((j: any) => ({
            id: j.id,
            title: j.title,
            projectCode: j.projectCode ?? j.title,
            availableSlots: j.availableSlots ?? 0,
            totalNeeded: j.totalNeeded ?? 0,
            status: j.badge ?? 'DANG_TUYEN',
          })));
        }
      })
      .catch((e) => setJobsError(String(e)))
      .finally(() => setJobsLoading(false));
  }, []);

  // ── Fetch submissions (auth required) ──────────────────────────────────
  const fetchSubmissions = () => {
    setSubmissionsLoading(true);
    fetch('/api/jobs/submissions?tab=submissions')
      .then((r) => r.json())
      .then((d) => {
        if (d.rows) setSubmissions(d.rows);
      })
      .catch((e) => setSubmissionsError(String(e)))
      .finally(() => setSubmissionsLoading(false));
  };

  // ── Fetch claims (auth required) ──────────────────────────────────────
  const fetchClaims = () => {
    setClaimsLoading(true);
    fetch('/api/jobs/submissions?tab=claims')
      .then((r) => r.json())
      .then((d) => {
        if (d.rows) setClaims(d.rows);
      })
      .catch((e) => setClaimsError(String(e)))
      .finally(() => setClaimsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'submissions') fetchSubmissions();
    else if (activeTab === 'claims') fetchClaims();
  }, [activeTab]);

  const handlePostNewJob = () => {
    alert('Post New Job — chuc nang dang phat trien (Phase 6+)');
  };

  return (
    <div className='min-h-screen p-6' style={{ backgroundColor: 'var(--surface)' }}>
      <div className='max-w-7xl mx-auto'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-3xl font-bold' style={{ color: 'var(--on-surface)' }}>
              Admin Job Board
            </h1>
            <p className='mt-1' style={{ color: 'var(--on-surface-variant)' }}>
              Quan ly tuyen dung
            </p>
          </div>
          <button
            onClick={handlePostNewJob}
            className='flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors'
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}
          >
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
            </svg>
            Post New Job
          </button>
        </div>

        <div className='flex gap-1 mb-6' style={{ borderBottom: '2px solid var(--outline)' }}>
          {(['jobs', 'submissions', 'claims'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className='px-4 py-2 font-medium transition-colors'
              style={{
                color: activeTab === tab ? 'var(--primary)' : 'var(--on-surface-variant)',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px',
              }}
            >
              {tab === 'jobs' ? 'All Jobs' : tab === 'submissions' ? 'Submissions' : 'Claims'}
            </button>
          ))}
        </div>

        {/* ── Jobs Tab ──────────────────────────────────────────────── */}
        {activeTab === 'jobs' && (
          <div className='rounded-lg overflow-hidden' style={{ border: '1px solid var(--outline)' }}>
            <table className='w-full'>
              <thead style={{ backgroundColor: 'var(--primary-container)' }}>
                <tr>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Project</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Code</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Slots</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobsLoading ? (
                  <LoadingRow cols={4} />
                ) : jobsError ? (
                  <tr><td colSpan={4} className='px-4 py-3 text-red-500 text-sm'>{jobsError}</td></tr>
                ) : jobs.length === 0 ? (
                  <tr><td colSpan={4} className='px-4 py-8 text-center text-sm' style={{ color: 'var(--on-surface-variant)' }}>Chua co job nao.</td></tr>
                ) : (
                  jobs.map((job, idx) => (
                    <tr key={job.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{job.title}</td>
                      <td className='px-4 py-3 font-mono text-sm' style={{ color: 'var(--on-surface-variant)' }}>{job.projectCode}</td>
                      <td className='px-4 py-3 text-center' style={{ color: 'var(--on-surface-variant)' }}>
                        {job.availableSlots} / {job.totalNeeded}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <StatusBadge status={job.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Submissions Tab ───────────────────────────────────────── */}
        {activeTab === 'submissions' && (
          <div className='rounded-lg overflow-hidden' style={{ border: '1px solid var(--outline)' }}>
            <table className='w-full'>
              <thead style={{ backgroundColor: 'var(--primary-container)' }}>
                <tr>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Code</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Name</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Phone</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Project</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Status</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {submissionsLoading ? (
                  <LoadingRow cols={6} />
                ) : submissionsError ? (
                  <tr><td colSpan={6} className='px-4 py-3 text-red-500 text-sm'>{submissionsError}</td></tr>
                ) : submissions.length === 0 ? (
                  <tr><td colSpan={6} className='px-4 py-8 text-center text-sm' style={{ color: 'var(--on-surface-variant)' }}>Chua co don ung tuyen nao.</td></tr>
                ) : (
                  submissions.map((sub, idx) => (
                    <tr key={sub.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                      <td className='px-4 py-3 font-mono text-sm' style={{ color: 'var(--on-surface)' }}>{sub.code ?? sub.id}</td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{sub.fullName}</td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface-variant)' }}>{sub.phone}</td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{sub.projectName ?? '-'}</td>
                      <td className='px-4 py-3 text-center'>
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className='px-4 py-3 text-center' style={{ color: 'var(--on-surface-variant)' }}>
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Claims Tab ────────────────────────────────────────────── */}
        {activeTab === 'claims' && (
          <div className='rounded-lg overflow-hidden' style={{ border: '1px solid var(--outline)' }}>
            <table className='w-full'>
              <thead style={{ backgroundColor: 'var(--primary-container)' }}>
                <tr>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Worker</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Type</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Accepted</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Accepted By</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {claimsLoading ? (
                  <LoadingRow cols={5} />
                ) : claimsError ? (
                  <tr><td colSpan={5} className='px-4 py-3 text-red-500 text-sm'>{claimsError}</td></tr>
                ) : claims.length === 0 ? (
                  <tr><td colSpan={5} className='px-4 py-8 text-center text-sm' style={{ color: 'var(--on-surface-variant)' }}>Chua co claim nao.</td></tr>
                ) : (
                  claims.map((claim, idx) => (
                    <tr key={claim.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{claim.workerName ?? claim.workerId}</td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface-variant)' }}>{claim.claimType}</td>
                      <td className='px-4 py-3 text-center'>
                        {claim.accepted ? (
                          <span className='px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>Yes</span>
                        ) : (
                          <span className='px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700'>Pending</span>
                        )}
                      </td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface-variant)' }}>{claim.acceptedBy ?? '-'}</td>
                      <td className='px-4 py-3 text-center' style={{ color: 'var(--on-surface-variant)' }}>
                        {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
