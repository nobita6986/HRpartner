'use client'; //

import * as React from 'react';
import { useState } from 'react';
import {
  dependencyLabel,
  dependencyLabelWithHint,
} from '@/src/domains/workforce/worker-delete-error-labels';
import type { WorkerDependencyKind } from '@/src/domains/workforce/worker.types';

interface WorkerDeleteButtonProps {
  workerId: string;
  workerName: string | null;
  workerUserId?: string;
  /** Pre-flight blocking facts — nếu có thì button chuyển sang cảnh báo, không xóa. */
  blockingFacts?: WorkerDependencyKind[];
}

/**
 * `WorkerDeleteButton` — ADMIN-only modal xóa Worker với 4-layer defense (T1B).
 *
 * Copy:
 *   - Modal body 100% tiếng Việt; cảnh báo "Worker rác / orphan" nếu còn
 *     phụ thuộc nghiệp vụ; tuyên bố "không thể hoàn tác" + hệ thống từ chối
 *     nếu còn liên kết.
 *   - Audit reason label "(bắt buộc) — ghi vào nhật ký kiểm toán", placeholder
 *     "VD: dọn dẹp bản ghi thử nghiệm, sai CCCD trầm trọng".
 *
 * 4-layer defense:
 *   1. UI: yêu cầu nhập lý do trước khi gọi API.
 *   2. Network: DELETE + `x-idempotency-key` + body `{reason}`.
 *   3. Server: route `DELETE /api/workers/[id]` chỉ cho ADMIN, sweep deps
 *      trong transaction, audit log ghi action WORKER_PERMANENT_DELETE.
 *   4. UI error: phân loại 409 (NOT_DELETABLE, danh sách blockingFacts qua
 *      `dependencyLabel`) vs 5xx (thông báo cố định tiếng Việt, KHÔNG leak
 *      `e.message`).
 *
 * KHÔNG gọi POST.
 */
export function WorkerDeleteButton({
  workerId,
  workerName,
  workerUserId,
  blockingFacts: initialBlocked = [],
}: WorkerDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [blockingFacts, setBlockingFacts] = useState<WorkerDependencyKind[]>(initialBlocked);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const hasBlockingFacts = blockingFacts.length > 0;

  const onDelete = async () => {
    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do xóa (bắt buộc — ghi vào nhật ký kiểm toán).');
      return;
    }
    setDeleting(true);
    setErrorMessage(null);
    setErrorCode(null);
    try {
      const idemKey = `${workerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const r = await fetch(`/api/workers/${workerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idemKey,
        },
        body: JSON.stringify({ reason }),
      });
      if (r.ok) {
        // T1B-OPS: thành công → redirect về /admin/workers với banner.
        window.location.href = '/admin/workers';
        return;
      }
      const j = (await r.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
        details?: { blockingFacts?: WorkerDependencyKind[] };
      };
      if (j.code === 'WORKER_NOT_DELETABLE') {
        setErrorCode('WORKER_NOT_DELETABLE');
        setErrorMessage(
          'Người lao động đang có phụ thuộc nghiệp vụ — Hệ thống sẽ từ chối nếu còn phụ thuộc. ' +
            'Hãy hoàn tất hoặc hủy các phụ thuộc trước khi xóa.',
        );
        if (j.details?.blockingFacts) setBlockingFacts(j.details.blockingFacts);
        setDeleting(false);
        return;
      }
      if (j.code === 'NOT_FOUND') {
        setErrorCode('NOT_FOUND');
        setErrorMessage('Người lao động không tồn tại hoặc đã bị xóa trước đó.');
        setDeleting(false);
        return;
      }
      if (j.code === 'PERMISSION_DENIED') {
        setErrorCode('PERMISSION_DENIED');
        setErrorMessage('Bạn không có quyền xóa vĩnh viễn người lao động.');
        setDeleting(false);
        return;
      } else if (r.status >= 500) {
        // KHÔNG leak `d.message` — dùng thông báo cố định.
        setErrorCode('INTERNAL');
        setErrorMessage('Hệ thống gặp sự cố. Vui lòng thử lại hoặc liên hệ quản trị viên.');
        setDeleting(false);
        return;
      } else {
        setErrorMessage(j.message ?? 'Xóa thất bại.');
        setDeleting(false);
      }
    } catch {
      setErrorMessage('Lỗi kết nối máy chủ. Vui lòng thử lại.');
      setDeleting(false);
    }
  };

  if (hasBlockingFacts && !open) {
    return (
      <div
        role="alert"
        style={{
          background: 'var(--error-container)',
          color: 'var(--on-error-container)',
          borderColor: 'var(--error)',
        }}
        className="rounded-lg border p-4"
      >
        <p className="text-base font-semibold">
          Không thể xóa — đang có phụ thuộc nghiệp vụ
        </p>
        <p className="mt-1 text-sm">
          {workerName} (Mã: {workerUserId}) đang có các liên kết sau. Hệ thống
          sẽ từ chối nếu còn phụ thuộc — không thể hoàn tác.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {blockingFacts.map((d) => (
            <li key={d as string}>
              <span title={dependencyLabelWithHint(d as never)}>
                {dependencyLabel(d as never)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: 'var(--error)',
          color: 'var(--on-error-container)',
        }}
        className="rounded px-4 py-2 text-sm font-semibold"
      >
        Xóa vĩnh viễn
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận xóa vĩnh viễn"
      style={{
        background: 'var(--error-container)',
        color: 'var(--on-error-container)',
        borderColor: 'var(--error)',
      }}
      className="rounded-lg border p-4"
    >
      <p className="text-base font-semibold">
        Xóa vĩnh viễn {workerName} (Mã: {workerUserId})?
      </p>
      <p className="mt-1 text-sm">
        Hành động này xóa hồ sơ, lịch sử công việc và ghi nhật ký kiểm toán
        (<code>WORKER_PERMANENT_DELETE</code>). Không thể hoàn tác. Hệ thống
        sẽ từ chối nếu còn phụ thuộc nghiệp vụ (Worker rác / orphan).
      </p>

      {hasBlockingFacts && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {blockingFacts.map((d) => (
            <li key={d as string}>
              <span title={dependencyLabelWithHint(d as never)}>
                {dependencyLabel(d as never)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium">
          Lý do (bắt buộc — sẽ được ghi vào nhật ký kiểm toán)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="VD: dọn dẹp bản ghi thử nghiệm, sai CCCD trầm trọng"
          className="w-full rounded border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--error)',
            background: 'var(--surface)',
            color: 'var(--on-surface)',
          }}
        />
      </div>

      {errorMessage && (
        <div
          role={errorCode === 'INTERNAL' ? 'alert' : 'status'}
          className="mt-3 rounded p-2 text-sm"
          style={{
            background: 'var(--surface)',
            color: 'var(--error)',
            borderColor: 'var(--error)',
          }}
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting || !reason.trim()}
          style={{ background: 'var(--error)', color: 'var(--on-error-container)' }}
          className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {deleting ? 'Đang xóa…' : 'Xác nhận xóa vĩnh viễn'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setErrorMessage(null);
            setErrorCode(null);
          }}
          disabled={deleting}
          style={{
            background: 'var(--surface)',
            color: 'var(--on-surface)',
            borderColor: 'var(--outline-variant)',
          }}
          className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}