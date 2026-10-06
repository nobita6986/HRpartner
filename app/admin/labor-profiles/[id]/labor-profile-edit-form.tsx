'use client';

/**
 * labor-profile-edit-form.tsx — T1B Pre-P2 hotfix (DEC-P2-12).
 *
 * Client component mount từ `app/admin/labor-profiles/[id]/page.tsx`. Chỉ
 * render khi:
 *   - profile chưa liên kết Worker (`!profile.workerId`), VÀ
 *   - role thuộc writer set (`ADMIN` | `HR_MANAGER`).
 *
 * HR_STAFF → form KHÔNG mount, chỉ render read-only detail (đã làm ở page).
 *
 * Tương tác với `PATCH /api/admin/labor-profiles/[id]`:
 *   - 200 → onSaved callback (page dùng `router.refresh()`).
 *   - 400 INVALID_INPUT → render issue list inline.
 *   - 409 LABOR_PROFILE_ALREADY_LINKED → render banner "đã chuyển thành
 *     người lao động"; form khóa.
 *   - 403 FORBIDDEN → render banner "không có quyền".
 */

import * as React from 'react';
import { useState, useTransition } from 'react';

type ProfileLite = {
  id: string;
  fullName: string | null;
  phone: string | null;
  cccdNumber: string | null;
  workerId: string | null;
  completeness: string;
};

type Warning = {
  kind: 'POSSIBLE_DUPLICATE';
  signal: 'normalizedPhone' | 'cccdNumber';
  laborProfileIds: string[];
};

export interface LaborProfileEditFormProps {
  profile: ProfileLite;
  role: string;
  onSaved: () => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string; issues?: string[] }
  | { kind: 'locked'; message: string };

export function LaborProfileEditForm({ profile, role, onSaved }: LaborProfileEditFormProps) {
  const canEdit = role === 'ADMIN' || role === 'HR_MANAGER';
  const [fullName, setFullName] = useState(profile.fullName ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [cccdNumber, setCccdNumber] = useState(profile.cccdNumber ?? '');
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [, startTransition] = useTransition();

  if (!canEdit) {
    // Defense in depth: page đã gate, form cũng gate.
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.kind === 'saving') return;
    setStatus({ kind: 'saving' });
    setWarnings([]);
    try {
      const res = await fetch(`/api/admin/labor-profiles/${encodeURIComponent(profile.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          cccdNumber: cccdNumber.trim() ? cccdNumber.trim() : null,
        }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setStatus({
          kind: 'locked',
          message: data.message ?? 'Hồ sơ đã được chuyển thành người lao động; không thể chỉnh sửa.',
        });
        return;
      }
      if (res.status === 403) {
        const data = await res.json();
        setStatus({ kind: 'error', message: data.message ?? 'Không có quyền sửa hồ sơ.' });
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        const issues: string[] | undefined = Array.isArray(data?.issues)
          ? data.issues.map((i: { path?: (string | number)[]; message?: string }) => {
              const path = Array.isArray(i.path) ? i.path.join('.') : '';
              return `${path ? path + ': ' : ''}${i.message ?? ''}`.trim();
            })
          : undefined;
        setStatus({
          kind: 'error',
          message: data?.message ?? `Lỗi ${res.status}`,
          issues,
        });
        return;
      }
      const data = await res.json();
      const ws: Warning[] = Array.isArray(data?.profile?.warnings) ? data.profile.warnings : [];
      setWarnings(ws);
      setStatus({ kind: 'saved' });
      // DEC-P2-12: refresh server component page so detail blocks reflect new
      // values. Page is a Next.js server component, so window.location.reload
      // is the cleanest in-place refresh.
      startTransition(() => {
        onSaved();
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      });
    } catch {
      setStatus({ kind: 'error', message: 'Lỗi kết nối server.' });
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4"
      data-testid="labor-profile-edit-form"
      data-role={role}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Sửa thông tin hồ sơ tiếp nhận</h2>
        {profile.workerId ? (
          <span className="text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-800">
            Đã liên kết Worker (read-only)
          </span>
        ) : null}
      </div>

      {status.kind === 'locked' ? (
        <div
          className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded text-sm"
          data-testid="locked-banner"
        >
          {status.message}
        </div>
      ) : null}

      {status.kind === 'error' ? (
        <div
          className="bg-red-50 border border-red-300 text-red-700 p-3 rounded text-sm"
          data-testid="error-banner"
        >
          <p className="font-medium">{status.message}</p>
          {status.issues && status.issues.length > 0 ? (
            <ul className="mt-1 list-disc list-inside text-xs">
              {status.issues.map((iss, idx) => (
                <li key={idx}>{iss}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div
          className="bg-yellow-50 border border-yellow-300 text-yellow-900 p-3 rounded text-sm"
          data-testid="duplicate-warnings"
        >
          <p className="font-medium">Phát hiện hồ sơ có thể trùng lặp (cùng tín hiệu nhận dạng):</p>
          <ul className="mt-1 list-disc list-inside text-xs">
            {warnings.map((w, idx) => (
              <li key={idx}>
                {w.signal === 'normalizedPhone' ? 'Số điện thoại' : 'Số CCCD'}:{' '}
                {w.laborProfileIds.map((id) => (
                  <a
                    key={id}
                    href={`/admin/labor-profiles/${id}`}
                    className="underline hover:no-underline mx-1"
                  >
                    {id.slice(0, 8)}…
                  </a>
                ))}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs italic">
            Hệ thống KHÔNG tự gộp — vui lòng đối chiếu thủ công.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Họ và tên <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            maxLength={255}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Số điện thoại <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            maxLength={20}
            placeholder="VD: 0912345678"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="cccdNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Số CCCD
          </label>
          <input
            id="cccdNumber"
            name="cccdNumber"
            type="text"
            value={cccdNumber}
            onChange={(e) => setCccdNumber(e.target.value)}
            maxLength={20}
            placeholder="VD: 001099123456"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm font-mono"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={status.kind === 'saving'}
          data-testid="save-button"
          className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
        >
          {status.kind === 'saving' ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}
