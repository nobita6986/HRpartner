'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OpenSlotOption {
  slotId: string;
  positionCode: string;
  positionTitle: string;
  workLocation: string | null;
  slotsNeeded: number;
  slotsFilled: number;
  remaining: number;
  staffingOrderId: string;
  staffingOrderCode: string;
  staffingOrderTitle: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  projectQuota: number;
  projectFilled: number;
  projectRemaining: number;
}

interface ActiveAssignmentSummary {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  staffingOrderId: string | null;
  staffingOrderSlotId: string | null;
  employeeCode: string;
  employmentType: string;
  workSetting: string | null;
  validFrom: string;
}

interface LinkedWorkerSummary {
  id: string;
  userId: string;
  fullName: string | null;
  phone: string | null;
  profileStatus: string;
  employmentStatus: string;
  accountUserId: string | null;
  activeAssignment: ActiveAssignmentSummary | null;
}

interface CandidateUserOption {
  id: string;
  name: string | null;
  phone: string | null;
  phoneVerified: boolean;
  isActive: boolean;
  matchedByPhone: boolean;
}

interface LaborProfileOnboardingContext {
  laborProfile: {
    id: string;
    fullName: string | null;
    phone: string | null;
    cccdNumber: string | null;
    identityVerification: string;
    completeness: string;
    workerId: string | null;
  };
  linkedWorker: LinkedWorkerSummary | null;
  matchingWorkers: LinkedWorkerSummary[];
  linkedUser: CandidateUserOption | null;
  matchingUsers: CandidateUserOption[];
  openSlots: OpenSlotOption[];
}

export function LaborProfileAccountOnboarding({
  laborProfileId,
  role,
}: {
  laborProfileId: string;
  role: string;
}) {
  const router = useRouter();
  const isAdmin = role === 'ADMIN';

  const [ctx, setCtx] = useState<LaborProfileOnboardingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingOnly, setVerifyingOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [issuedTempPassword, setIssuedTempPassword] = useState<{
    phone: string;
    password: string;
  } | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [createAccountIfMissing, setCreateAccountIfMissing] = useState<boolean>(true);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [employeeCode, setEmployeeCode] = useState<string>('');
  const [employmentType, setEmploymentType] = useState<'HRP_EMPLOYED' | 'OUTSOURCED' | 'REFERRED_OUT'>('HRP_EMPLOYED');
  const [workSetting, setWorkSetting] = useState<'PHOTHONG' | 'CONGXUONG' | 'VANPHONG'>('PHOTHONG');
  const [replaceActiveAssignment, setReplaceActiveAssignment] = useState<boolean>(false);
  const [reason, setReason] = useState<string>(
    'Admin xác thực tài khoản đăng nhập App, phê duyệt ứng viên thành NLĐ HRP và phân công dự án',
  );

  const loadContext = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/labor-profiles/${laborProfileId}/onboarding`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? 'Không thể tải thông tin tài khoản đăng nhập & phê duyệt NLĐ.');
        return;
      }
      setCtx(json);

      // Auto-select matched user by phone or linked user
      if (json.linkedUser) {
        setSelectedUserId(json.linkedUser.id);
        setCreateAccountIfMissing(false);
      } else {
        const phoneMatchedUser = (json.matchingUsers ?? []).find(
          (u: CandidateUserOption) => u.matchedByPhone,
        );
        if (phoneMatchedUser) {
          setSelectedUserId(phoneMatchedUser.id);
          setCreateAccountIfMissing(false);
        } else {
          setSelectedUserId('');
          setCreateAccountIfMissing(Boolean(json.laborProfile?.phone));
        }
      }

      if (json.linkedWorker) {
        setSelectedWorkerId(json.linkedWorker.id);
        if (json.linkedWorker.activeAssignment?.employeeCode) {
          setEmployeeCode(json.linkedWorker.activeAssignment.employeeCode);
        } else {
          setEmployeeCode(json.linkedWorker.userId);
        }
      } else if ((json.matchingWorkers ?? []).length === 1) {
        setSelectedWorkerId(json.matchingWorkers[0].id);
        setEmployeeCode(json.matchingWorkers[0].userId);
      } else {
        const suffix = String(json.laborProfile?.phone ?? '')
          .replace(/\D/g, '')
          .slice(-4);
        setEmployeeCode(`NV-${suffix || '0001'}`);
      }
    } catch {
      setError('Lỗi kết nối khi tải thông tin phê duyệt NLĐ.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, laborProfileId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  if (!isAdmin) {
    return null;
  }

  const phoneMatchedUser =
    ctx?.linkedUser ??
    ctx?.matchingUsers.find((u) => u.id === selectedUserId) ??
    ctx?.matchingUsers.find((u) => u.matchedByPhone) ??
    null;

  async function handleQuickVerifyPhone(user: CandidateUserOption) {
    setVerifyingOnly(true);
    setError(null);
    setSuccessBanner(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason:
            reason.trim() ||
            'Admin xác nhận SĐT thủ công cho tài khoản đăng nhập App từ hồ sơ ứng viên',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? 'Không thể xác minh SĐT thủ công.');
        return;
      }
      setSuccessBanner(
        `Đã xác minh SĐT thủ công cho tài khoản đăng nhập App (${user.phone ?? user.id}).`,
      );
      await loadContext();
      router.refresh();
    } catch {
      setError('Lỗi kết nối khi xác minh SĐT thủ công.');
    } finally {
      setVerifyingOnly(false);
    }
  }

  async function handleOnboardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ctx) return;
    if (selectedSlotId && !employeeCode.trim()) {
      setError('Vui lòng nhập Mã nhân viên tại dự án khi chọn vị trí phân công.');
      return;
    }
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do kiểm toán.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessBanner(null);
    setIssuedTempPassword(null);

    try {
      const res = await fetch(`/api/admin/labor-profiles/${laborProfileId}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId || null,
          createAccountIfMissing: !selectedUserId && createAccountIfMissing,
          verifyPhone: true,
          workerId: selectedWorkerId || null,
          slotId: selectedSlotId || null,
          employeeCode: selectedSlotId ? employeeCode.trim() : null,
          employmentType: selectedSlotId ? employmentType : null,
          workSetting: selectedSlotId ? workSetting : null,
          replaceActiveAssignment,
          allowPhoneUpdate: true,
          reason: reason.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? 'Không thể phê duyệt và phân công người lao động.');
        return;
      }

      if (json.temporaryPassword) {
        setIssuedTempPassword({
          phone: ctx.laborProfile.phone ?? '',
          password: json.temporaryPassword,
        });
      }

      const parts: string[] = [
        `Đã duyệt hồ sơ NLĐ ${json.workerCode} (${json.profileStatus} / ${json.employmentStatus})`,
      ];
      if (json.phoneVerified) {
        parts.push('đã xác thực tài khoản đăng nhập App');
      }
      if (json.assignment) {
        parts.push(
          `đã gán vào dự án ${json.assignment.projectCode} — ${json.assignment.projectName} (Mã NV: ${json.assignment.employeeCode})`,
        );
      }
      setSuccessBanner(parts.join(', ') + '.');
      await loadContext();
      router.refresh();
    } catch {
      setError('Lỗi kết nối khi thực hiện phê duyệt NLĐ.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Quản trị Tài khoản đăng nhập App và Phê duyệt NLĐ HRP"
      className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/40 p-6 shadow-sm space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-indigo-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              QUYỀN KIỂM SOÁT ADMIN
            </span>
            <h2 className="text-lg font-bold text-gray-900">
              Tài khoản đăng nhập App &amp; Phê duyệt Người lao động HRP
            </h2>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Kiểm soát toàn trình từ Hồ sơ ứng viên: (1) Xác thực SĐT cho tài khoản đăng nhập App
            trên điện thoại &rarr; (2) Khởi tạo / Liên kết hồ sơ Người lao động chính thức (
            <code className="font-mono">USR-EMP-xxx</code>) &rarr; (3) Gán trực tiếp vào Dự án /
            Đơn hàng đang mở.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/admin/users"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Quản lý Tài khoản App
          </Link>
          {ctx?.linkedWorker ? (
            <Link
              href={`/admin/workers/${ctx.linkedWorker.id}`}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
            >
              Mở hồ sơ NLĐ ({ctx.linkedWorker.userId})
            </Link>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">
          Đang kiểm tra trạng thái tài khoản đăng nhập App và hồ sơ NLĐ...
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {successBanner ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          {successBanner}
        </div>
      ) : null}

      {issuedTempPassword ? (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
          <p className="font-bold">
            Đã tạo mới tài khoản đăng nhập App cho SĐT {issuedTempPassword.phone} (Chỉ hiển thị 1 lần):
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-amber-800">Mật khẩu tạm thời:</span>
            <code className="rounded bg-white px-3 py-1 font-mono text-sm font-bold text-gray-900 border border-amber-300">
              {issuedTempPassword.password}
            </code>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  void navigator.clipboard.writeText(issuedTempPassword.password);
                }
              }}
              className="rounded bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800"
            >
              Sao chép mật khẩu
            </button>
          </div>
          <p className="text-xs text-amber-800">
            Hãy gửi mật khẩu này cho người lao động để đăng nhập trên ứng dụng HR Partner Android.
          </p>
        </div>
      ) : null}

      {ctx ? (
        <>
          {/* 3-step visual summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Step 1: App Login Account */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  1. Tài khoản đăng nhập App
                </span>
                {phoneMatchedUser ? (
                  phoneMatchedUser.phoneVerified ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                      SĐT đã xác minh
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                      Chưa xác minh OTP
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    Chưa đăng ký App
                  </span>
                )}
              </div>

              {phoneMatchedUser ? (
                <div className="text-xs text-gray-700 space-y-1">
                  <p className="font-semibold text-sm text-gray-900 font-mono">
                    {phoneMatchedUser.phone ?? '—'}
                  </p>
                  <p>
                    Tên TK: <span className="font-medium">{phoneMatchedUser.name ?? '—'}</span>
                  </p>
                  <p>
                    Vai trò: <span className="font-medium">Người lao động (App Login)</span>
                  </p>
                  {!phoneMatchedUser.phoneVerified ? (
                    <div className="pt-1.5">
                      <button
                        type="button"
                        disabled={verifyingOnly || submitting}
                        onClick={() => handleQuickVerifyPhone(phoneMatchedUser)}
                        className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        {verifyingOnly ? 'Đang xác nhận...' : 'Xác nhận SĐT thủ công ngay'}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    SĐT ứng viên{' '}
                    <span className="font-mono font-semibold text-gray-900">
                      {ctx.laborProfile.phone ?? 'chưa có'}
                    </span>{' '}
                    chưa có tài khoản đăng nhập trên App (ứng viên mới nộp form Web).
                  </p>
                  <p className="text-indigo-700 font-medium">
                    Có thể tích chọn tự động khởi tạo tài khoản đăng nhập App bên dưới.
                  </p>
                </div>
              )}
            </div>

            {/* Step 2: Canonical Worker */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  2. Hồ sơ NLĐ chính thức
                </span>
                {ctx.linkedWorker ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                    {ctx.linkedWorker.profileStatus} · {ctx.linkedWorker.employmentStatus}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                    Đang là Ứng viên
                  </span>
                )}
              </div>

              {ctx.linkedWorker ? (
                <div className="text-xs text-gray-700 space-y-1">
                  <p className="font-semibold text-sm text-indigo-700">
                    <Link
                      href={`/admin/workers/${ctx.linkedWorker.id}`}
                      className="hover:underline"
                    >
                      {ctx.linkedWorker.userId} — {ctx.linkedWorker.fullName ?? '—'}
                    </Link>
                  </p>
                  <p>
                    Liên kết TK App:{' '}
                    <span className="font-medium">
                      {ctx.linkedWorker.accountUserId ? 'Đã gắn tài khoản' : 'Chưa gắn tài khoản'}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    Ứng viên này chưa được chuyển thành Hồ sơ Người lao động chính thức của HRP.
                  </p>
                  <p className="text-indigo-700 font-medium">
                    Bấm nút phê duyệt bên dưới để tạo mã <code className="font-mono">USR-EMP-xxx</code>{' '}
                    và kích hoạt trạng thái <code className="font-mono">VERIFIED / ACTIVE</code>.
                  </p>
                </div>
              )}
            </div>

            {/* Step 3: Project Assignment */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  3. Dự án đang làm việc
                </span>
                {ctx.linkedWorker?.activeAssignment ? (
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200">
                    Đang làm việc
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    Chưa gán dự án
                  </span>
                )}
              </div>

              {ctx.linkedWorker?.activeAssignment ? (
                <div className="text-xs text-gray-700 space-y-1">
                  <p className="font-semibold text-sm text-gray-900">
                    {ctx.linkedWorker.activeAssignment.projectCode} —{' '}
                    {ctx.linkedWorker.activeAssignment.projectName}
                  </p>
                  <p>
                    Mã NV tại dự án:{' '}
                    <span className="font-mono font-medium">
                      {ctx.linkedWorker.activeAssignment.employeeCode}
                    </span>
                  </p>
                  <p>
                    Hình thức:{' '}
                    <span className="font-medium">
                      {ctx.linkedWorker.activeAssignment.employmentType}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Chưa có phân công ACTIVE vào dự án nào.</p>
                  <p className="text-indigo-700 font-medium">
                    Chọn vị trí tuyển dụng bên dưới để gán thẳng vào dự án trong cùng 1 bước.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Form */}
          <form
            onSubmit={handleOnboardSubmit}
            className="rounded-lg border border-indigo-100 bg-white p-5 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Account selection / creation */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tài khoản đăng nhập App (User role=WORKER)
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    if (e.target.value) setCreateAccountIfMissing(false);
                  }}
                  disabled={submitting}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">
                    {ctx.laborProfile.phone
                      ? `-- Tự động khớp theo SĐT (${ctx.laborProfile.phone}) hoặc tạo mới --`
                      : '-- Không gắn tài khoản đăng nhập --'}
                  </option>
                  {ctx.linkedUser ? (
                    <option value={ctx.linkedUser.id}>
                      [Đang liên kết] {ctx.linkedUser.phone ?? '—'} —{' '}
                      {ctx.linkedUser.name ?? 'Không tên'} (
                      {ctx.linkedUser.phoneVerified ? 'Đã xác minh SĐT' : 'Chưa xác minh OTP'})
                    </option>
                  ) : null}
                  {ctx.matchingUsers
                    .filter((u) => u.id !== ctx.linkedUser?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.matchedByPhone ? '★ Trùng SĐT: ' : ''}
                        {u.phone ?? '—'} — {u.name ?? 'Không tên'} (
                        {u.phoneVerified
                          ? 'Đã xác minh SĐT'
                          : 'Chưa xác minh OTP -> Sẽ tự xác minh'}
                        )
                      </option>
                    ))}
                </select>

                {!selectedUserId && !phoneMatchedUser && ctx.laborProfile.phone ? (
                  <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={createAccountIfMissing}
                      onChange={(e) => setCreateAccountIfMissing(e.target.checked)}
                      disabled={submitting}
                    />
                    <span>
                      Tự động tạo tài khoản đăng nhập App cho SĐT{' '}
                      <strong className="font-mono">{ctx.laborProfile.phone}</strong> (cấp mật khẩu
                      tạm thời &amp; xác minh SĐT sẵn)
                    </span>
                  </label>
                ) : null}
              </div>

              {/* Project / Slot selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phân công vào Dự án / Đơn hàng / Vị trí đang mở
                </label>
                <select
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">
                    -- Chỉ xác thực tài khoản &amp; kích hoạt NLĐ (Gán dự án sau) --
                  </option>
                  {ctx.openSlots.map((s) => (
                    <option key={s.slotId} value={s.slotId}>
                      [{s.projectCode}] {s.projectName} — {s.positionTitle} ({s.positionCode}) ·
                      Còn {s.remaining}/{s.slotsNeeded} chỗ (Đơn: {s.staffingOrderCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSlotId ? (
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mã nhân viên tại dự án <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    disabled={submitting}
                    placeholder="VD: NV-0001"
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hình thức lao động
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) =>
                      setEmploymentType(
                        e.target.value as 'HRP_EMPLOYED' | 'OUTSOURCED' | 'REFERRED_OUT',
                      )
                    }
                    disabled={submitting}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    <option value="HRP_EMPLOYED">HRP_EMPLOYED (Lao động của HRP)</option>
                    <option value="OUTSOURCED">OUTSOURCED (Cung ứng / Khoán)</option>
                    <option value="REFERRED_OUT">REFERRED_OUT (Giới thiệu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Môi trường làm việc
                  </label>
                  <select
                    value={workSetting}
                    onChange={(e) =>
                      setWorkSetting(e.target.value as 'PHOTHONG' | 'CONGXUONG' | 'VANPHONG')
                    }
                    disabled={submitting}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    <option value="PHOTHONG">Lao động phổ thông</option>
                    <option value="CONGXUONG">Công xưởng / Nhà máy</option>
                    <option value="VANPHONG">Văn phòng</option>
                  </select>
                </div>
                {ctx.linkedWorker?.activeAssignment ? (
                  <div className="md:col-span-3">
                    <label className="flex items-center gap-2 text-xs text-amber-800">
                      <input
                        type="checkbox"
                        checked={replaceActiveAssignment}
                        onChange={(e) => setReplaceActiveAssignment(e.target.checked)}
                        disabled={submitting}
                      />
                      <span>
                        Thay thế phân công đang ACTIVE tại dự án{' '}
                        {ctx.linkedWorker.activeAssignment.projectCode}
                      </span>
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Lý do kiểm toán (bắt buộc) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  maxLength={500}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting
                  ? 'Đang xử lý...'
                  : selectedSlotId
                    ? 'Xác thực TK App, Duyệt NLĐ & Gán Dự Án'
                    : ctx.linkedWorker
                      ? 'Cập nhật Xác thực TK App & Kích hoạt NLĐ'
                      : 'Xác thực TK App & Duyệt thành NLĐ HRP'}
              </button>
            </div>
          </form>
        </>
      ) : null}
    </section>
  );
}
