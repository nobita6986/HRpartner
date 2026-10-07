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
 *   - 4 error codes 409 (LAST_ADMIN_PROTECTED, SELF_DEMOTION_BLOCKED, ...) hiển
 *     thị thân thiện với người dùng (không leak SQL/stack).
 *
 * Không lưu mật khẩu vào localStorage / state sau khi modal đóng. KHÔNG ghi
 * mật khẩu ra `console.*`.
 */

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';

import { ROLE_LABELS, roleLabel } from '@/src/shared/i18n/role-labels';

interface UserRow {
  id: string;
  name: string | null;
  phone: string | null;
  role: string;
  vendorId: string | null;
  isActive: boolean;
  createdAt: string;
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
      const r = await fetch(`/api/admin/users?${params}`);
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

  const submitCreate = async (form: { name: string; phone: string; role: string; reason?: string }) => {
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
  const submitEdit = async (form: { name: string; phone: string; role: string; isActive: boolean; reason?: string }) => {
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
                {['Mã người dùng', 'Tên', 'Điện thoại', 'Vai trò', 'Mã nhà cung cấp', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(
                  (h) => (
                    <th
                      key={h}
                      style={{ color: 'var(--on-surface-variant)' }}
                      className="px-4 py-3 text-left font-semibold"
                    >
                      {h}
                    </th>
                  ),
                )}
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
                    {u.name ?? '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {u.phone ?? '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {roleLabel(u.role)}
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal components
// ═══════════════════════════════════════════════════════════════════════════

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
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
        className="w-full max-w-md rounded-xl border p-6 shadow-lg"
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
  onSubmit: (form: { name: string; phone: string; role: string; reason?: string }) => Promise<void>;
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
          await onSubmit({ name, phone, role, reason: reason || undefined });
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
        <Field label="Lý do tạo (tùy chọn)">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
  onSubmit: (form: { name: string; phone: string; role: string; isActive: boolean; reason?: string }) => Promise<void>;
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
          await onSubmit({ name, phone, role, isActive, reason: reason || undefined });
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
        <Field label="Lý do thay đổi (tùy chọn)">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
      <Field label="Lý do (tùy chọn)">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
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
          disabled={loading}
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
