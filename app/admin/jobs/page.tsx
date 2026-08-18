'use client';

import { useState } from 'react';

type Tab = 'jobs' | 'submissions' | 'claims';

interface MockJob {
  id: string;
  title: string;
  projectCode: string;
  availableSlots: number;
  totalNeeded: number;
  status: 'TUYEN_GAP' | 'DA_NHAN_DU' | 'DANG_TUYEN';
}

interface MockSubmission {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  projectName: string;
  status: string;
  createdAt: string;
}

interface MockClaim {
  id: string;
  workerName: string;
  claimType: string;
  accepted: boolean;
  acceptedBy: string | null;
  createdAt: string;
}

const MOCK_JOBS: MockJob[] = [
  { id: 'mock-1', title: 'Nhan vien san xuat', projectCode: 'DA-2026-018', availableSlots: 5, totalNeeded: 50, status: 'TUYEN_GAP' },
  { id: 'mock-2', title: 'Nhan vien kho van', projectCode: 'DA-2026-022', availableSlots: 0, totalNeeded: 80, status: 'DA_NHAN_DU' },
  { id: 'mock-3', title: 'Nhan vien hanh chinh', projectCode: 'PRJ-SV-014', availableSlots: 3, totalNeeded: 35, status: 'DANG_TUYEN' },
];

const MOCK_SUBMISSIONS: MockSubmission[] = [
  { id: 'sub-1', code: 'VD-0001', fullName: 'Nguyen Van A', phone: '0912345678', projectName: 'Nhan vien san xuat', status: 'NEW', createdAt: '2026-08-15' },
  { id: 'sub-2', code: 'VD-0002', fullName: 'Tran Thi B', phone: '0987654321', projectName: 'Nhan vien hanh chinh', status: 'QUALIFIED', createdAt: '2026-08-16' },
  { id: 'sub-3', code: 'VD-0003', fullName: 'Le Van C', phone: '0932123456', projectName: 'Nhan vien san xuat', status: 'REJECTED', createdAt: '2026-08-17' },
];

const MOCK_CLAIMS: MockClaim[] = [
  { id: 'clm-1', workerName: 'Ung vien 5678', claimType: 'HRP_DIRECT', accepted: false, acceptedBy: null, createdAt: '2026-08-15' },
  { id: 'clm-2', workerName: 'Nguyen Van A', claimType: 'HRP_DIRECT', accepted: true, acceptedBy: 'admin-1', createdAt: '2026-08-16' },
  { id: 'clm-3', workerName: 'Ung vien 3456', claimType: 'HRP_DIRECT', accepted: false, acceptedBy: null, createdAt: '2026-08-17' },
];

const STATUS_COLORS: Record<string, string> = {
  TUYEN_GAP: 'bg-red-100 text-red-700',
  DA_NHAN_DU: 'bg-green-100 text-green-700',
  DANG_TUYEN: 'bg-blue-100 text-blue-700',
  NEW: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-green-100 text-green-700',
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

export default function AdminJobsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('jobs');

  const handlePostNewJob = () => {
    alert('Post New Job - Chuc nang dang phat trien');
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
                {MOCK_JOBS.map((job, idx) => (
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
                ))}
              </tbody>
            </table>
          </div>
        )}

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
                {MOCK_SUBMISSIONS.map((sub, idx) => (
                  <tr key={sub.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                    <td className='px-4 py-3 font-mono text-sm' style={{ color: 'var(--on-surface)' }}>{sub.code}</td>
                    <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{sub.fullName}</td>
                    <td className='px-4 py-3' style={{ color: 'var(--on-surface-variant)' }}>{sub.phone}</td>
                    <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{sub.projectName}</td>
                    <td className='px-4 py-3 text-center'>
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className='px-4 py-3 text-center' style={{ color: 'var(--on-surface-variant)' }}>{sub.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
                {MOCK_CLAIMS.map((claim, idx) => (
                  <tr key={claim.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                    <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{claim.workerName}</td>
                    <td className='px-4 py-3' style={{ color: 'var(--on-surface-variant)' }}>{claim.claimType}</td>
                    <td className='px-4 py-3 text-center'>
                      {claim.accepted ? (
                        <span className='px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>Yes</span>
                      ) : (
                        <span className='px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700'>Pending</span>
                      )}
                    </td>
                    <td className='px-4 py-3' style={{ color: 'var(--on-surface-variant)' }}>{claim.acceptedBy || '-'}</td>
                    <td className='px-4 py-3 text-center' style={{ color: 'var(--on-surface-variant)' }}>{claim.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
