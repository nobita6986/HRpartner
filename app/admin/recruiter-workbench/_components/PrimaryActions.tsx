'use client';

/**
 * PrimaryActions — Canonical `<Link>`s to detail and submission pages.
 *
 * Frozen contract (TASK.md AC-13, RQ-13):
 *   - `detailHref = /admin/labor-profiles/<laborProfileId>` — NO `?case=<caseId>`
 *     because `app/admin/labor-profiles/[id]/page.tsx` accepts only `params`
 *     (not `searchParams`). Adding `?case=` would create an illusion of
 *     deep-link while the destination page silently ignores it.
 *   - `submissionHref = /admin/applications` when DTO provides one — NO
 *     `?case=<caseId>`. The submission list does not yet resolve a case.
 *   - `caseId` is exposed via `data-case-id` for E1 tests but MUST NOT be
 *     appended to any URL.
 *
 * The component MUST NOT call any mutation endpoint. It only renders `<Link>`s.
 */

import * as React from 'react';
import Link from 'next/link';
import { ExternalLink, FileText } from 'lucide-react';

export interface PrimaryActionsProps {
  laborProfileId: string;
  fullName: string | null;
  caseId: string;
  submissionHref: string | null;
  /** Optional className override for the wrapping div. */
  className?: string;
}

function detailHrefFor(laborProfileId: string): string {
  // Frozen: `/admin/labor-profiles/<laborProfileId>` — NO query string.
  return `/admin/labor-profiles/${encodeURIComponent(laborProfileId)}`;
}

export function PrimaryActions({
  laborProfileId,
  fullName,
  caseId,
  submissionHref,
  className,
}: PrimaryActionsProps): React.ReactElement {
  const detailHref = detailHrefFor(laborProfileId);
  const displayName = fullName ?? 'hồ sơ';
  return (
    <div
      className={'flex items-center gap-2 ' + (className ?? '')}
      data-testid="primary-actions"
      data-case-id={caseId}
    >
      <Link
        href={detailHref}
        aria-label={`Mở chi tiết hồ sơ ${displayName}`}
        data-testid="detail-link"
        data-href={detailHref}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <ExternalLink className="w-3 h-3" aria-hidden="true" />
        Chi tiết
      </Link>
      {submissionHref !== null ? (
        <Link
          href={submissionHref}
          aria-label="Mở danh sách hồ sơ ứng tuyển"
          data-testid="submission-link"
          data-href={submissionHref}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <FileText className="w-3 h-3" aria-hidden="true" />
          Hồ sơ ứng tuyển
        </Link>
      ) : null}
    </div>
  );
}
