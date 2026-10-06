'use client';

import * as React from 'react';
import { useState } from 'react';

interface DeleteButtonProps {
  workerId: string;
  workerName: string | null;
}

/**
 * T1B Worker permanent delete (ADMIN-only).
 *
 * Quy tắc nghiệp vụ:
 *   - 409 WORKER_NOT_DELETABLE nếu còn LaborProfile/Assignment/Ticket/...
 *   - Chỉ xóa "Worker rác / orphan" (service quét 15 dependency bảng).
 *   - TERMINATED Worker vẫn phải dùng endpoint này — service KHÔNG cascade.
 *   - Idempotent theo `x-idempotency-key`.
 *   - Sau khi xóa, redirect về /admin/workers.
 */
export function WorkerDeleteButton({ workerId, workerName }: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [details, setDetails] = useState<string[] | null>(null);

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
        setErr(d.message ?? `Lỗi ${r.status}`);
        if (Array.isArray(d.details?.blockingFacts)) {
          setDetails(d.details.blockingFacts);
        }
        return;
      }
      // Success → redirect về list.
      window.location.href = '/admin/workers';
    } catch {
      setErr('Lỗi kết nối server.');
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
              <strong>{workerName ?? workerId}</strong>. Hành động này CHỈ dành cho Worker rác /
              orphan (không có LaborProfile link, không có phân công dự án, không có Ticket,
              attendance, payroll, history, submission, placement). Service sẽ từ chối nếu
              còn phụ thuộc. Không có cascade, không thể hoàn tác.
            </p>
            <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1">
              Lý do (audit)
            </label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="vd: cleanup test row, orphan record…"
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
                      <li key={d}>{d}</li>
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
