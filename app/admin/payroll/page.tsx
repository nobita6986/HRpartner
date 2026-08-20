'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

interface PayrollConfigRow {
  id: string;
  key: string;
  valueJson: unknown;
  valueType: string;
  description: string | null;
  legalRef: string | null;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
}

interface PayrollResponse {
  configs: PayrollConfigRow[];
  total: number;
  take: number;
  skip: number;
}

const TYPE_LABELS: Record<string, string> = {
  NUMBER: 'Số',
  PERCENT: 'Phần trăm',
  MULTIPLIER: 'Hệ số',
  MONEY: 'Tiền tệ',
  BOOLEAN: 'Có/Không',
  STRING: 'Chuỗi',
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        background: active ? '#e8f5e9' : '#eceff1',
        color: active ? '#197a56' : '#37474f',
      }}
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
    >
      {active ? 'Đang áp dụng' : 'Đã ngừng'}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      style={{ background: '#e3f2fd', color: '#1565c0' }}
      className="rounded px-1.5 py-0.5 text-xs font-medium"
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return '—';
  switch (type) {
    case 'NUMBER':
      return typeof value === 'number' ? value.toLocaleString('vi-VN') : String(value);
    case 'PERCENT':
      return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : String(value);
    case 'MULTIPLIER':
      return typeof value === 'number' ? `${value}x` : String(value);
    case 'MONEY':
      return typeof value === 'number'
        ? `${value.toLocaleString('vi-VN')} ₫`
        : typeof value === 'string' ? `${parseInt(value).toLocaleString('vi-VN')} ₫` : String(value);
    case 'BOOLEAN':
      return value ? 'Có' : 'Không';
    case 'STRING':
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}

export default function PayrollPage() {
  const [configs, setConfigs] = useState<PayrollConfigRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: '50' });
      if (activeFilter) params.set('isActive', activeFilter);
      if (typeFilter) params.set('valueType', typeFilter);
      if (search.trim()) params.set('search', search.trim());
      const r = await fetch(`/api/payroll?${params}`);
      if (!r.ok) {
        if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; }
        if (r.status === 403) { setError('Bạn không có quyền xem.'); return; }
        throw new Error(`${r.status}`);
      }
      const d: PayrollResponse = await r.json();
      setConfigs(d.configs);
      setTotal(d.total);
    } catch {
      setError('Không thể tải cấu hình lương.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, typeFilter, search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6">
        <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Cấu hình lương</h1>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
          Module M6 — Quản lý cấu hình tham số lương
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Tìm kiếm mã / mô tả…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="rounded border px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={activeFilter}
            onChange={e => setActiveFilter(e.target.value)}
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="true">Đang áp dụng</option>
            <option value="false">Đã ngừng</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">Tất cả loại</option>
            <option value="NUMBER">Số</option>
            <option value="PERCENT">Phần trăm</option>
            <option value="MULTIPLIER">Hệ số</option>
            <option value="MONEY">Tiền tệ</option>
            <option value="BOOLEAN">Có/Không</option>
            <option value="STRING">Chuỗi</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">Đang tải…</p>
      ) : error ? (
        <div
          style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'var(--error)' }}
          className="rounded-lg border p-4 text-sm"
        >
          {error}
        </div>
      ) : configs.length === 0 ? (
        <div
          style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
          className="rounded-lg border p-8 text-center"
        >
          <p className="text-sm">Chưa có cấu hình lương nào.</p>
        </div>
      ) : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['Mã', 'Mô tả', 'Giá trị', 'Loại', 'Phiên bản', 'Hiệu lực', 'Trạng thái'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configs.map((c, i) => (
                <tr
                  key={c.id}
                  className="transition-colors hover:opacity-90"
                  style={{ borderBottom: i < configs.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}
                >
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">{c.key}</td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3 max-w-xs truncate" title={c.description ?? ''}>
                    {c.description ?? '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs font-mono">
                    {formatValue(c.valueJson, c.valueType)}
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={c.valueType} /></td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">v{c.version}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {new Date(c.effectiveFrom).toLocaleDateString('vi-VN')}
                    {c.effectiveTo ? ` → ${new Date(c.effectiveTo).toLocaleDateString('vi-VN')}` : ' → ∞'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge active={c.isActive} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">
            Tổng: {total} cấu hình
          </div>
        </div>
      )}
    </div>
  );
}
