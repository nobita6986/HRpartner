/**
 * loading.tsx — Skeleton UI shown while `/admin/recruiter-workbench`
 * is loading (e.g. during a server-component fetch).
 *
 * Frozen contract (TASK.md AC-07):
 *   - Skeleton rows that mirror the data table structure.
 *   - Pure render; no fetches, no mutations.
 */

import * as React from 'react';

export default function RecruiterWorkbenchLoading(): React.ReactElement {
  const skeletonRows = Array.from({ length: 6 }, (_, i) => i);
  return (
    <div
      className="p-8 max-w-7xl mx-auto space-y-6"
      data-testid="recruiter-workbench-loading"
      aria-busy="true"
      aria-live="polite"
    >
      <header>
        <div className="h-8 w-64 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-96 mt-2 rounded bg-slate-100 animate-pulse" />
      </header>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-6 w-16 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
        </div>
      </div>
      <div
        className="overflow-x-auto rounded-xl border border-slate-200 bg-white"
        data-testid="skeleton-table"
      >
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
            <tr>
              {['Ứng viên', 'Trạng thái', 'Job', 'Tương tác', 'Hành động', 'Phụ trách', 'Thời gian', 'Thao tác'].map(
                (label) => (
                  <th key={label} scope="col" className="px-4 py-3">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((i) => (
              <tr key={i} className="border-b border-slate-100">
                {Array.from({ length: 8 }, (_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
