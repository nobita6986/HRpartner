'use client';

import * as React from 'react';
import { useState } from 'react';

interface StatusFormProps {
  workerId: string;
  currentProfileStatus: string;
  currentEmploymentStatus: string;
  currentRiskStatus: string;
}

/**
 * Status form — cập nhật 3 field state machine.
 *
 * - profileStatus ∈ {INCOMPLETE, PENDING_VERIFY, VERIFIED, REJECTED}
 * - employmentStatus ∈ {NONE, ACTIVE, SUSPENDED, TERMINATED}
 * - riskStatus ∈ {NORMAL, REVIEW, BLOCKED}
 *
 * Label tiếng Việt; chỉ ADMIN/HR_MANAGER + CAN_VIEW_WORKER_SENSITIVE mới thấy
 * form (gate ở server-component cha).
 */
export function WorkerStatusForm({
  workerId,
  currentProfileStatus,
  currentEmploymentStatus,
  currentRiskStatus,
}: StatusFormProps) {
  const [profileStatus, setProfileStatus] = useState(currentProfileStatus);
  const [employmentStatus, setEmploymentStatus] = useState(currentEmploymentStatus);
  const [riskStatus, setRiskStatus] = useState(currentRiskStatus);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const dirty =
    profileStatus !== currentProfileStatus ||
    employmentStatus !== currentEmploymentStatus ||
    riskStatus !== currentRiskStatus;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) {
      setErr('Chưa có thay đổi trạng thái.');
      return;
    }
    setSubmitting(true);
    setErr('');
    setOk('');
    try {
      const body: Record<string, string> = {};
      if (profileStatus !== currentProfileStatus) body.profileStatus = profileStatus;
      if (employmentStatus !== currentEmploymentStatus) body.employmentStatus = employmentStatus;
      if (riskStatus !== currentRiskStatus) body.riskStatus = riskStatus;
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
      setOk('Đã cập nhật trạng thái.');
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setErr('Lỗi kết nối server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Select
          label="Hồ sơ"
          value={profileStatus}
          onChange={setProfileStatus}
          options={[
            ['INCOMPLETE', 'Chưa đủ'],
            ['PENDING_VERIFY', 'Chờ xác minh'],
            ['VERIFIED', 'Đã xác minh'],
            ['REJECTED', 'Bị từ chối'],
          ]}
        />
        <Select
          label="Làm việc"
          value={employmentStatus}
          onChange={setEmploymentStatus}
          options={[
            ['NONE', 'Chưa rõ'],
            ['ACTIVE', 'Đang làm'],
            ['SUSPENDED', 'Tạm ngưng'],
            ['TERMINATED', 'Đã nghỉ'],
          ]}
        />
        <Select
          label="Rủi ro"
          value={riskStatus}
          onChange={setRiskStatus}
          options={[
            ['NORMAL', 'Bình thường'],
            ['REVIEW', 'Cần xem xét'],
            ['BLOCKED', 'Bị chặn'],
          ]}
        />
      </div>
      {err && <p className="text-sm text-[var(--error)]">{err}</p>}
      {ok && <p className="text-sm text-[var(--primary)]">{ok}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !dirty}
          style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
          className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? 'Đang lưu…' : 'Cập nhật trạng thái'}
        </button>
      </div>
    </form>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded border px-3 py-2 text-sm"
        style={{
          borderColor: 'var(--outline)',
          background: 'var(--surface-container-lowest)',
          color: 'var(--on-surface)',
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
