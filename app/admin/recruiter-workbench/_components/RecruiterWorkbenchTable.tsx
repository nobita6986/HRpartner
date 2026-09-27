'use client';

/**
 * RecruiterWorkbenchTable — Presentational table that consumes the
 * server-derived DTO and renders rows. Pure render; never queries the DB,
 * never derives `nextAction`/`isOverdue`/`ageHours` itself.
 *
 * Frozen contract (TASK.md RQ-02, RQ-09, RQ-14, RQ-15, RQ-17, RQ-18):
 *   - One `<tr>` per `RecruiterWorkbenchRow`. Row key = `caseId` (deterministic).
 *   - Each row renders: candidate info, case status badge, job title,
 *     last interaction, NextActionBadge, HandlerChip, AgeCell, PrimaryActions.
 *   - Empty state uses `<EmptyState>` from `src/shared/ui/data-display`.
 *   - On mobile (≥ 360px) the table sits inside a horizontal-scrolling
 *     wrapper so it stays usable on narrow screens.
 *   - No POST/PATCH/DELETE; only `<Link>`s.
 */

import * as React from 'react';

import type {
  RecruiterWorkbenchRow,
} from '@/src/domains/talent/recruiter-workbench.types';
import { EmptyState } from '@/src/shared/ui/data-display/empty-state';

import { NextActionBadge } from './NextActionBadge';
import { AgeCell } from './AgeCell';
import { HandlerChip } from './HandlerChip';
import { PrimaryActions } from './PrimaryActions';

const CASE_STATUS_LABELS: Record<RecruiterWorkbenchRow['caseStatus'], string> = {
  OPEN: 'Đang mở',
  IN_PROGRESS: 'Đang xử lý',
  READY_TO_PLACE: 'Sẵn sàng bố trí',
  CLOSED: 'Đã đóng',
};

const CASE_STATUS_TONES: Record<
  RecruiterWorkbenchRow['caseStatus'],
  string
> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  READY_TO_PLACE: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-slate-100 text-slate-500',
};

const IDENTITY_TONES: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  UNVERIFIED: 'bg-slate-100 text-slate-600',
};

const COMPLETENESS_LABELS: Record<string, string> = {
  MINIMAL: 'Tối thiểu',
  BASIC: 'Cơ bản',
  FULL: 'Đầy đủ',
};

function formatRelativeVi(timestamp: string | null): string {
  if (timestamp === null) return '—';
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(t));
}

export interface RecruiterWorkbenchTableProps {
  items: ReadonlyArray<RecruiterWorkbenchRow>;
  /** When true, render the empty state. The page decides based on `total`. */
  forceEmpty?: boolean;
}

export function RecruiterWorkbenchTable({
  items,
  forceEmpty = false,
}: RecruiterWorkbenchTableProps): React.ReactElement {
  if (forceEmpty || items.length === 0) {
    return (
      <div data-testid="table-empty">
        <EmptyState
          title="Chưa có hồ sơ nào"
          description="Hiện chưa có case nào khớp với bộ lọc hiện tại. Hãy thử đổi view, trạng thái hoặc xóa bộ lọc quá hạn."
        />
      </div>
    );
  }
  return (
    <div
      className="overflow-x-auto rounded-xl border border-slate-200 bg-white"
      data-testid="recruiter-workbench-table"
    >
      <table className="w-full text-left text-sm text-slate-600">
        <caption className="sr-only">Danh sách recruiter workbench</caption>
        <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
          <tr>
            <th scope="col" className="px-4 py-3">
              Ứng viên
            </th>
            <th scope="col" className="px-4 py-3">
              Trạng thái
            </th>
            <th scope="col" className="px-4 py-3">
              Job / Dự án
            </th>
            <th scope="col" className="px-4 py-3">
              Tương tác gần nhất
            </th>
            <th scope="col" className="px-4 py-3">
              Hành động tiếp
            </th>
            <th scope="col" className="px-4 py-3">
              Phụ trách
            </th>
            <th scope="col" className="px-4 py-3">
              Thời gian / Quá hạn
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((row) => {
            const caseStatusTone =
              CASE_STATUS_TONES[row.caseStatus] ?? 'bg-slate-100 text-slate-700';
            const identityTone =
              IDENTITY_TONES[row.candidate.identityVerification] ??
              'bg-slate-100 text-slate-600';
            const completenessLabel =
              COMPLETENESS_LABELS[row.candidate.completeness] ??
              row.candidate.completeness;
            const lastInteractionLabel =
              row.lastInteraction.kind === null
                ? '—'
                : `${row.lastInteraction.kind === 'SUBMISSION' ? 'Hồ sơ' : 'Đổi trạng thái'} • ${formatRelativeVi(row.lastInteraction.at)}`;
            return (
              <tr
                key={row.caseId}
                data-testid="workbench-row"
                data-case-id={row.caseId}
                data-row-key={row.caseId}
                className="hover:bg-blue-50/40 focus-within:bg-blue-50/60"
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-slate-900">
                    {row.candidate.fullName ?? 'Chưa cập nhật tên'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span>{row.candidate.phone ?? '—'}</span>
                    <span aria-hidden="true"> • </span>
                    <span>CCCD: {row.candidate.cccdNumber ?? '—'}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${identityTone}`}
                      aria-label={`Xác minh danh tính: ${row.candidate.identityVerification}`}
                    >
                      {row.candidate.identityVerification}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                      {completenessLabel}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    data-testid="case-status-badge"
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${caseStatusTone}`}
                    aria-label={`Trạng thái case: ${CASE_STATUS_LABELS[row.caseStatus]}`}
                  >
                    {CASE_STATUS_LABELS[row.caseStatus]}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="text-slate-900">{row.job.jobPostingTitle ?? '—'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{row.job.projectName ?? '—'}</div>
                  <div className="text-xs text-slate-500">{row.job.companyName ?? '—'}</div>
                </td>
                <td className="px-4 py-3 align-top text-xs text-slate-700">
                  {lastInteractionLabel}
                </td>
                <td className="px-4 py-3 align-top">
                  <NextActionBadge action={row.nextAction} />
                </td>
                <td className="px-4 py-3 align-top">
                  <HandlerChip
                    assigneeName={row.handler.assigneeName}
                    source={row.handler.source}
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <AgeCell ageHours={row.ageHours} isOverdue={row.isOverdue} />
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <PrimaryActions
                    laborProfileId={row.candidate.laborProfileId}
                    fullName={row.candidate.fullName}
                    caseId={row.caseId}
                    submissionHref={row.primaryActions.submissionHref}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
