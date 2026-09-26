'use client';

/**
 * error.tsx — Client error boundary for `/admin/recruiter-workbench`.
 *
 * Frozen contract (TASK.md AC-08, RQ-08):
 *   - Surfaces a user-visible error banner with a Retry control that calls
 *     `router.refresh()` (re-fetch the server component).
 *   - Pure UI; no fetches, no mutations. Recovery happens by triggering
 *     Next.js' segment re-render.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export interface RecruiterWorkbenchErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RecruiterWorkbenchError({
  error,
  reset,
}: RecruiterWorkbenchErrorProps): React.ReactElement {
  const router = useRouter();
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="recruiter-workbench-error"
      className="p-8 max-w-3xl mx-auto"
    >
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          <h2 className="text-base font-semibold">Đã xảy ra lỗi khi tải Recruiter Workbench</h2>
        </div>
        <p className="text-sm mb-4">
          Hệ thống không tải được danh sách. Bạn có thể thử lại; nếu lỗi tiếp diễn, vui lòng liên hệ admin.
        </p>
        <p
          className="text-xs font-mono text-red-700/80 mb-4 break-words"
          data-testid="error-message"
        >
          {error.message}
          {error.digest !== undefined ? ` (digest: ${error.digest})` : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              router.refresh();
            }}
            data-testid="error-retry"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      </div>
    </div>
  );
}
