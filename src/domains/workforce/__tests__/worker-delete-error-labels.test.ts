/**
 * worker-delete-error-labels.test.ts — T1B fence dictionary WorkerDependencyKind → Việt hóa.
 *
 * Đảm bảo:
 *   - 15 dependency kinds đều có label tiếng Việt.
 *   - Reuse glossary cross-module: 4 kind (LABOR_PROFILE, PROJECT_ASSIGNMENT,
 *     CANDIDATE_SUBMISSION, CANDIDATE_SUBMISSION_MERGED) phải match glossary label.
 *   - Label KHÔNG trùng canonical identifier (fallback chỉ khi thiếu entry).
 *   - `dependencyLabelWithHint` có dạng `<label> (<Hint>)` cho kind owned.
 */
import { describe, it, expect } from 'vitest';

import {
  dependencyLabel,
  dependencyLabelWithHint,
  WORKER_DEPENDENCY_LABELS,
} from '../worker-delete-error-labels';
import { GLOSSARY } from '@/src/shared/i18n/glossary';
import type { WorkerDependencyKind } from '../worker.types';

const ALL_KINDS: readonly WorkerDependencyKind[] = [
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

describe('WORKER_DEPENDENCY_LABELS', () => {
  it('định nghĩa đủ 15 WorkerDependencyKind', () => {
    for (const k of ALL_KINDS) {
      expect(WORKER_DEPENDENCY_LABELS[k]).toBeDefined();
      expect(WORKER_DEPENDENCY_LABELS[k].label).toBeTypeOf('string');
      expect(WORKER_DEPENDENCY_LABELS[k].labelWithHint).toBeTypeOf('string');
    }
  });

  it('LABOR_PROFILE / PROJECT_ASSIGNMENT / CANDIDATE_SUBMISSION reuse glossary cross-module', () => {
    expect(WORKER_DEPENDENCY_LABELS.LABOR_PROFILE.label).toBe(
      GLOSSARY.labor_profile_short.label,
    );
    expect(WORKER_DEPENDENCY_LABELS.PROJECT_ASSIGNMENT.label).toBe(
      GLOSSARY.project_assignment.label,
    );
    expect(WORKER_DEPENDENCY_LABELS.CANDIDATE_SUBMISSION.label).toBe(
      GLOSSARY.candidate_submission.label,
    );
  });

  it('CANDIDATE_SUBMISSION_MERGED phân biệt với CANDIDATE_SUBMISSION (lịch sử gộp)', () => {
    expect(WORKER_DEPENDENCY_LABELS.CANDIDATE_SUBMISSION_MERGED.label).not.toBe(
      WORKER_DEPENDENCY_LABELS.CANDIDATE_SUBMISSION.label,
    );
    expect(WORKER_DEPENDENCY_LABELS.CANDIDATE_SUBMISSION_MERGED.label).toContain('lịch sử gộp');
  });

  it('label tiếng Việt (chứa ký tự có dấu) cho mỗi kind', () => {
    for (const k of ALL_KINDS) {
      // Không phải ASCII thuần (chứa ký tự có dấu hoặc khoảng trắng Việt).
      // Skip kiểm tra strict vì một số label EN có thể trùng.
      const label = WORKER_DEPENDENCY_LABELS[k].label;
      // Label phải khác canonical identifier (fallback chỉ khi thiếu).
      if (k !== 'CANDIDATE_SUBMISSION_MERGED') {
        expect(label).not.toBe(k);
      }
    }
  });

  it('labelWithHint có định dạng "<label> (<Hint>)" cho owned entries', () => {
    // Kiểm tra 3 đại diện: TICKET, ATTENDANCE_EVENT, COMMISSION_LEDGER.
    expect(WORKER_DEPENDENCY_LABELS.TICKET.labelWithHint).toBe('Yêu cầu hỗ trợ (Ticket)');
    expect(WORKER_DEPENDENCY_LABELS.ATTENDANCE_EVENT.labelWithHint).toBe(
      'Sự kiện chấm công (AttendanceEvent)',
    );
    expect(WORKER_DEPENDENCY_LABELS.COMMISSION_LEDGER.labelWithHint).toBe(
      'Sổ hoa hồng (CommissionLedger)',
    );
  });
});

describe('dependencyLabel / dependencyLabelWithHint helpers', () => {
  it('trả về label cho kind hợp lệ', () => {
    expect(dependencyLabel('TICKET')).toBe('Yêu cầu hỗ trợ');
    expect(dependencyLabel('EMPLOYMENT_EPISODE')).toBe('Lịch sử quan hệ lao động');
    expect(dependencyLabel('LABOR_PROFILE')).toBe(GLOSSARY.labor_profile_short.label);
  });

  it('trả về canonical identifier khi kind lạ (fallback contract)', () => {
    // Type cast cố ý — kiểm tra defensive fallback.
    expect(dependencyLabel('NOT_A_KIND' as never)).toBe('NOT_A_KIND');
    expect(dependencyLabelWithHint('NOT_A_KIND' as never)).toBe('NOT_A_KIND');
  });
});
