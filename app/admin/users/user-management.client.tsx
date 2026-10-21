'use client';

/**
 * User management UI — hrp-v6-admin-users-permissions.
 *
 * Tách từ page.tsx gốc để dễ test, dễ review. Page chỉ re-export.
 *
 * Tính năng:
 *   - Danh sách tài khoản với filter (search / isActive / role).
 *   - Nút "Tạo tài khoản" → modal tạo + hiển thị mật khẩu tạm MỘT LẦN
 *     (client phải copy trước khi đóng modal; refresh sẽ mất).
 *   - Nút "Sửa" từng dòng → modal cập nhật name/phone/role.
 *   - Nút "Vô hiệu hóa" / "Kích hoạt lại" → confirm dialog gọi API
 *     /api/admin/users/[id]/deactivate hoặc /reactivate.
 *   - Nút "Xác nhận thủ công" / "Hủy xác minh" SĐT và "Gán dự án / NLĐ"
 *     để Admin kiểm soát trọn vẹn luồng từ tài khoản đăng ký -> xác thực SĐT
 *     -> tạo/liên kết hồ sơ NLĐ -> phân công vào dự án.
 *
 * Không lưu mật khẩu vào localStorage / state sau khi modal đóng. KHÔNG ghi
 * mật khẩu ra `console.*`.
 */

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';

import { ROLE_LABELS, roleLabel } from '@/src/shared/i18n/role-labels';

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

interface MatchingLaborProfileSummary {
  id: string;
  fullName: string | null;
  phone: string | null;
  identityVerification: string;
  completeness: string;
  workerId: string | null;
}

interface UserOnboardingContext {
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    phoneVerified: boolean;
    role: string;
    isActive: boolean;
  };
  linkedWorker: LinkedWorkerSummary | null;
  matchingWorkers: LinkedWorkerSummary[];
  matchingLaborProfile?: MatchingLaborProfileSummary | null;
  openSlots: OpenSlotOption[];
}

interface UserRow {
  id: string;
  name: string | null;
  phone: string | null;
  phoneVerified: boolean;
  role: string;
  vendorId: string | null;
  isActive: boolean;
  createdAt: string;
  workerProfile?: LinkedWorkerSummary | null;
  matchingLaborProfile?: MatchingLaborProfileSummary | null;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  take: number;
  skip: number;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{ background: active ? '#e8f5e9' : '#eceff1', color: active ? '#197a56' : '#37474f' }}
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
    >
      {active ? 'Hoạt động' : 'Tạm ngưng'}
    </span>
  );
}

type ModalKind = null | 'create' | 'edit' | 'deactivate' | 'reactivate';

interface CreateResp {
  user: { id: string };
  temporaryPassword: string;
}

function friendlyError(code: string, message: string): string {
  switch (code) {
    case 'PHONE_TAKEN':
      return 'Số điện thoại đã được sử dụng bởi tài khoản khác.';
    case 'LAST_ADMIN_PROTECTED':
      return 'Không thể hạ quyền hoặc vô hiệu hóa admin cuối cùng của hệ thống.';
    case 'SELF_DEMOTION_BLOCKED':
      return 'Bạn không thể tự hạ quyền quản trị của chính mình.';
    case 'SELF_DEACTIVATION_BLOCKED':
      return 'Bạn không thể tự vô hiệu hóa tài khoản của chính mình.';
    case 'SELF_MODIFICATION_BLOCKED':
      return 'Bạn không thể tự thay đổi vai trò / trạng thái của chính mình.';
    case 'NOT_FOUND':
      return 'Không tìm thấy tài khoản.';
    case 'NO_OP':
      return 'Không có thay đổi nào để áp dụng.';
    case 'VALIDATION_ERROR':
      return message || 'Dữ liệu chưa hợp lệ.';
    case 'FORBIDDEN':
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'Yêu cầu trùng lặp với khóa idempotency đã dùng cho payload khác.';
    case 'CONCURRENT_MODIFICATION':
      return 'Dữ liệu vừa được thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.';
    default:
      return message || 'Đã xảy ra lỗi, vui lòng thử lại.';
  }
}

export default function UserManagementClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<ModalKind>(null);
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [pendingAction, setPendingAction] = useState<UserRow | null>(null);
  const [phoneVerificationUser, setPhoneVerificationUser] = useState<UserRow | null>(null);
  const [phoneVerificationTarget, setPhoneVerificationTarget] = useState<boolean>(true);
  const [phoneVerificationReason, setPhoneVerificationReason] = useState('');
  const [phoneVerificationError, setPhoneVerificationError] = useState('');
  const [phoneVerificationLoading, setPhoneVerificationLoading] = useState(false);

  const [onboardUser, setOnboardUser] = useState<UserRow | null>(null);

  // One-time password reveal — chỉ hiển thị 1 lần ở modal "create".
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: '50' });
      if (isActiveFilter) params.set('isActive', isActiveFilter);
      if (roleFilter) params.set('role', roleFilter);
      if (search.trim()) params.set('search', search.trim());
      const r = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
      if (!r.ok) {
        if (r.status === 401) {
          setError('Vui lòng đăng nhập.');
          return;
        }
        if (r.status === 403) {
          setError('Chỉ quản trị viên mới được xem.');
          return;
        }
        throw new Error(`${r.status}`);
      }
      const d: UsersResponse = await r.json();
      setUsers(d.users);
      setTotal(d.total);
    } catch {
      setError('Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  }, [isActiveFilter, roleFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const roles = Object.keys(ROLE_LABELS);

  // ─── Create ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setModal('create');
    setModalError('');
    setModalLoading(false);
    setRevealedPassword(null);
  };
  const closeModal = () => {
    if (modal === 'create' && revealedPassword) {
      // Cảnh báo khi đóng modal mà chưa copy.
      if (!window.confirm('Bạn chưa sao chép mật khẩu tạm. Đóng modal sẽ mất mật khẩu. Tiếp tục?')) {
        return;
      }
    }
    setModal(null);
    setModalError('');
    setModalLoading(false);
    setEditing(null);
    setPendingAction(null);
    setRevealedPassword(null);
  };

  const submitCreate = async (form: { name: string; phone: string; role: string; reason: string }) => {
    setModalLoading(true);
    setModalError('');
    try {
      // Idempotency-Key giúp retry an toàn. Mỗi lần tạo → key mới (1 lần tạo 1 key).
      const idempotencyKey = `create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) {
        setModalError(friendlyError(data.error, data.message));
        return;
      }
      const created = data as CreateResp;
      setRevealedPassword(created.temporaryPassword);
      await load();
    } catch {
      setModalError('Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Edit ──────────────────────────────────────────────────────────────
  const openEdit = (u: UserRow) => {
    setEditing(u);
    setModal('edit');
    setModalError('');
    setModalLoading(false);
  };
  const submitEdit = async (form: { name: string; phone: string; role: string; isActive: boolean; reason: string }) => {
    if (!editing) return;
    setModalLoading(true);
    setModalError('');
    try {
      const r = await fetch(`/api/admin/users/${editing.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) {
        setModalError(friendlyError(data.error, data.message));
        return;
      }
      setModal(null);
      setEditing(null);
      await load();
    } catch {
      setModalError('Không thể cập nhật tài khoản. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Deactivate / Reactivate ───────────────────────────────────────────
  const openDeactivate = (u: UserRow) => {
    setPendingAction(u);
    setModal('deactivate');
    setModalError('');
    setModalLoading(false);
  };
  const openReactivate = (u: UserRow) => {
    setPendingAction(u);
    setModal('reactivate');
    setModalError('');
    setModalLoading(false);
  };
  const submitDeactivate = async (reason: string) => {
    if (!pendingAction) return;
    setModalLoading(true);
    setModalError('');
    try {
      const r = await fetch(`/api/admin/users/${pendingAction.id}/deactivate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await r.json();
      if (!r.ok) {
        setModalError(friendlyError(data.error, data.message));
        return;
      }
      setModal(null);
      setPendingAction(null);
      await load();
    } catch {
      setModalError('Không thể vô hiệu hóa tài khoản.');
    } finally {
      setModalLoading(false);
    }
  };
  const submitReactivate = async (reason: string) => {
    if (!pendingAction) return;
    setModalLoading(true);
    setModalError('');
    try {
      const r = await fetch(`/api/admin/users/${pendingAction.id}/reactivate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await r.json();
      if (!r.ok) {
        setModalError(friendlyError(data.error, data.message));
        return;
      }
      setModal(null);
      setPendingAction(null);
      await load();
    } catch {
      setModalError('Không thể kích hoạt lại tài khoản.');
    } finally {
      setModalLoading(false);
    }
  };

  const submitManualPhoneVerification = async () => {
    if (!phoneVerificationUser || !phoneVerificationReason.trim()) return;
    setPhoneVerificationLoading(true);
    setPhoneVerificationError('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(phoneVerificationUser.id)}/phone-verification`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reason: phoneVerificationReason.trim(),
          verified: phoneVerificationTarget,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể cập nhật trạng thái xác minh số điện thoại.');
      setPhoneVerificationUser(null);
      setPhoneVerificationReason('');
      await load();
    } catch (error) {
      setPhoneVerificationError(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái xác minh số điện thoại.');
    } finally {
      setPhoneVerificationLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">
            Tài khoản hệ thống
          </h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
            Quản lý tài khoản người dùng, vai trò và trạng thái hoạt động.
          </p>
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 max-w-3xl text-xs">
            Quản trị viên có thể xác minh số điện thoại thủ công (khi OTP gặp sự cố), khởi tạo hoặc liên kết hồ sơ người lao động và gán trực tiếp vào dự án ngay tại bảng này.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          data-testid="open-create-user"
          style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
          className="rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Tạo tài khoản
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Tìm kiếm ID / tên / SĐT…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="rounded border px-3 py-2 text-sm"
        />
        <select
          value={isActiveFilter}
          onChange={(e) => setIsActiveFilter(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="true">Hoạt động</option>
          <option value="false">Tạm ngưng</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Tất cả vai trò</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">
          Đang tải…
        </p>
      ) : error ? (
        <div
          style={{
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            borderColor: 'var(--error)',
          }}
          className="rounded-lg border p-4 text-sm"
        >
          {error}
        </div>
      ) : users.length === 0 ? (
        <div
          style={{
            background: 'var(--surface-container-lowest)',
            borderColor: 'var(--outline-variant)',
            color: 'var(--on-surface-variant)',
          }}
          className="rounded-lg border p-8 text-center"
        >
          <p className="text-sm">Chưa có tài khoản nào.</p>
        </div>
      ) : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background: 'var(--surface-container)',
                  borderBottom: '1px solid var(--outline-variant)',
                }}
              >
                {[
                  'Mã người dùng',
                  'Tên',
                  'Điện thoại',
                  'Xác minh SĐT',
                  'Vai trò',
                  'Hồ sơ NLĐ / Dự án',
                  'Mã nhà cung cấp',
                  'Trạng thái',
                  'Ngày tạo',
                  'Thao tác',
                ].map((h) => (
                  <th
                    key={h}
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-4 py-3 text-left font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  className="transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]"
                  style={{ borderBottom: i < users.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}
                >
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">
                    {u.id}
                  </td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">
                    <div>{u.name ?? '—'}</div>
                    {u.matchingLaborProfile?.fullName &&
                      u.matchingLaborProfile.fullName !== u.name && (
                        <div
                          style={{ color: 'var(--on-surface-variant)' }}
                          className="text-[11px]"
                        >
                          Ứng viên: {u.matchingLaborProfile.fullName}
                        </div>
                      )}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {u.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.role !== 'WORKER' ? (
                      '—'
                    ) : u.phoneVerified ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          style={{ background: '#e8f5e9', color: '#197a56' }}
                          className="rounded-full px-2 py-0.5 font-semibold"
                        >
                          Đã xác minh
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneVerificationUser(u);
                            setPhoneVerificationTarget(false);
                            setPhoneVerificationReason('');
                            setPhoneVerificationError('');
                          }}
                          data-testid={`unverify-phone-${u.id}`}
                          className="rounded border px-1.5 py-0.5 text-[11px]"
                          style={{ borderColor: 'var(--outline)', color: 'var(--on-surface-variant)' }}
                        >
                          Hủy xác minh
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneVerificationUser(u);
                          setPhoneVerificationTarget(true);
                          setPhoneVerificationReason('');
                          setPhoneVerificationError('');
                        }}
                        data-testid={`verify-phone-${u.id}`}
                        className="rounded border px-2 py-1"
                        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                      >
                        Xác nhận thủ công
                      </button>
                    )}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {roleLabel(u.role)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.role !== 'WORKER' ? (
                      '—'
                    ) : u.workerProfile ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href={`/admin/workers/${u.workerProfile.id}`}
                            style={{ color: 'var(--primary)' }}
                            className="font-mono font-semibold hover:underline"
                          >
                            {u.workerProfile.userId}
                          </a>
                          <span
                            style={{
                              background:
                                u.workerProfile.profileStatus === 'VERIFIED' &&
                                u.workerProfile.employmentStatus === 'ACTIVE'
                                  ? '#e8f5e9'
                                  : '#fff8e1',
                              color:
                                u.workerProfile.profileStatus === 'VERIFIED' &&
                                u.workerProfile.employmentStatus === 'ACTIVE'
                                  ? '#197a56'
                                  : '#8d6e00',
                            }}
                            className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                          >
                            {u.workerProfile.profileStatus === 'VERIFIED' &&
                            u.workerProfile.employmentStatus === 'ACTIVE'
                              ? 'NLĐ Đang làm'
                              : `${u.workerProfile.profileStatus} / ${u.workerProfile.employmentStatus}`}
                          </span>
                        </div>
                        {u.workerProfile.activeAssignment ? (
                          <div style={{ color: 'var(--on-surface)' }} className="text-[11px]">
                            Dự án: <strong>{u.workerProfile.activeAssignment.projectCode}</strong> —{' '}
                            {u.workerProfile.activeAssignment.projectName} (Mã NV:{' '}
                            <span className="font-mono">{u.workerProfile.activeAssignment.employeeCode}</span>)
                          </div>
                        ) : (
                          <div style={{ color: 'var(--on-surface-variant)' }} className="text-[11px]">
                            Chưa có phân công dự án
                          </div>
                        )}
                      </div>
                    ) : u.matchingLaborProfile ? (
                      <div className="space-y-1">
                        <div>
                          <span style={{ color: 'var(--on-surface-variant)' }}>Hồ sơ ứng viên: </span>
                          <a
                            href={`/admin/labor-profiles/${u.matchingLaborProfile.id}`}
                            style={{ color: 'var(--primary)' }}
                            className="font-semibold hover:underline"
                          >
                            {u.matchingLaborProfile.fullName ?? 'Xem hồ sơ'}
                          </a>
                        </div>
                        <div style={{ color: '#8d6e00' }} className="text-[11px]">
                          Chưa duyệt thành NLĐ — bấm &ldquo;Gán dự án / NLĐ&rdquo;
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--on-surface-variant)' }}>Chưa liên kết hồ sơ NLĐ</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs font-mono">
                    {u.vendorId ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={u.isActive} />
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {u.role === 'WORKER' && u.isActive && (
                        <button
                          type="button"
                          onClick={() => setOnboardUser(u)}
                          data-testid={`onboard-worker-${u.id}`}
                          style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                          className="rounded px-2.5 py-1 text-xs font-semibold"
                        >
                          Gán dự án / NLĐ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        data-testid={`edit-${u.id}`}
                        style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Sửa
                      </button>
                      {u.isActive ? (
                        <button
                          type="button"
                          onClick={() => openDeactivate(u)}
                          data-testid={`deactivate-${u.id}`}
                          style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          Vô hiệu hóa
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openReactivate(u)}
                          data-testid={`reactivate-${u.id}`}
                          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          Kích hoạt lại
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
            className="border-t px-4 py-2 text-xs"
          >
            Tổng: {total} tài khoản
          </div>
        </div>
      )}

      {/* ─── Modal: Create ─────────────────────────────────────────────── */}
      {modal === 'create' && (
        <CreateUserModal
          loading={modalLoading}
          error={modalError}
          revealedPassword={revealedPassword}
          onSubmit={submitCreate}
          onClose={closeModal}
        />
      )}

      {/* ─── Modal: Edit ───────────────────────────────────────────────── */}
      {modal === 'edit' && editing && (
        <EditUserModal
          user={editing}
          loading={modalLoading}
          error={modalError}
          onSubmit={submitEdit}
          onClose={closeModal}
        />
      )}

      {/* ─── Modal: Deactivate ─────────────────────────────────────────── */}
      {modal === 'deactivate' && pendingAction && (
        <ConfirmStatusModal
          kind="deactivate"
          user={pendingAction}
          loading={modalLoading}
          error={modalError}
          onSubmit={submitDeactivate}
          onClose={closeModal}
        />
      )}

      {/* ─── Modal: Reactivate ─────────────────────────────────────────── */}
      {modal === 'reactivate' && pendingAction && (
        <ConfirmStatusModal
          kind="reactivate"
          user={pendingAction}
          loading={modalLoading}
          error={modalError}
          onSubmit={submitReactivate}
          onClose={closeModal}
        />
      )}

      {/* ─── Modal: Manual Phone Verification / Revocation ─────────────── */}
      {phoneVerificationUser && (
        <ModalShell
          title={
            phoneVerificationTarget
              ? `Xác nhận SĐT ${phoneVerificationUser.phone ?? ''}`
              : `Hủy xác minh SĐT ${phoneVerificationUser.phone ?? ''}`
          }
          onClose={() => setPhoneVerificationUser(null)}
        >
          <p className="mb-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            {phoneVerificationTarget
              ? 'Thao tác này xác thực số điện thoại thủ công (bỏ qua bước chờ OTP khi nhà cung cấp gặp sự cố). Mọi thay đổi được ghi vào nhật ký kiểm toán.'
              : 'Thao tác này thu hồi trạng thái đã xác minh số điện thoại của tài khoản và ghi vào nhật ký kiểm toán.'}
          </p>
          <Field label={phoneVerificationTarget ? 'Lý do xác nhận' : 'Lý do hủy xác minh'} required>
            <input
              value={phoneVerificationReason}
              onChange={(event) => setPhoneVerificationReason(event.target.value)}
              required
              maxLength={500}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </Field>
          {phoneVerificationError && (
            <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--error)' }}>
              {phoneVerificationError}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPhoneVerificationUser(null)}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submitManualPhoneVerification}
              disabled={phoneVerificationLoading || !phoneVerificationReason.trim()}
              className="rounded px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: phoneVerificationTarget ? 'var(--primary)' : 'var(--error)',
                color: 'var(--on-primary)',
              }}
            >
              {phoneVerificationLoading
                ? 'Đang xử lý…'
                : phoneVerificationTarget
                  ? 'Xác nhận số điện thoại'
                  : 'Thu hồi xác minh'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ─── Modal: Full Admin Onboarding & Project Assignment ─────────── */}
      {onboardUser && (
        <OnboardWorkerModal
          user={onboardUser}
          onClose={() => setOnboardUser(null)}
          onSuccess={async () => {
            setOnboardUser(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal components
// ═══════════════════════════════════════════════════════════════════════════

function ModalShell({
  title,
  onClose,
  maxWidthClass = 'max-w-md',
  children,
}: {
  title: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        style={{ background: 'var(--surface)', borderColor: 'var(--outline-variant)' }}
        className={`max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto rounded-xl border p-6 shadow-lg`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 style={{ color: 'var(--on-surface)' }} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ color: 'var(--on-surface-variant)' }}
            className="rounded px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function OnboardWorkerModal({
  user,
  onClose,
  onSuccess,
}: {
  user: UserRow;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [ctxLoading, setCtxLoading] = useState(true);
  const [ctxError, setCtxError] = useState('');
  const [context, setContext] = useState<UserOnboardingContext | null>(null);

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [slotId, setSlotId] = useState<string>('');
  const [employeeCode, setEmployeeCode] = useState<string>('');
  const [employmentType, setEmploymentType] = useState<string>('HRP_EMPLOYED');
  const [workSetting, setWorkSetting] = useState<string>('PHOTHONG');
  const [replaceActiveAssignment, setReplaceActiveAssignment] = useState<boolean>(false);
  const [allowPhoneUpdate, setAllowPhoneUpdate] = useState<boolean>(true);
  const [reason, setReason] = useState<string>('Admin xác thực thủ công và kích hoạt NLĐ vào dự án');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setCtxLoading(true);
      setCtxError('');
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/onboard-worker`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Không thể tải dữ liệu kích hoạt NLĐ.');
        }
        if (!active) return;
        const loaded = data as UserOnboardingContext;
        setContext(loaded);
        if (loaded.linkedWorker) {
          setSelectedWorkerId(loaded.linkedWorker.id);
          if (loaded.linkedWorker.activeAssignment?.employeeCode) {
            setEmployeeCode(loaded.linkedWorker.activeAssignment.employeeCode);
          } else {
            setEmployeeCode(loaded.linkedWorker.userId);
          }
        } else if (loaded.matchingWorkers.length === 1) {
          setSelectedWorkerId(loaded.matchingWorkers[0].id);
          setEmployeeCode(loaded.matchingWorkers[0].userId);
        } else if (user.phone) {
          setEmployeeCode(`NV-${user.phone.slice(-4)}`);
        }
      } catch (err) {
        if (!active) return;
        setCtxError(err instanceof Error ? err.message : 'Không thể tải dữ liệu kích hoạt NLĐ.');
      } finally {
        if (active) setCtxLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user.id, user.phone]);

  const currentWorker =
    context?.linkedWorker ??
    context?.matchingWorkers.find((w) => w.id === selectedWorkerId) ??
    null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    if (slotId && !employeeCode.trim()) {
      setSubmitError('Vui lòng nhập Mã nhân viên tại dự án khi chọn phân công vào vị trí tuyển dụng.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/onboard-worker`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workerId: selectedWorkerId || null,
          slotId: slotId || null,
          employeeCode: slotId ? employeeCode.trim() : null,
          employmentType: slotId ? employmentType : null,
          workSetting: slotId ? workSetting : null,
          replaceActiveAssignment,
          allowPhoneUpdate,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể thực hiện kích hoạt và gán dự án.');
      }
      await onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể thực hiện kích hoạt và gán dự án.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title={`Kích hoạt NLĐ & Gán dự án — ${user.name ?? user.phone ?? user.id}`}
      onClose={onClose}
      maxWidthClass="max-w-xl"
    >
      {ctxLoading ? (
        <p style={{ color: 'var(--on-surface-variant)' }} className="py-6 text-center text-sm">
          Đang tải thông tin hồ sơ và danh sách dự án…
        </p>
      ) : ctxError ? (
        <div
          style={{
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            borderColor: 'var(--error)',
          }}
          className="rounded border p-3 text-sm"
        >
          {ctxError}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bước 1: Trạng thái xác thực tài khoản */}
          <div
            style={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}
            className="rounded-lg border p-3 text-xs space-y-1.5"
          >
            <div className="font-semibold" style={{ color: 'var(--on-surface)' }}>
              1. Tài khoản đăng nhập & Xác minh SĐT
            </div>
            <div style={{ color: 'var(--on-surface-variant)' }}>
              Họ tên: <strong>{user.name ?? '—'}</strong> · SĐT: <span className="font-mono">{user.phone ?? '—'}</span>
            </div>
            <div>
              Trạng thái SĐT:{' '}
              {user.phoneVerified ? (
                <span style={{ color: '#197a56' }} className="font-semibold">
                  Đã xác minh
                </span>
              ) : (
                <span style={{ color: '#b26a00' }} className="font-semibold">
                  Chưa xác minh OTP → Hệ thống sẽ tự động xác nhận thủ công khi lưu
                </span>
              )}
            </div>
          </div>

          {/* Bước 2: Hồ sơ NLĐ (Worker) */}
          <div
            style={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}
            className="rounded-lg border p-3 text-xs space-y-2"
          >
            <div className="font-semibold" style={{ color: 'var(--on-surface)' }}>
              2. Hồ sơ Người lao động (NLĐ của HRP)
            </div>
            {context?.linkedWorker ? (
              <div style={{ color: 'var(--on-surface-variant)' }}>
                Đã liên kết hồ sơ:{' '}
                <strong className="font-mono" style={{ color: 'var(--primary)' }}>
                  {context.linkedWorker.userId}
                </strong>{' '}
                ({context.linkedWorker.fullName ?? '—'}) · Trạng thái sẽ được đảm bảo là{' '}
                <strong>Đã xác minh / Đang làm việc</strong>.
              </div>
            ) : context && context.matchingWorkers.length > 0 ? (
              <Field label="Chọn hồ sơ NLĐ trùng SĐT hoặc tạo mới">
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  style={{ borderColor: 'var(--outline)', background: 'var(--surface)' }}
                  className="w-full rounded border px-3 py-2 text-xs"
                >
                  <option value="">+ Tạo mới hồ sơ NLĐ chuẩn (USR-EMP-xxx)</option>
                  {context.matchingWorkers.map((mw) => (
                    <option key={mw.id} value={mw.id}>
                      Liên kết hồ sơ sẵn có: {mw.userId} — {mw.fullName ?? mw.phone} ({mw.profileStatus}/{mw.employmentStatus})
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <div style={{ color: 'var(--on-surface-variant)' }} className="space-y-1">
                {context?.matchingLaborProfile ? (
                  <div>
                    Đã tìm thấy Hồ sơ ứng viên trùng SĐT:{' '}
                    <a
                      href={`/admin/labor-profiles/${context.matchingLaborProfile.id}`}
                      style={{ color: 'var(--primary)' }}
                      className="font-semibold hover:underline"
                    >
                      {context.matchingLaborProfile.fullName ?? context.matchingLaborProfile.phone}
                    </a>
                    .
                  </div>
                ) : null}
                <div>
                  Chưa có hồ sơ NLĐ. Hệ thống sẽ <strong>tự động khởi tạo hồ sơ NLĐ mới</strong> (mã{' '}
                  <span className="font-mono">USR-EMP-xxx</span>), liên kết Hồ sơ ứng viên và kích hoạt trạng thái{' '}
                  <strong>Đã xác minh / Đang làm việc</strong>.
                </div>
              </div>
            )}

            {!context?.linkedWorker && selectedWorkerId && (
              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={allowPhoneUpdate}
                  onChange={(e) => setAllowPhoneUpdate(e.target.checked)}
                />
                <span style={{ color: 'var(--on-surface-variant)' }}>
                  Đồng bộ SĐT từ tài khoản sang hồ sơ NLĐ nếu khác định dạng
                </span>
              </label>
            )}
          </div>

          {/* Bước 3: Phân công vào Dự án / Vị trí tuyển dụng */}
          <div
            style={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}
            className="rounded-lg border p-3 text-xs space-y-3"
          >
            <div className="font-semibold" style={{ color: 'var(--on-surface)' }}>
              3. Phân công vào Dự án (tùy chọn — có thể gán ngay hoặc chỉ kích hoạt hồ sơ trước)
            </div>

            {currentWorker?.activeAssignment && (
              <div
                style={{ background: '#e8f5e9', color: '#197a56' }}
                className="rounded p-2 text-xs"
              >
                Phân công hiện hành: <strong>{currentWorker.activeAssignment.projectCode}</strong> —{' '}
                {currentWorker.activeAssignment.projectName} (Mã NV:{' '}
                <span className="font-mono">{currentWorker.activeAssignment.employeeCode}</span>)
              </div>
            )}

            <Field label="Chọn Dự án / Đơn hàng / Vị trí đang mở">
              <select
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface)' }}
                className="w-full rounded border px-3 py-2 text-xs"
              >
                <option value="">
                  {currentWorker?.activeAssignment
                    ? '— Giữ nguyên phân công dự án hiện tại —'
                    : '— Chưa gán dự án (chỉ xác thực SĐT & kích hoạt hồ sơ NLĐ) —'}
                </option>
                {context?.openSlots.map((s) => (
                  <option key={s.slotId} value={s.slotId}>
                    [{s.projectCode}] {s.projectName} · Đơn {s.staffingOrderCode}: {s.positionTitle} (Còn {s.remaining}/{s.slotsNeeded} chỗ)
                  </option>
                ))}
              </select>
            </Field>

            {slotId && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Mã NV tại dự án" required>
                  <input
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    required
                    maxLength={64}
                    placeholder="VD: NV-001"
                    style={{ borderColor: 'var(--outline)', background: 'var(--surface)' }}
                    className="w-full rounded border px-2.5 py-1.5 text-xs font-mono"
                  />
                </Field>
                <Field label="Hình thức lao động" required>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    style={{ borderColor: 'var(--outline)', background: 'var(--surface)' }}
                    className="w-full rounded border px-2.5 py-1.5 text-xs"
                  >
                    <option value="HRP_EMPLOYED">Biên chế HRP (HRP_EMPLOYED)</option>
                    <option value="OUTSOURCED">Thuê ngoài / Khoán (OUTSOURCED)</option>
                    <option value="REFERRED_OUT">Giới thiệu (REFERRED_OUT)</option>
                  </select>
                </Field>
                <Field label="Môi trường làm việc" required>
                  <select
                    value={workSetting}
                    onChange={(e) => setWorkSetting(e.target.value)}
                    style={{ borderColor: 'var(--outline)', background: 'var(--surface)' }}
                    className="w-full rounded border px-2.5 py-1.5 text-xs"
                  >
                    <option value="PHOTHONG">Lao động phổ thông</option>
                    <option value="CONGXUONG">Công xưởng / Nhà máy</option>
                    <option value="VANPHONG">Văn phòng</option>
                  </select>
                </Field>
              </div>
            )}

            {slotId && currentWorker?.activeAssignment && (
              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={replaceActiveAssignment}
                  onChange={(e) => setReplaceActiveAssignment(e.target.checked)}
                />
                <span style={{ color: 'var(--on-surface)' }}>
                  Kết thúc phân công hiện tại ({currentWorker.activeAssignment.projectCode}) để chuyển sang vị trí mới
                </span>
              </label>
            )}
          </div>

          <Field label="Lý do kiểm toán" required>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={500}
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </Field>

          {submitError && (
            <div
              role="alert"
              style={{
                background: 'var(--error-container)',
                color: 'var(--on-error-container)',
                borderColor: 'var(--error)',
              }}
              className="rounded border p-2.5 text-xs"
            >
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              data-testid="submit-onboard-worker"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              className="rounded px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              {submitting
                ? 'Đang xử lý…'
                : slotId
                  ? 'Xác thực, Kích hoạt & Gán dự án'
                  : 'Xác thực & Kích hoạt NLĐ'}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

function CreateUserModal({
  loading,
  error,
  revealedPassword,
  onSubmit,
  onClose,
}: {
  loading: boolean;
  error: string;
  revealedPassword: string | null;
  onSubmit: (form: { name: string; phone: string; role: string; reason: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('HR_STAFF');
  const [reason, setReason] = useState('');
  const roles = Object.keys(ROLE_LABELS);

  if (revealedPassword) {
    return (
      <ModalShell title="Tạo tài khoản thành công" onClose={onClose}>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mb-3 text-sm">
          Mật khẩu tạm chỉ hiển thị <strong>một lần</strong>. Vui lòng sao chép và gửi cho người dùng qua
          kênh an toàn.
        </p>
        <div
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="mb-3 flex items-center gap-2 rounded border p-3"
        >
          <code style={{ color: 'var(--on-surface)' }} className="flex-1 break-all text-sm">
            {revealedPassword}
          </code>
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(revealedPassword).catch(() => {});
              }
            }}
            data-testid="copy-temp-password"
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            className="rounded px-3 py-1 text-xs font-semibold"
          >
            Sao chép
          </button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
            className="rounded border px-3 py-1.5 text-sm"
          >
            Đóng
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Tạo tài khoản" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit({ name, phone, role, reason: reason.trim() });
        }}
        className="space-y-3"
      >
        <Field label="Họ tên" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Số điện thoại" required>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            pattern="[0-9+\-()\s]+"
            minLength={8}
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Vai trò" required>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lý do tạo" required>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            pattern=".*\\S.*"
            maxLength={500}
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        {error && (
          <div
            style={{
              background: 'var(--error-container)',
              color: 'var(--on-error-container)',
              borderColor: 'var(--error)',
            }}
            className="rounded border p-2 text-sm"
            data-testid="modal-error"
          >
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
            className="rounded border px-3 py-1.5 text-sm"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            data-testid="submit-create"
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            className="rounded px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditUserModal({
  user,
  loading,
  error,
  onSubmit,
  onClose,
}: {
  user: UserRow;
  loading: boolean;
  error: string;
  onSubmit: (form: { name: string; phone: string; role: string; isActive: boolean; reason: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.name ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [reason, setReason] = useState('');
  const roles = Object.keys(ROLE_LABELS);

  return (
    <ModalShell title={`Sửa tài khoản ${user.name ?? user.id}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit({ name, phone, role, isActive, reason: reason.trim() });
        }}
        className="space-y-3"
      >
        <Field label="Họ tên" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Số điện thoại" required>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            pattern="[0-9+\-()\s]+"
            minLength={8}
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Vai trò" required>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Đang hoạt động">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span style={{ color: 'var(--on-surface)' }} className="text-sm">
              Cho phép đăng nhập
            </span>
          </label>
        </Field>
        <Field label="Lý do thay đổi" required>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            pattern=".*\\S.*"
            maxLength={500}
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        {error && (
          <div
            style={{
              background: 'var(--error-container)',
              color: 'var(--on-error-container)',
              borderColor: 'var(--error)',
            }}
            className="rounded border p-2 text-sm"
          >
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
            className="rounded border px-3 py-1.5 text-sm"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            className="rounded px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ConfirmStatusModal({
  kind,
  user,
  loading,
  error,
  onSubmit,
  onClose,
}: {
  kind: 'deactivate' | 'reactivate';
  user: UserRow;
  loading: boolean;
  error: string;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const isDeactivate = kind === 'deactivate';
  return (
    <ModalShell title={isDeactivate ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt lại tài khoản'} onClose={onClose}>
      <p style={{ color: 'var(--on-surface)' }} className="mb-3 text-sm">
        {isDeactivate
          ? `Bạn sắp vô hiệu hóa tài khoản ${user.name ?? user.id}. Tài khoản này sẽ không thể đăng nhập.`
          : `Bạn sắp kích hoạt lại tài khoản ${user.name ?? user.id}.`}
      </p>
      <Field label="Lý do" required>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          pattern=".*\\S.*"
          maxLength={500}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </Field>
      {error && (
        <div
          style={{
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            borderColor: 'var(--error)',
          }}
          className="mt-3 rounded border p-2 text-sm"
        >
          {error}
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
          className="rounded border px-3 py-1.5 text-sm"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={() => onSubmit(reason)}
          disabled={loading || !reason.trim()}
          style={{
            background: isDeactivate ? 'var(--error)' : 'var(--primary)',
            color: 'var(--on-primary)',
          }}
          className="rounded px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? 'Đang xử lý…' : isDeactivate ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
        </button>
      </div>
    </ModalShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span style={{ color: 'var(--on-surface-variant)' }} className="mb-1 block text-xs font-medium">
        {label}
        {required && <span style={{ color: 'var(--error)' }}> *</span>}
      </span>
      {children}
    </label>
  );
}
