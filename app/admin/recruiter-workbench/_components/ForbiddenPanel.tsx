'use client';

/**
 * ForbiddenPanel — Render the 403 PERMISSION_DENIED state.
 *
 * Frozen contract (TASK.md RQ-09, AC-09):
 *   - Triggered when E0 returns 403 PERMISSION_DENIED. This panel is the
 *     canonical user-visible forbidden state; the page MUST NOT collapse it
 *     into the empty state (which would imply "no rows" rather than "no
 *     authority").
 *   - Pure render; no retry, no mutation.
 */

import * as React from 'react';

export interface ForbiddenPanelProps {
  /** Optional human-readable reason (e.g. "view=ALL" not allowed for HR_STAFF). */
  reason?: string;
}

export function ForbiddenPanel(_props: ForbiddenPanelProps): React.ReactElement {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="forbidden-panel"
      className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900"
    >
      <h2 className="text-base font-semibold mb-2">Không có quyền truy cập</h2>
      <p className="text-sm">
        Tài khoản của bạn hiện chưa được phép truy cập nội dung này. Nếu cho rằng đây là nhầm lẫn,
        hãy liên hệ quản trị viên.
      </p>
    </div>
  );
}
