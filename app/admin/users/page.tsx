'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

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

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  HR_MANAGER: 'HR Manager',
  HR_STAFF: 'HR Staff',
  ACCOUNTANT: 'Kế toán',
  PM: 'PM',
  SALE: 'Sale',
  DIRECTOR: 'Giám đốc',
  WORKER: 'Worker',
  MKT: 'Marketing',
  VENDOR_ADMIN: 'Vendor Admin',
  VENDOR_STAFF: 'Vendor Staff',
  CTV: 'Cộng tác viên',
  EMPLOYEE: 'Employee',
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{ background: active ? '#e8f5e9' : '#eceff1', color: active ? '#197a56' : '#37474f' }} className="rounded-full px-2 py-0.5 text-xs font-semibold">
      {active ? 'Hoạt động' : 'Tạm ngưng'}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: '50' });
      if (isActiveFilter) params.set('isActive', isActiveFilter);
      if (roleFilter) params.set('role', roleFilter);
      if (search.trim()) params.set('search', search.trim());
      const r = await fetch(`/api/admin/users?${params}`);
      if (!r.ok) { if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; } if (r.status === 403) { setError('Chỉ Admin mới được xem.'); return; } throw new Error(`${r.status}`); }
      const d: UsersResponse = await r.json();
      setUsers(d.users);
      setTotal(d.total);
    } catch { setError('Không thể tải danh sách users.'); } finally { setLoading(false); }
  }, [isActiveFilter, roleFilter, search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const roles = ['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'PM', 'SALE', 'DIRECTOR', 'WORKER', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'EMPLOYEE'];

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6">
        <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Tài khoản hệ thống</h1>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">Module M7 — Quản lý users</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Tìm kiếm ID / tên / SĐT…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="rounded border px-3 py-2 text-sm" />
        <select value={isActiveFilter} onChange={e => setIsActiveFilter(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="rounded border px-3 py-2 text-sm">
          <option value="">Tất cả</option>
          <option value="true">Hoạt động</option>
          <option value="false">Tạm ngưng</option>
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="rounded border px-3 py-2 text-sm">
          <option value="">Tất cả vai trò</option>
          {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">Đang tải…</p>
      : error ? <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'var(--error)' }} className="rounded-lg border p-4 text-sm">{error}</div>
      : users.length === 0 ? <div style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="rounded-lg border p-8 text-center"><p className="text-sm">Chưa có user nào.</p></div>
      : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['User ID', 'Tên', 'Điện thoại', 'Vai trò', 'Vendor ID', 'Trạng thái', 'Ngày tạo'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className="transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]" style={{ borderBottom: i < users.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}>
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">{u.id}</td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">{u.name ?? '—'}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{u.phone ?? '—'}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs font-mono">{u.vendorId ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge active={u.isActive} /></td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">Tổng: {total} users</div>
        </div>
      )}
    </div>
  );
}
