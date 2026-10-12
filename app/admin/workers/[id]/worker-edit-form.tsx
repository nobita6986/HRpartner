'use client';

import * as React from 'react';
import { useState } from 'react';

interface EditFormProps {
  workerId: string;
  initial: Record<string, string | null | undefined>;
  canSeeSensitive: boolean;
  updatedAt: string | null;
}

/**
 * T1B worker edit form — dirty tracking + sensitive gate + no `*` mask submit.
 *
 * Form chỉ gửi field đã thực sự thay đổi (dirty tracking). Sensitive field
 * (CCCD, bank, issued metadata) chỉ editable khi `canSeeSensitive=true`.
 * Server reject `*` masked value với `WORKER_MASKED_INPUT_REJECTED`.
 *
 * PATCH body KHÔNG chứa `actorId`, `userId`, `accountUserId`, `workerId`,
 * `id` — server ép actorId từ session và reject các field authority khác.
 */
export function WorkerEditForm({ workerId, initial, canSeeSensitive, updatedAt }: EditFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial)) {
      out[k] = v ?? '';
    }
    return out;
  });
  const [original] = useState<Record<string, string>>(() => ({ ...values }));
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const dirty = Object.entries(values).filter(([k, v]) => v !== (original[k] ?? ''));

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [k]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dirty.length === 0) {
      setErr('Chưa có thay đổi nào để lưu.');
      return;
    }
    // Client guard: không gửi giá trị chứa '*' (server cũng reject; belt-and-suspenders).
    for (const [k, v] of dirty) {
      if (v.includes('*')) {
        setErr(`Field ${k} chứa ký tự mask "*" — không thể submit.`);
        return;
      }
    }
    setSubmitting(true);
    setErr('');
    setOk('');
    try {
      const body: Record<string, unknown> = {};
      for (const [k, v] of dirty) {
        body[k] = v === '' ? null : v;
      }
      if (updatedAt) body.expectedUpdatedAt = updatedAt;
      const r = await fetch(`/api/workers/${workerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.message ?? `Lỗi ${r.status}`);
        return;
      }
      const data = await r.json();
      setOk(`Đã lưu ${data.updatedFields?.length ?? 0} trường.`);
      // Reload page để hiển thị giá trị mới + updatedAt mới (CAS cycle tiếp theo).
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setErr('Lỗi kết nối server.');
    } finally {
      setSubmitting(false);
    }
  };

  const F = (label: string, key: string, opts?: { type?: string; sensitive?: boolean; mono?: boolean }) => {
    const isSensitive = opts?.sensitive && !canSeeSensitive;
    return (
      <div>
        <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1">
          {label}
          {opts?.sensitive && (
            <span className="ml-2 text-[10px] text-[var(--on-surface-variant)]">(sensitive)</span>
          )}
        </label>
        <input
          type={opts?.type ?? 'text'}
          value={values[key] ?? ''}
          onChange={set(key)}
          disabled={isSensitive}
          className={`w-full rounded border px-3 py-2 text-sm ${
            opts?.mono ? 'font-mono' : ''
          }`}
          style={{
            borderColor: 'var(--outline)',
            background: isSensitive ? 'var(--surface-container)' : 'var(--surface-container-lowest)',
            color: 'var(--on-surface)',
          }}
        />
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {F('Họ tên', 'fullName')}
        {F('Điện thoại', 'phone', { mono: true })}
        {F('Ngày sinh (YYYY-MM-DD)', 'dateOfBirth', { type: 'date' })}
        {F('Giới tính', 'gender')}
        {F('Hôn nhân', 'maritalStatus')}
        {F('Quốc tịch', 'nationality')}
        {F('Địa chỉ thường trú', 'permanentAddress')}
        {F('Địa chỉ hiện tại', 'currentAddress')}
        {F('Quê quán', 'hometown')}
        {F('Dân tộc', 'ethnicGroup')}
        {F('Tôn giáo', 'religion')}
        {F('Số CCCD', 'cccdNumber', { mono: true, sensitive: true })}
        {F('Ngày cấp CCCD', 'cccdIssuedDate', { type: 'date', sensitive: true })}
        {F('Nơi cấp CCCD', 'cccdIssuedPlace', { sensitive: true })}
        {F('Hạn CCCD', 'cccdExpiryDate', { type: 'date', sensitive: true })}
        {F('Mã số thuế', 'taxCode', { mono: true, sensitive: true })}
        {F('Mã BHXH', 'insuranceCode', { mono: true, sensitive: true })}
        {F('Số tài khoản', 'bankAccount', { mono: true, sensitive: true })}
        {F('Ngân hàng', 'bankName', { sensitive: true })}
        {F('Chi nhánh', 'bankBranch', { sensitive: true })}
      </div>
      {err && <p className="text-sm text-[var(--error)]">{err}</p>}
      {ok && <p className="text-sm text-[var(--primary)]">{ok}</p>}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-[var(--on-surface-variant)]">
          {dirty.length === 0
            ? 'Chưa có thay đổi.'
            : `Sẽ gửi ${dirty.length} trường: ${dirty.map(([k]) => k).join(', ')}`}
        </p>
        <button
          type="submit"
          disabled={submitting || dirty.length === 0}
          style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
          className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}
