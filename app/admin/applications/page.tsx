'use client';

/**
 * /admin/applications — MP-2 STEP-05 (RQ-05/RQ-06/RQ-07, DEC-05/DEC-06).
 *
 * Authenticated HR/Sale application queue + detail + the single MP-2 status
 * action (NEW ↔ NEEDS_INFO, reason required). Consumes the RLS-scoped routes
 * under /api/admin/applications. DEC-06: only ADMIN/HR_MANAGER/DIRECTOR/SALE may
 * read the queue — the server returns 403 for anyone else (incl. HR_STAFF), and
 * this page renders a dedicated no-permission state for that case.
 */

import { useState, useEffect } from 'react';

interface Row {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  slotId: string | null;
  projectId: string | null;
  projectName: string | null;
  publicTrackingCode: string | null;
  source: 'PUBLIC' | 'VENDOR' | 'CTV';
  createdAt: string;
}

interface HistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
}

interface Detail extends Row {
  cccdNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  experience: string | null;
  cvFileName: string | null;
  cvMimeType: string | null;
  cvSizeBytes: number | null;
  consentAt: string | null;
  statusHistory: HistoryEntry[];
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới', NEEDS_INFO: 'Cần bổ sung', SCREENING: 'Đang xét',
  QUALIFIED: 'Đạt', REJECTED: 'Từ chối', WITHDRAWN: 'Đã rút', CONVERTED: 'Đã nhận',
};
// DEC-05: MP-2 owns ONLY the NEW ↔ NEEDS_INFO pair.
const MP2_TARGET: Record<string, string | null> = { NEW: 'NEEDS_INFO', NEEDS_INFO: 'NEW' };
const SOURCE_LABELS: Record<string, string> = { PUBLIC: 'Công khai', VENDOR: 'NCC', CTV: 'CTV' };

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
}

export default function AdminApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(''); setForbidden(false);
      try {
        const params = new URLSearchParams();
        if (source) params.set('source', source);
        if (status) params.set('status', status);
        if (searchTerm) params.set('q', searchTerm);
        const res = await fetch(`/api/admin/applications?${params.toString()}`, { cache: 'no-store' });
        if (cancelled) return;
        if (res.status === 403) { setForbidden(true); setRows([]); setTotal(0); return; }
        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        if (!res.ok) { setError(typeof data?.message === 'string' ? data.message : 'Không tải được danh sách.'); return; }
        setRows((data.applications as Row[]) ?? []); setTotal((data.total as number) ?? 0);
      } catch {
        if (!cancelled) setError('Không thể kết nối máy chủ.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [source, status, searchTerm, refreshKey]);

  async function openDetail(id: string) {
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (res.ok) setSelected(data.application as Detail);
    } catch { /* ignore — panel simply will not open */ }
  }
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className='p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h1 className='text-2xl font-bold' style={{ color: 'var(--on-surface)' }}>Đơn ứng tuyển</h1>
        <span className='text-sm' style={{ color: 'var(--on-surface-variant)' }}>{total} hồ sơ</span>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setSearchTerm(q.trim()); }} className='flex flex-wrap gap-2 mb-4'>
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label='Nguồn' className='px-3 py-2 rounded-lg border' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}>
          <option value=''>Tất cả nguồn</option>
          <option value='PUBLIC'>Công khai</option>
          <option value='VENDOR'>NCC</option>
          <option value='CTV'>CTV</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label='Trạng thái' className='px-3 py-2 rounded-lg border' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}>
          <option value=''>Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Tên / SĐT / mã tra cứu' aria-label='Tìm kiếm' className='flex-1 min-w-[180px] px-3 py-2 rounded-lg border' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }} />
        <button type='submit' className='px-4 py-2 rounded-lg font-medium' style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}>Lọc</button>
      </form>
      {forbidden ? (
        <div className='rounded-lg p-8 text-center' style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}>
          Bạn không có quyền xem hàng đợi đơn ứng tuyển.
        </div>
      ) : error ? (
        <div className='rounded-lg p-8 text-center' role='alert' style={{ color: 'var(--error, #dc2626)' }}>{error}</div>
      ) : loading ? (
        <div className='rounded-lg p-8 text-center' style={{ color: 'var(--on-surface-variant)' }}>Đang tải…</div>
      ) : rows.length === 0 ? (
        <div className='rounded-lg p-8 text-center' style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}>Không có hồ sơ nào.</div>
      ) : (
        <div className='overflow-x-auto rounded-lg border' style={{ borderColor: 'var(--outline)' }}>
          <table className='w-full text-sm' style={{ color: 'var(--on-surface)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}>
                <th className='text-left px-3 py-2 font-medium'>Họ tên</th>
                <th className='text-left px-3 py-2 font-medium'>SĐT</th>
                <th className='text-left px-3 py-2 font-medium'>Dự án</th>
                <th className='text-left px-3 py-2 font-medium'>Nguồn</th>
                <th className='text-left px-3 py-2 font-medium'>Trạng thái</th>
                <th className='text-left px-3 py-2 font-medium'>Mã tra cứu</th>
                <th className='text-left px-3 py-2 font-medium'>Ngày nộp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => openDetail(r.id)} className='cursor-pointer border-t hover:bg-black/5' style={{ borderColor: 'var(--outline)' }}>
                  <td className='px-3 py-2'>{r.fullName}</td>
                  <td className='px-3 py-2'>{r.phone}</td>
                  <td className='px-3 py-2'>{r.projectName ?? '—'}</td>
                  <td className='px-3 py-2'>{SOURCE_LABELS[r.source] ?? r.source}</td>
                  <td className='px-3 py-2'>{STATUS_LABELS[r.status] ?? r.status}</td>
                  <td className='px-3 py-2 font-mono text-xs'>{r.publicTrackingCode ?? '—'}</td>
                  <td className='px-3 py-2 whitespace-nowrap'>{fmt(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <DetailPanel detail={selected} onClose={() => setSelected(null)} onDone={() => { refresh(); setSelected(null); }} />
      )}
    </div>
  );
}

function DetailPanel({ detail, onClose, onDone }: { detail: Detail; onClose: () => void; onDone: () => void }) {
  const target = MP2_TARGET[detail.status] ?? null;
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!target) return;
    if (!reason.trim()) { setErr('Vui lòng nhập lý do.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(detail.id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: target, reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) { setErr(typeof data?.message === 'string' ? data.message : 'Không cập nhật được trạng thái.'); return; }
      onDone();
    } catch { setErr('Không thể kết nối máy chủ.'); }
    finally { setSaving(false); }
  }

  return (
    <div className='fixed inset-0 z-50 flex justify-end' style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className='w-full max-w-md h-full overflow-y-auto p-6' style={{ backgroundColor: 'var(--surface)' }}>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold' style={{ color: 'var(--on-surface)' }}>{detail.fullName}</h2>
          <button onClick={onClose} aria-label='Đóng' className='p-1 rounded hover:bg-black/10' style={{ color: 'var(--on-surface)' }}>✕</button>
        </div>
        <dl className='text-sm grid grid-cols-3 gap-y-2 mb-6' style={{ color: 'var(--on-surface-variant)' }}>
          <dt>SĐT</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{detail.phone}</dd>
          <dt>CCCD</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{detail.cccdNumber ?? '—'}</dd>
          <dt>Dự án</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{detail.projectName ?? '—'}</dd>
          <dt>Nguồn</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{SOURCE_LABELS[detail.source] ?? detail.source}</dd>
          <dt>Mã</dt><dd className='col-span-2 font-mono text-xs' style={{ color: 'var(--on-surface)' }}>{detail.publicTrackingCode ?? '—'}</dd>
          <dt>CV</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{detail.cvFileName ?? '—'}</dd>
          <dt>Trạng thái</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{STATUS_LABELS[detail.status] ?? detail.status}</dd>
        </dl>
        <h3 className='text-sm font-semibold mb-2' style={{ color: 'var(--on-surface)' }}>Lịch sử trạng thái</h3>
        <ul className='text-xs mb-6 flex flex-col gap-1' style={{ color: 'var(--on-surface-variant)' }}>
          {detail.statusHistory.length === 0 && <li>—</li>}
          {detail.statusHistory.map((h) => (
            <li key={h.id}>
              {fmt(h.createdAt)}: {h.fromStatus ? (STATUS_LABELS[h.fromStatus] ?? h.fromStatus) : '∅'} → {STATUS_LABELS[h.toStatus] ?? h.toStatus}{h.reason ? ` — ${h.reason}` : ''}
            </li>
          ))}
        </ul>
        {target ? (
          <div className='rounded-lg p-4' style={{ backgroundColor: 'var(--surface-container)' }}>
            <p className='text-sm mb-2' style={{ color: 'var(--on-surface)' }}>Chuyển sang: <strong>{STATUS_LABELS[target]}</strong></p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder='Lý do (bắt buộc)' rows={3} className='w-full px-3 py-2 rounded-lg border mb-2' style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }} />
            {err && <p className='text-sm mb-2' role='alert' style={{ color: 'var(--error, #dc2626)' }}>{err}</p>}
            <button onClick={submit} disabled={saving} className='px-4 py-2 rounded-lg font-medium disabled:opacity-50' style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}>
              {saving ? 'Đang lưu…' : 'Cập nhật'}
            </button>
          </div>
        ) : (
          <p className='text-xs' style={{ color: 'var(--on-surface-variant)' }}>Các chuyển trạng thái khác thuộc giai đoạn sau (MP-3).</p>
        )}
      </div>
    </div>
  );
}
