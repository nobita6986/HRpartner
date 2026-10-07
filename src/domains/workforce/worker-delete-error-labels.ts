/**
 * worker-delete-error-labels.ts — T1B Wave 2 (modal xóa Worker).
 *
 * Module-owned dictionary map `WorkerDependencyKind` (15 loại phụ thuộc chặn
 * xóa vĩnh viễn Worker) sang nhãn tiếng Việt hiển thị trong modal xóa và
 * tooltip kèm technical hint.
 *
 * Authority:
 *   - Tên canonical giữ nguyên backend identifier (theo directive T0: không
 *     đổi mã lỗi/identifier backend). Dictionary này chỉ chạm UI layer.
 *   - Reuse cross-module terms từ `glossary.ts` cho 4 kind đã có (placement,
 *     project_assignment, labor_profile_short, candidate_submission).
 *   - Thêm term mới cho 11 kind còn lại: bám sát ngôn ngữ đã dùng trong UI
 *     hiện hữu (`worker-delete-button.tsx`, `worker-detail-sections`).
 *
 * Boundary:
 *   - KHÔNG đổi schema, enum, mã lỗi.
 *   - KHÔNG re-export `WorkerDependencyKind` (đã có ở `worker.types.ts`).
 *   - Helper fallback trả canonical identifier — caller coi đó là contract
 *     violation nếu render ra UI mà chưa có entry.
 */

import { GLOSSARY, type GlossaryCode } from '@/src/shared/i18n/glossary';
import type { WorkerDependencyKind } from './worker.types';

interface DependencyLabelEntry {
  /** Operator-facing Vietnamese label (binding). */
  readonly label: string;
  /**
   * Label WITH technical hint in parens — dùng cho tooltip khi cần hiện
   * identifier kỹ thuật.
   */
  readonly labelWithHint: string;
}

const GLOSSARY_REUSE: Partial<Record<WorkerDependencyKind, GlossaryCode>> = {
  LABOR_PROFILE: 'labor_profile_short',
  PROJECT_ASSIGNMENT: 'project_assignment',
  CANDIDATE_SUBMISSION: 'candidate_submission',
  // CANDIDATE_SUBMISSION_MERGED dùng entry owned để phân biệt với CANDIDATE_SUBMISSION.
};

const OWNED_LABELS: Partial<Record<WorkerDependencyKind, DependencyLabelEntry>> = {
  // LaborProfile (đã có ở glossary, short = "Hồ sơ NLĐ").
  LABOR_PROFILE: undefined,
  EMPLOYMENT_EPISODE: {
    label: 'Lịch sử quan hệ lao động',
    labelWithHint: 'Lịch sử quan hệ lao động (EmploymentEpisode)',
  },
  PROJECT_ASSIGNMENT: undefined,
  TICKET: {
    label: 'Yêu cầu hỗ trợ',
    labelWithHint: 'Yêu cầu hỗ trợ (Ticket)',
  },
  DEPENDENT: {
    label: 'Người phụ thuộc',
    labelWithHint: 'Người phụ thuộc (Dependent)',
  },
  ATTENDANCE_EVENT: {
    label: 'Sự kiện chấm công',
    labelWithHint: 'Sự kiện chấm công (AttendanceEvent)',
  },
  TIMESHEET_LINE: {
    label: 'Bảng công',
    labelWithHint: 'Bảng công (TimesheetLine)',
  },
  TIMESHEET_ADJUSTMENT: {
    label: 'Điều chỉnh bảng công',
    labelWithHint: 'Điều chỉnh bảng công (TimesheetAdjustment)',
  },
  WORKER_DEDUCTION: {
    label: 'Khoản khấu trừ lương',
    labelWithHint: 'Khoản khấu trừ lương (WorkerDeduction)',
  },
  VENDOR_STATEMENT_LINE: {
    label: 'Bảng kê đối tác',
    labelWithHint: 'Bảng kê đối tác (VendorStatementLine)',
  },
  CLIENT_STATEMENT_LINE: {
    label: 'Bảng kê khách hàng',
    labelWithHint: 'Bảng kê khách hàng (ClientStatementLine)',
  },
  COMMISSION_LEDGER: {
    label: 'Sổ hoa hồng',
    labelWithHint: 'Sổ hoa hồng (CommissionLedger)',
  },
  SOURCE_CLAIM: {
    label: 'Yêu cầu nguồn ứng viên',
    labelWithHint: 'Yêu cầu nguồn ứng viên (SourceClaim)',
  },
  CANDIDATE_SUBMISSION: undefined,
  CANDIDATE_SUBMISSION_MERGED: {
    label: 'Đơn ứng tuyển (lịch sử gộp)',
    labelWithHint: 'Đơn ứng tuyển — lịch sử gộp (CandidateSubmission.mergedWorkerId)',
  },
};

/**
 * WORKER_DEPENDENCY_LABELS — full record cho 15 kinds.
 * Lookup theo `WorkerDependencyKind`; render label tiếng Việt.
 */
export const WORKER_DEPENDENCY_LABELS: Readonly<
  Record<WorkerDependencyKind, DependencyLabelEntry>
> = (() => {
  const out = {} as Record<WorkerDependencyKind, DependencyLabelEntry>;
  const kinds: readonly WorkerDependencyKind[] = [
    'LABOR_PROFILE',
    'EMPLOYMENT_EPISODE',
    'PROJECT_ASSIGNMENT',
    'TICKET',
    'DEPENDENT',
    'ATTENDANCE_EVENT',
    'TIMESHEET_LINE',
    'TIMESHEET_ADJUSTMENT',
    'WORKER_DEDUCTION',
    'VENDOR_STATEMENT_LINE',
    'CLIENT_STATEMENT_LINE',
    'COMMISSION_LEDGER',
    'SOURCE_CLAIM',
    'CANDIDATE_SUBMISSION',
    'CANDIDATE_SUBMISSION_MERGED',
  ];
  for (const kind of kinds) {
    const glossaryCode = GLOSSARY_REUSE[kind];
    if (glossaryCode) {
      const entry = GLOSSARY[glossaryCode];
      out[kind] = {
        label: entry.label,
        labelWithHint: entry.labelWithTechnicalHint ?? entry.label,
      };
      continue;
    }
    const owned = OWNED_LABELS[kind];
    if (owned) {
      out[kind] = owned;
      continue;
    }
    // Fallback cuối cùng: canonical identifier. Caller coi là contract violation.
    out[kind] = { label: kind, labelWithHint: kind };
  }
  return out;
})();

/** Lookup nhãn tiếng Việt cho `WorkerDependencyKind`. */
export function dependencyLabel(kind: WorkerDependencyKind): string {
  return WORKER_DEPENDENCY_LABELS[kind]?.label ?? kind;
}

/** Lookup nhãn tiếng Việt kèm technical hint (dùng cho tooltip). */
export function dependencyLabelWithHint(kind: WorkerDependencyKind): string {
  return WORKER_DEPENDENCY_LABELS[kind]?.labelWithHint ?? kind;
}
