'use client';

/**
 * InvalidQueryPanel — Render the explicit-invalid-query validation state.
 *
 * Frozen contract (TASK.md RQ-21, AC-01):
 *   - Triggered ONLY when E0 zod parse fails on EXPLICIT user input.
 *   - MUST NOT collapse into the empty state (the empty state implies
 *     "no rows", which would mislead the user). This panel surfaces the
 *     field-level issues so the user can fix the URL.
 *   - The page must NOT have called `getRecruiterWorkbenchList` in this branch.
 */

import * as React from 'react';
import Link from 'next/link';

export interface InvalidQueryPanelProps {
  issues: ReadonlyArray<{
    path: ReadonlyArray<string | number>;
    message: string;
    code: string;
  }>;
}

export function InvalidQueryPanel({ issues }: InvalidQueryPanelProps): React.ReactElement {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="invalid-query-panel"
      className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900"
    >
      <h2 className="text-base font-semibold mb-2">Bộ lọc chưa hợp lệ</h2>
      <p className="text-sm mb-4">
        {issues.length === 1
          ? 'Có một bộ lọc không phù hợp với dữ liệu hiện có.'
          : 'Có một số bộ lọc không phù hợp với dữ liệu hiện có.'}{' '}
        Hãy xóa bộ lọc và thử lại.
      </p>
      <Link
        href="/admin/recruiter-workbench"
        className="inline-flex min-h-11 items-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white underline-offset-4 hover:underline"
      >
        Xóa bộ lọc
      </Link>
    </div>
  );
}
