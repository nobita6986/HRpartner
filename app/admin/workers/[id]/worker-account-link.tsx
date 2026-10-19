'use client';

import { useState, type FormEvent } from 'react';

export function WorkerAccountLink({ workerId, accountUserId }: { workerId: string; accountUserId: string | null }) {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/workers/${encodeURIComponent(workerId)}/account`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: userId.trim(), reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể liên kết tài khoản.');
      setMessage('Đã liên kết. Tải lại trang để xem trạng thái mới.');
      setUserId('');
      setReason('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể liên kết tài khoản.');
    } finally {
      setLoading(false);
    }
  }

  if (accountUserId) return <p className="text-sm">Tài khoản đăng nhập: <code>{accountUserId}</code></p>;

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <p className="text-xs text-[var(--on-surface-variant)]">Chỉ liên kết tài khoản WORKER đã tạo, cùng số điện thoại với hồ sơ; Worker phải đã xác minh, đang làm việc và có phân công hiện hành.</p>
      <label className="block text-xs">ID tài khoản WORKER
        <input required value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs">Lý do liên kết
        <input required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
      </label>
      <button disabled={loading} className="rounded bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50">
        {loading ? 'Đang liên kết…' : 'Liên kết tài khoản'}
      </button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  );
}
