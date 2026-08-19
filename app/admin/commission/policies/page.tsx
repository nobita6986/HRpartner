/**
 * /admin/commission/policies — P2 Commission STEP-05 (RQ-06).
 *
 * Quản lý CommissionPolicy (ROOT/DIRECTOR write; READ cho HR/ACCOUNTANT).
 * CRUD + versioning: edit = tạo version mới.
 */
'use client';

import { useEffect, useState } from 'react';

interface Policy {
  id: string;
  name: string;
  calcType: string;
  value: string; // BigInt → string
  conditions: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const CALC_TYPES = ['PER_HEAD_MILESTONE', 'PERCENT_OF_REVENUE'] as const;
type CalcType = typeof CALC_TYPES[number];

export default function AdminCommissionPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    calcType: 'PER_HEAD_MILESTONE' as CalcType,
    value: '0',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/commission-policies');
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? d.error ?? 'Fetch failed');
      setPolicies(d.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({
      name: '',
      calcType: 'PER_HEAD_MILESTONE',
      value: '0',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: '',
    });
    setShowForm(true);
  }

  function openEdit(p: Policy) {
    setEditId(p.id);
    setForm({
      name: p.name,
      calcType: p.calcType as CalcType,
      value: p.value,
      effectiveFrom: p.effectiveFrom,
      effectiveTo: p.effectiveTo ?? '',
    });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: form.name,
      calcType: form.calcType,
      value: form.value,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
    };
    const idempKey = `${editId ?? 'create'}-${Date.now()}`;
    const url = editId
      ? `/api/admin/commission-policies/${editId}`
      : '/api/admin/commission-policies';
    const method = editId ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': idempKey,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(`${d.error ?? 'ERR'}: ${d.message ?? 'Failed'}`);
      return;
    }
    setShowForm(false);
    await load();
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--on-surface)' }}>
              Commission Policies
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Cấu hình chính sách hoa hồng — tạo mới hoặc sửa (version++)
            </p>
          </div>
          <button
            onClick={openCreate}
            className="py-2 px-4 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}
          >
            + Tạo Policy
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--outline)' }}
        >
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--primary-container)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Calc Type</th>
                <th className="text-right px-4 py-3 font-semibold">Value (VND)</th>
                <th className="text-center px-4 py-3 font-semibold">Version</th>
                <th className="text-left px-4 py-3 font-semibold">Effective</th>
                <th className="text-center px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                    Đang tải…
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                    Chưa có policy nào.
                  </td>
                </tr>
              ) : (
                policies.map((p, idx) => (
                  <tr key={p.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--on-surface)' }}>{p.name}</td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--on-surface-variant)' }}>{p.calcType}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {Number(p.value).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-mono">v{p.version}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {p.effectiveFrom} → {p.effectiveTo ?? '∞'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}
                      >
                        New Version
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
            <div
              className="bg-white rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
              style={{ backgroundColor: 'var(--surface-container-lowest)' }}
            >
              <h2 className="text-xl font-semibold mb-4">
                {editId ? 'Tạo version mới' : 'Tạo Policy mới'}
              </h2>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Calc Type</label>
                  <select
                    value={form.calcType}
                    onChange={(e) => setForm({ ...form, calcType: e.target.value as CalcType })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {CALC_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Value {form.calcType === 'PER_HEAD_MILESTONE' ? '(VND per head)' : '(basis points)'}
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Effective From</label>
                    <input
                      required
                      type="date"
                      value={form.effectiveFrom}
                      onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Effective To (opt)</label>
                    <input
                      type="date"
                      value={form.effectiveTo}
                      onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm rounded font-medium"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}
                  >
                    {editId ? 'Tạo version mới' : 'Tạo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
