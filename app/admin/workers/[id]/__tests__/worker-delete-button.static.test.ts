/**
 * worker-delete-button.static.test.ts — T1B modal xóa Worker fence.
 *
 * Khóa các invariant copy/i18n của delete button:
 *   - Modal body copy 100% tiếng Việt; không còn "LaborProfile link",
 *     "Ticket", "attendance", "payroll", "history", "submission",
 *     "placement" ở dạng thuật ngữ Anh trong UI.
 *   - Placeholder audit reason tiếng Việt.
 *   - Không render raw enum `LABOR_PROFILE` / `PROJECT_ASSIGNMENT` / ...
 *     trong markup động — phải qua `dependencyLabel`.
 *   - 4-layer defense: gọi DELETE với `x-idempotency-key`, body có `reason`,
 *     KHÔNG gọi POST.
 *   - Lỗi 500 hiển thị thông báo chung tiếng Việt (không leak `e.message`).
 *   - Lỗi 409 (WORKER_NOT_DELETABLE) hiển thị thông báo tiếng Việt có
 *     hướng xử lý + danh sách nhãn tiếng Việt (qua `dependencyLabel`).
 *   - Encoding: LF-only, UTF-8 no-BOM.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DELETE = readFileSync(
  join(process.cwd(), 'app/admin/workers/[id]/worker-delete-button.tsx'),
  'utf8',
);
const LABELS = readFileSync(
  join(process.cwd(), 'src/domains/workforce/worker-delete-error-labels.ts'),
  'utf8',
);

function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = stripComments(DELETE);
const LABEL_CODE = stripComments(LABELS);

describe('worker-delete-button — Việt hóa modal copy', () => {
  it('không còn thuật ngữ Anh thuần trong modal body / placeholder', () => {
    // Các chuỗi user-facing phải tiếng Việt.
    expect(CODE).not.toContain('LaborProfile link');
    // "Ticket" ở dạng từ đơn lẻ trong UI body bị cấm; "yêu cầu hỗ trợ" là bản dịch.
    expect(CODE).not.toMatch(/[, ]Ticket[, .]/);
    // "attendance", "payroll", "history", "submission" ở dạng standalone cũng cấm.
    expect(CODE).not.toMatch(/\battendance\b/);
    expect(CODE).not.toMatch(/\bpayroll\b/);
    expect(CODE).not.toMatch(/\bhistory\b/);
    expect(CODE).not.toMatch(/\bsubmission\b/);
    // placement có thể xuất hiện trong "bố trí việc làm" — không cấm từ tiếng Anh.
  });

  it('modal body có câu tiếng Việt mô tả orphan', () => {
    expect(CODE).toContain('Worker rác / orphan');
    expect(CODE).toContain('không thể hoàn tác');
    expect(CODE).toContain('Hệ thống sẽ từ chối nếu còn phụ thuộc');
  });

  it('audit reason placeholder tiếng Việt', () => {
    expect(CODE).toContain('dọn dẹp bản ghi thử nghiệm');
    expect(CODE).not.toContain('cleanup test row, orphan record…');
  });

  it('audit reason label giải thích là bắt buộc + ghi nhật ký kiểm toán', () => {
    expect(CODE).toContain('Lý do (bắt buộc');
    expect(CODE).toContain('nhật ký kiểm toán');
  });
});

describe('worker-delete-button — enum → label mapping', () => {
  it('import dependencyLabel / dependencyLabelWithHint từ module dictionary', () => {
    expect(CODE).toContain("from '@/src/domains/workforce/worker-delete-error-labels'");
    expect(CODE).toContain('dependencyLabel');
    expect(CODE).toContain('dependencyLabelWithHint');
  });

  it('render blocking facts qua dependencyLabel (không render raw enum)', () => {
    // Render dùng dependencyLabel(d as never); KHÔNG hiển thị trực tiếp `d` thuần.
    expect(CODE).toContain('dependencyLabel(d as never)');
    // `d}` chỉ dùng làm key cho React list, không phải text render.
    // Đảm bảo markup render text là dependencyLabel.
    expect(CODE).toMatch(/\{dependencyLabel\(/);
  });

  it('tooltip dùng dependencyLabelWithHint', () => {
    expect(CODE).toMatch(/title=\{dependencyLabelWithHint\(/);
  });
});

describe('worker-delete-button — phân loại lỗi phản hồi', () => {
  it('phân biệt 409 WORKER_NOT_DELETABLE (chặn xóa có chủ đích) vs 5xx (lỗi hệ thống)', () => {
    expect(CODE).toContain("code === 'WORKER_NOT_DELETABLE'");
    expect(CODE).toContain("code === 'NOT_FOUND'");
    expect(CODE).toContain("code === 'PERMISSION_DENIED'");
    expect(CODE).toMatch(/r\.status\s*>=\s*500/);
  });

  it('409 hiển thị thông báo tiếng Việt có hướng xử lý', () => {
    expect(CODE).toContain('đang có phụ thuộc nghiệp vụ');
    expect(CODE).toContain('Hãy hoàn tất hoặc hủy');
  });

  it('5xx KHÔNG hiển thị `d.message` thô (chống leak nội bộ)', () => {
    // Trong nhánh 5xx (`else if (r.status >= 500)`) phải dùng message cố
    // định tiếng Việt, KHÔNG dùng `d.message`.
    const match = CODE.match(/else if \(r\.status >= 500\) \{([\s\S]*?)\}/);
    expect(match).not.toBeNull();
    const block = match![1];
    expect(block).toContain('Hệ thống gặp sự cố');
    expect(block).not.toMatch(/d\.message/);
  });

  it('network error (catch) hiển thị tiếng Việt', () => {
    expect(CODE).toContain('Lỗi kết nối máy chủ');
  });
});

describe('worker-delete-button — 4-layer defense', () => {
  it('gọi DELETE với x-idempotency-key + body có reason', () => {
    expect(CODE).toContain("`/api/workers/${workerId}`");
    expect(CODE).toMatch(/method:\s*['"]DELETE['"]/);
    expect(CODE).toContain('x-idempotency-key');
    expect(CODE).toContain('JSON.stringify({ reason })');
  });

  it('KHÔNG gọi POST', () => {
    expect(CODE).not.toMatch(/method:\s*['"]POST['"]/);
  });

  it('success → banner xác nhận + redirect về /admin/workers (T1C)', () => {
    // T1C: thay vì window.location.href ngay, hiển thị banner xác nhận
    // rồi redirect sau ~2.5s. Vẫn dùng Next.js client navigation (router.push)
    // để tránh full-page reload và giữ React state.
    expect(CODE).toContain("router.push('/admin/workers')");
    expect(CODE).toContain('data-testid="worker-delete-success-toast"');
    expect(CODE).toMatch(/2500/);
    // Hard guard: KHÔNG dùng window.location.href nữa.
    expect(CODE).not.toMatch(/window\.location\.href\s*=\s*['"]\/admin\/workers['"]/);
  });
});

describe('worker-delete-error-labels — dictionary hoàn chỉnh', () => {
  it('định nghĩa đủ 15 WorkerDependencyKind', () => {
    const required = [
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
    for (const k of required) {
      expect(LABEL_CODE).toContain(k);
    }
  });

  it('mỗi entry có label tiếng Việt (không trùng enum key làm label)', () => {
    // Dictionary này OWN 11/15 kind từ canonical identifier → nhãn Vietnamese.
    // 4 kind còn lại (LABOR_PROFILE, PROJECT_ASSIGNMENT, CANDIDATE_SUBMISSION,
    // CANDIDATE_SUBMISSION_MERGED) reuse glossary — không có `label:` literal ở đây.
    // Kiểm tra một số owned entry có label literal trong file.
    expect(LABEL_CODE).toContain("label: 'Yêu cầu hỗ trợ'");
    expect(LABEL_CODE).toContain("label: 'Bảng công'");
    expect(LABEL_CODE).toContain("label: 'Sổ hoa hồng'");
    expect(LABEL_CODE).toContain("label: 'Đơn ứng tuyển (lịch sử gộp)'");
    expect(LABEL_CODE).toContain("label: 'Sự kiện chấm công'");
    // Reuse glossary → dictionary import GLOSSARY (không có literal label ở đây).
    expect(LABEL_CODE).toContain('GLOSSARY');
  });
});

describe('worker-delete-button — encoding hygiene', () => {
  it('file là LF-only, UTF-8 no-BOM', () => {
    expect(DELETE).not.toMatch(/\r\n/);
    expect(DELETE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
