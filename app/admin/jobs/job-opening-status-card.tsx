'use client';

/**
 * JobOpeningStatusCard — V6 Phase 1 STEP-04
 *
 * 4 badge đếm JobOpening theo status (DRAFT/OPEN/FILLED/CANCELLED).
 * Phía trên bảng All Jobs tại /admin/jobs.
 *
 * States:
 * - Loading: 4 shimmer placeholder (animate-pulse bg-gray-200 dark:bg-gray-700)
 * - Error: 1 dải div role=alert phía trên card
 * - Empty: 4 badge hiển thị "0"
 * - Data: 4 badge với số đếm thực
 *
 * Layout: grid 4 cột desktop (grid-cols-4), 2x2 mobile (grid-cols-2)
 *
 * Props for testing (via testData / testLoading overrides):
 * - testData: bypass useEffect fetch, use this data directly.
 * - testLoading: when set, override loading state.
 * - data: production prop (fetched via useEffect from /api/admin/job-opening-status).
 * - loading: production loading state.
 */

import { useState, useEffect } from 'react';

type StatusKey = 'DRAFT' | 'OPEN' | 'FILLED' | 'CANCELLED';

export interface JobOpeningStatusSummary {
  byStatus: Record<StatusKey, number>;
  total: number;
}

interface BadgeProps {
  label: string;
  count: number;
  colorClass: string;
}

function StatusBadge({ label, count, colorClass }: BadgeProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg p-3 ${colorClass}`}
    >
      <span className='text-2xl font-bold' style={{ color: 'var(--on-surface)' }}>
        {count}
      </span>
      <span className='text-xs font-medium mt-1' style={{ color: 'var(--on-surface-variant)' }}>
        {label}
      </span>
    </div>
  );
}

function ShimmerBadge() {
  return (
    <div className='flex flex-col items-center justify-center rounded-lg p-3'>
      <div className='h-8 w-12 rounded animate-pulse bg-gray-200 dark:bg-gray-700' />
      <div className='h-3 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mt-2' />
    </div>
  );
}

const STATUS_CONFIG: Array<{ key: StatusKey; label: string; colorClass: string }> = [
  {
    key: 'DRAFT',
    label: 'Nháp',
    colorClass: 'bg-[var(--surface-container-high)]',
  },
  {
    key: 'OPEN',
    label: 'Mở tuyển',
    colorClass: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    key: 'FILLED',
    label: 'Đã tuyển',
    colorClass: 'bg-green-50 dark:bg-green-950',
  },
  {
    key: 'CANCELLED',
    label: 'Đã hủy',
    colorClass: 'bg-gray-50 dark:bg-gray-900',
  },
];

export interface JobOpeningStatusCardProps {
  /**
   * Production data fetched from /api/admin/job-opening-status.
   * When provided (and testLoading is not true), bypasses the useEffect fetch.
   * This allows static rendering for SSR/tests without triggering the network.
   */
  data?: JobOpeningStatusSummary;
  /** Override loading state for testing. */
  testLoading?: boolean;
}

export default function JobOpeningStatusCard({
  data: dataProp,
  testLoading,
}: JobOpeningStatusCardProps = {}) {
  const [data, setData] = useState<JobOpeningStatusSummary | null>(
    dataProp !== undefined ? (dataProp ?? null) : null,
  );
  const [loading, setLoading] = useState(dataProp !== undefined ? false : true);
  const [error, setError] = useState<string | null>(null);

  // For testing: if data is passed as a prop, use it directly without fetching.
  const hasData = dataProp !== undefined;
  const isLoading = testLoading ?? loading;

  useEffect(() => {
    // If data was passed as a prop (e.g., from parent), use it directly.
    // This path is used in production when parent has already fetched the data.
    if (hasData) {
      setData(dataProp ?? null);
      setLoading(false);
      return;
    }

    // Otherwise fetch from API (production path).
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/admin/job-opening-status')
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.message ?? payload.error ?? 'Unknown error');
        }
        return res.json() as Promise<JobOpeningStatusSummary>;
      })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasData, dataProp]);

  if (error) {
    return (
      <div
        role='alert'
        className='mb-4 rounded-lg border px-4 py-3 text-sm'
        style={{ borderColor: '#f5b5b5', backgroundColor: '#fdecec', color: '#8a1c1c' }}
      >
        Không tải được trạng thái tin tuyển dụng: {error}
      </div>
    );
  }

  return (
    <div className='mb-6'>
      {/* Mobile: 2x2 grid; Desktop: 4 columns */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {isLoading
          ? STATUS_CONFIG.map((s) => <ShimmerBadge key={s.key} />)
          : STATUS_CONFIG.map((s) => (
              <StatusBadge
                key={s.key}
                label={s.label}
                count={data ? data.byStatus[s.key] : 0}
                colorClass={s.colorClass}
              />
            ))}
      </div>
    </div>
  );
}
