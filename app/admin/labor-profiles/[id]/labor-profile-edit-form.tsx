'use client';

/**
 * labor-profile-edit-form.tsx — T1B Pre-P2 hotfix (DEC-P2-12) + v1.1
 * PR #110 correction 1/1.
 *
 * Client component mount từ `app/admin/labor-profiles/[id]/page.tsx`. Chỉ
 * render khi:
 *   - profile chưa liên kết Worker (`!profile.workerId`), VÀ
 *   - role thuộc writer set (`ADMIN` | `HR_MANAGER`), VÀ
 *   - actor có quyền `CAN_VIEW_WORKER_SENSITIVE` (v1.1).
 *
 * Tương tác với `PATCH /api/admin/labor-profiles/[id]`:
 *   - 200 → refresh server component page (useRouter().refresh(), v1.1).
 *   - 400 INVALID_INPUT → render issue list inline.
 *   - 409 LABOR_PROFILE_ALREADY_LINKED → render banner "đã chuyển thành
 *     người lao động"; form khóa.
 *   - 403 FORBIDDEN → render banner "không có quyền".
 *
 * v1.1 (PR #110 correction 1/1):
 *   - Bỏ prop `onSaved` (Server Component không thể truyền function cho
 *     Client Component — sai kiến trúc). Form tự refresh bằng
 *     `useRouter().refresh()`.
 *   - **Dirty tracking**: chỉ gửi field user thực sự sửa (so với initial
 *     values từ DB). Field không dirty → KHÔNG gửi → không thể vô tình
 *     ghi đè phone/CCCD thật bằng giá trị đã mask.
 *   - **UI gate**: nếu `canSeeSensitive === false` (admin chưa grant
 *     CAN_VIEW_WORKER_SENSITIVE cho HR_MANAGER) → ẩn hoàn toàn nút Lưu +
 *     khóa input.
 *   - PATCH body vẫn chỉ fullName/phone/cccdNumber; KHÔNG gửi field nào
 *     không dirty → route zod `.refine()` reject `{}` (400) — đó là
 *     signal "user không sửa gì", không thể submit.
 */

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  /**
   * v1.1: viewer có quyền xem dữ liệu nhạy cảm (`CAN_VIEW_WORKER_SENSITIVE`)
   * không. Nếu false → form vẫn mount (để read-only) nhưng KHÔNG cho phép
   * submit; defense in depth với route check.
   */
  canSeeSensitive: boolean;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string; issues?: string[] }
  | { kind: 'locked'; message: string };

const MASK_RE = /\*/;

export function LaborProfileEditForm({ profile, role, canSeeSensitive }: LaborProfileEditFormProps) {
  const router = useRouter();
  const canEditRole = role === 'ADMIN' || role === 'HR_MANAGER';
  // v1.1: writer role AND canSeeSensitive permission both required.
  const canEdit = canEditRole && canSeeSensitive;
  const [fullName, setFullName] = useState(profile.fullName ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [cccdNumber, setCccdNumber] = useState(profile.cccdNumber ?? '');
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  // v1.1: dirty tracking — so với initial values từ DB (đã được mask nếu
  // !canSeeSensitive). Field nào user không sửa → KHÔNG gửi → không thể
  // vô tình ghi đè giá trị thật.
  const initial = React.useMemo(
    () => ({
      fullName: profile.fullName ?? '',
      phone: profile.phone ?? '',
      cccdNumber: profile.cccdNumber ?? '',
    }),
    [profile.fullName, profile.phone, profile.cccdNumber],
  );

  const dirty: { fullName: boolean; phone: boolean; cccdNumber: boolean } = {
    fullName: fullName !== initial.fullName,
    phone: phone !== initial.phone,
    cccdNumber: cccdNumber !== initial.cccdNumber,
  };
  const anyDirty = dirty.fullName || dirty.phone || dirty.cccdNumber;

  if (!canEditRole) {
    // Defense in depth: page đã gate, form cũng gate.
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.kind === 'saving') return;
    if (!canEdit) {
      setStatus({
        kind: 'error',
        message:
          'Bạn không có quyền CAN_VIEW_WORKER_SENSITIVE — không thể sửa Hồ sơ tiếp nhận (tránh submit ngược dữ liệu phone/CCCD đã bị mask).',
      });
      return;
    }
    if (!anyDirty) {
      setStatus({
        kind: 'error',
        message: 'Bạn chưa thay đổi trường nào. Hãy sửa ít nhất một trường trước khi lưu.',
      });
      return;
    }
    // v1.1: belt-and-suspenders — chặn masked-shape submit ở client.
    // Server vẫn enforce nhưng UX sẽ tốt hơn nếu reject ngay.
    if (MASK_RE.test(phone) || MASK_RE.test(cccdNumber)) {
      setStatus({
        kind: 'error',
        message:
          'Giá trị phone hoặc CCCD chứa ký tự "*" (mask) — không thể gửi. Vui lòng nhập giá trị thật.',
      });
      return;
    }

    setStatus({ kind: 'saving' });
    setWarnings([]);

    // v1.1: chỉ gửi field dirty → không có nguy cơ submit masked value.
    const body: Record<string, string | null> = {};
    if (dirty.fullName) body.fullName = fullName.trim();
    if (dirty.phone) body.phone = phone.trim();
    if (dirty.cccdNumber) body.cccdNumber = cccdNumber.trim() ? cccdNumber.trim() : null;

    try {
      const res = await fetch(`/api/admin/labor-profiles/${encodeURIComponent(profile.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      // v1.1: bỏ prop `onSaved` — form tự refresh server component page.
      router.refresh();
    } catch {
      setStatus({ kind: 'error', message: 'Lỗi kết nối server.' });
    }
  };

  // v1.1: khi !canSeeSensitive, render form read-only (vẫn cho user thấy giá
  // trị mask, không cho save).
  const inputsDisabled = !canEdit || status.kind === 'saving';

  return (
    <form
      onSubmit={submit}
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4"
      data-testid="labor-profile-edit-form"
      data-role={role}
      data-can-see-sensitive={canSeeSensitive ? 'true' : 'false'}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Sửa thông tin hồ sơ tiếp nhận</h2>
        {profile.workerId ? (
          <span className="text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-800">
            Đã liên kết Worker (read-only)
          </span>
        ) : null}
        {!canSeeSensitive ? (
          <span
            className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600"
            title="Bạn không có quyền CAN_VIEW_WORKER_SENSITIVE; không thể sửa Hồ sơ tiếp nhận."
          >
            Không có quyền sửa
          </span>
        ) : null}
      </div>

      {!canSeeSensitive ? (
        <div
          className="bg-gray-50 border border-gray-200 text-gray-700 p-3 rounded text-sm"
          data-testid="no-sensitive-banner"
        >
          Bạn không có quyền <code>CAN_VIEW_WORKER_SENSITIVE</code>. Form ở chế độ chỉ đọc để tránh
          vô tình ghi đè giá trị thật của <strong>Số điện thoại</strong> hoặc <strong>Số CCCD</strong> bằng
          chuỗi đã bị che (mask). Liên hệ Admin để được cấp quyền.
        </div>
      ) : null}

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

      {status.kind === 'saved' ? (
        <div
          className="bg-green-50 border border-green-300 text-green-800 p-3 rounded text-sm"
          data-testid="saved-banner"
        >
          Đã lưu thay đổi.
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
            disabled={inputsDisabled}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-300 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
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
            disabled={inputsDisabled}
            placeholder="VD: 0912345678"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-300 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
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
            disabled={inputsDisabled}
            placeholder="VD: 001099123456"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-300 text-sm font-mono disabled:bg-gray-300 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={inputsDisabled || !anyDirty}
          data-testid="save-button"
          className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status.kind === 'saving' ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}