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

export interface InvalidQueryPanelProps {
  issues: ReadonlyArray<{
    path: ReadonlyArray<string | number>;
    message: string;
    code: string;
  }>;
}

function formatPath(path: ReadonlyArray<string | number>): string {
  if (path.length === 0) return '(root)';
  return path.join('.');
}

export function InvalidQueryPanel({ issues }: InvalidQueryPanelProps): React.ReactElement {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="invalid-query-panel"
      className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900"
    >
      <h2 className="text-base font-semibold mb-2">Tham số truy vấn không hợp lệ</h2>
      <p className="text-sm mb-4">
        Tham số URL không khớp schema của E0; hệ thống đã chặn truy vấn DB và không trả
        dữ liệu để tránh kết quả sai. Hãy điều chỉnh các tham số bên dưới rồi tải lại.
      </p>
      <ul className="text-sm space-y-1.5" data-testid="invalid-query-issues">
        {issues.map((issue, idx) => (
          <li key={`${issue.code}-${idx}`} className="font-mono text-xs">
            <span className="font-semibold">{formatPath(issue.path)}</span>
            <span aria-hidden="true"> — </span>
            <span>{issue.message}</span>
            <span aria-hidden="true"> </span>
            <span className="text-amber-700">[{issue.code}]</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
