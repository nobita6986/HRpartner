'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  dependencyLabel,
  dependencyLabelWithHint,
} from '@/src/domains/workforce/worker-delete-error-labels';

interface DeleteButtonProps {
  workerId: string;
  workerName: string | null;
}

/**
 * T1B Worker permanent delete (ADMIN-only).
 *
 * Quy tắc nghiệp vụ:
 *   - 409 WORKER_NOT_DELETABLE nếu còn phụ thuộc (15 bảng quét bởi service).
 *   - Chỉ xóa Worker rác / orphan (service quét 15 dependency bảng).
 *   - TERMINATED Worker vẫn phải dùng endpoint này — service KHÔNG cascade.
 *   - Idempotent theo `x-idempotency-key`.
 *   - Sau khi xóa, hiển thị banner xác nhận thành công (T1C admin-ux-hotfix 2)
 *     rồi redirect về /admin/workers.
 *   - Tất cả copy tiếng Việt; blocking facts render nhãn tiếng Việt từ
 *     `worker-delete-error-labels.ts` (không leak raw enum).
 *   - Lỗi 500 hiển thị thông báo chung — server đã log chi tiết.
 */
export function WorkerDeleteButton({ workerId, workerName }: DeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [details, setDetails] = useState<string[] | null>(null);
  const [success, setSuccess] = useState<{ userId: string; fullName: string | null } | null>(null);

  // Sau khi thông báo thành công hiện ~2.5s thì chuyển về danh sách.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      router.push('/admin/workers');
      router.refresh();
    }, 2500);
    return () => clearTimeout(timer);
  }, [success, router]);

  const submit = async () => {
    setSubmitting(true);
    setErr('');
    setDetails(null);
    try {
      const idemKey = `delete-worker-${workerId}-${Date.now()}`;
      const r = await fetch(`/api/workers/${workerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idemKey,
        },
        body: JSON.stringify({ reason }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        const code = typeof d?.error === 'string' ? d.error : '';
        if (code === 'WORKER_NOT_DELETABLE') {
          setErr(
            'Người lao động đang có phụ thuộc nghiệp vụ. Hãy hoàn tất hoặc hủy các mục liên quan trước khi xóa.',
          );
        } else if (code === 'NOT_FOUND') {
          setErr('Không tìm thấy người lao động hoặc đã bị xóa trước đó.');
        } else if (code === 'PERMISSION_DENIED') {
          setErr('Bạn không có quyền xóa người lao động.');
        } else if (r.status >= 500) {
          setErr(
            'Hệ thống gặp sự cố khi xóa. Vui lòng thử lại hoặc liên hệ quản trị viên.',
          );
        } else {
          setErr(d.message ?? `Lỗi ${r.status}`);
        }
        if (Array.isArray(d.details?.blockingFacts)) {
          setDetails(d.details.blockingFacts);
        }
        return;
      }
      // Đóng modal xác nhận + hiển thị banner thành công trước khi điều hướng.
      const deletedAt = new Date().toISOString();
      setOpen(false);
      setSuccess({
        userId: workerId,
        fullName: workerName ?? null,
      });
      // Reason giữ trong DEV/admin local — không log ra console để tránh lộ PII.
      void deletedAt;
    } catch {
      setErr('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ background: 'var(--error)', color: 'var(--on-error-container)' }}
        className="rounded px-4 py-2 text-sm font-semibold"
        data-testid="worker-delete-button"
      >
        Xóa vĩnh viễn
      </button>

      {success && (
        <div
          role="status"
          data-testid="worker-delete-success-toast"
          className="fixed inset-x-0 top-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg border p-4"
          style={{
            background: 'var(--surface-container-lowest)',
            borderColor: 'var(--primary)',
            color: 'var(--on-surface)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <span
            className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: 'var(--primary)' }}
            aria-hidden
          />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Đã xóa người lao động</p>
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-0.5 text-xs">
              {success.fullName ?? 'Người lao động'} (Mã: {success.userId}). Đang chuyển về danh sách…
            </p>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border p-6 shadow-xl"
            style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            onClick={ev => ev.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold text-[var(--on-surface)]">
              Xóa vĩnh viễn người lao động?
            </h2>
            <p className="text-sm text-[var(--on-surface-variant)] mb-3">
              <strong>{workerName ?? workerId}</strong>. Hành động này chỉ dành cho
              Worker rác / orphan (không còn hồ sơ NLĐ liên kết, không còn phân
              công dự án, không còn yêu cầu hỗ trợ, dữ liệu chấm công, bảng
              công, lịch sử quan hệ lao động, đơn ứng tuyển hay bố trí việc
              làm). Hệ thống sẽ từ chối nếu còn phụ thuộc. Không có cascade,
              không thể hoàn tác.
            </p>
            <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1">
              Lý do (bắt buộc, lưu vào nhật ký kiểm toán)
            </label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="vd: dọn dẹp bản ghi thử nghiệm, bản ghi mồ côi…"
              className="w-full rounded border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--outline)',
                background: 'var(--surface-container)',
                color: 'var(--on-surface)',
              }}
            />
            {err && (
              <div className="mt-3">
                <p className="text-sm text-[var(--error)]">{err}</p>
                {details && details.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs text-[var(--error)]">
                    {details.map(d => (
                      <li key={d} title={dependencyLabelWithHint(d as never)}>
                        {dependencyLabel(d as never)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded px-4 py-2 text-sm"
                style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || reason.trim() === ''}
                style={{ background: 'var(--error)', color: 'var(--on-error-container)' }}
                className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
                data-testid="worker-delete-confirm"
              >
                {submitting ? 'Đang xóa…' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}