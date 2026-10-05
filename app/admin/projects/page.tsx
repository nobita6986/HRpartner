'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { RowLink } from '@/src/shared/ui/navigation/row-link';
import { StatusBadge } from '@/src/shared/ui/status-badge';
import {
  PROJECT_MODULE,
  projectPublishColumnLabel,
  projectPublishColumnTone,
} from '@/src/domains/projects/project-ui';

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  clientCompanyId: string;
  startDate: string;
  createdAt: string;
  /** Chỉ tiêu nhân sự. Quota 0 sẽ chặn lần chuyển ứng viên đầu tiên. */
  quota?: number | null;
  siteAddress?: string | null;
  // hrp-t1a-introduce-hrp-and-menu-cleanup: ported from /admin/jobs/page.tsx
  // for the merged Slot trống / Trạng thái công bố / Công bố columns.
  isPublic: boolean;
  version: number;
}

interface ProjectsResponse {
  projects: ProjectRow[];
  total: number;
  take: number;
  skip: number;
}

// ── hrp-t1a-introduce-hrp-and-menu-cleanup: helpers ported verbatim
//    from the old /admin/jobs/page.tsx so the slot + publish semantics
//    stay byte-identical. The T0 directive §B.6 explicitly requires the
//    công thức tính slot, publish service, API và dữ liệu not to change.
// ───────────────────────────────────────────────────────────────────
interface OrderSlot {
  slotsNeeded: number;
  slotsFilled: number;
  validTo: string | null;
}

interface StaffingOrderRow {
  id: string;
  projectId: string;
  status: string;
  deadlineDate: string | null;
  slots: OrderSlot[];
}

/** Giống PUBLISHABLE_ORDER_STATUSES trong publish.service.ts. */
const PUBLISHABLE_ORDER_STATUSES = new Set(['OPEN', 'CLOSING_SOON']);
/** API chặn take ≤ 50 và trả `total` → phải phân trang mới cộng đủ. */
const ORDERS_PAGE_SIZE = 50;
const ORDERS_MAX_PAGES = 10;

/** Số slot còn trống của từng dự án. Không có khoá = dự án không có đơn hợp lệ. */
function freeSlotsByProject(orders: StaffingOrderRow[], now: Date): Map<string, number> {
  const byProject = new Map<string, number>();
  for (const order of orders) {
    if (!PUBLISHABLE_ORDER_STATUSES.has(order.status)) continue;
    if (order.deadlineDate && new Date(order.deadlineDate) < now) continue;
    let free = 0;
    for (const slot of order.slots ?? []) {
      if (slot.validTo && new Date(slot.validTo) < now) continue;
      free += Math.max(0, (slot.slotsNeeded ?? 0) - (slot.slotsFilled ?? 0));
    }
    byProject.set(order.projectId, (byProject.get(order.projectId) ?? 0) + free);
  }
  return byProject;
}
// ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Nháp',     color: '#37474f', bg: '#eceff1' },
  ACTIVE:    { label: 'Hoạt động', color: '#197a56', bg: '#e8f5e9' },
  PAUSED:    { label: 'Tạm dừng', color: '#e65100', bg: '#fff3e0' },
  COMPLETED: { label: 'Hoàn thành', color: '#1565c0', bg: '#e3f2fd' },
  CANCELLED: { label: 'Đã hủy',    color: '#c62828', bg: '#ffebee' },
};

function LifecycleStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#37474f', bg: '#eceff1' };
  return <span style={{ background: cfg.bg, color: cfg.color }} className="rounded-full px-2 py-0.5 text-xs font-semibold">{cfg.label}</span>;
}

// hrp-t1a-introduce-hrp-and-menu-cleanup: StatusBadgeCell for the publish
// column. Identical to the one that previously lived in /admin/jobs/page.tsx.
function StatusBadgeCell({ project }: { project: ProjectRow }) {
  // T1B Wave 2 (EP §3.2.1): publish column is column-derived from
  // (isPublic, status) — CLOSED wins over isPublic. Vietnamese label
  // is read from the Project domain-owned dictionary; raw enum never
  // rendered as operator-facing text.
  const label = projectPublishColumnLabel(Boolean(project.isPublic), String(project.status));
  const tone = projectPublishColumnTone(Boolean(project.isPublic), String(project.status));
  return (
    <StatusBadge module={PROJECT_MODULE} status={label} tone={tone} testId={`project-publish-badge-${project.id}`}>
      {label}
    </StatusBadge>
  );
}

function Modal({ onClose, onSuccess, editData, clientCompanies }: {
  onClose: () => void; onSuccess: () => void; editData?: ProjectRow;
  clientCompanies: Array<{ id: string; code: string; name: string }>;
}) {
  const [code, setCode] = useState(editData?.code ?? '');
  const [name, setName] = useState(editData?.name ?? '');
  const [clientCompanyId, setClientCompanyId] = useState(editData?.clientCompanyId ?? '');
  const [startDate, setStartDate] = useState(editData?.startDate?.slice(0, 10) ?? '');
  const [status, setStatus] = useState<string>(editData?.status ?? 'DRAFT');
  const [quota, setQuota] = useState(
    editData?.quota === null || editData?.quota === undefined ? '' : String(editData.quota),
  );
  const [siteAddress, setSiteAddress] = useState(editData?.siteAddress ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const isEdit = !!editData;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && (!code.trim() || !name.trim() || !clientCompanyId || !startDate)) {
      setErr('Điền đầy đủ các trường bắt buộc.');
      return;
    }
    if (isEdit && (!name.trim() || !clientCompanyId || !startDate)) {
      setErr('Điền đầy đủ các trường bắt buộc.');
      return;
    }
    const quotaText = quota.trim();
    const quotaNumber = quotaText === '' ? null : Number(quotaText);
    if (quotaNumber !== null && (!Number.isInteger(quotaNumber) || quotaNumber < 0)) {
      setErr('Chỉ tiêu nhân sự phải là số nguyên không âm.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const url = isEdit ? `/api/projects/${editData.id}` : '/api/projects';
      const method = isEdit ? 'PUT' : 'POST';
      const body: Record<string, string | number> = {};
      if (!isEdit) body.code = code.trim();
      body.name = name.trim();
      body.clientCompanyId = clientCompanyId;
      body.startDate = startDate;
      body.status = status;
      // Để trống thì không gửi: tạo mới API mặc định 0, sửa thì giữ giá trị cũ.
      if (quotaNumber !== null) body.quota = quotaNumber;
      if (siteAddress.trim()) body.siteAddress = siteAddress.trim();

      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); setErr(d.message ?? `Lỗi ${r.status}`); return; }
      onSuccess();
      onClose();
    } catch { setErr('Lỗi kết nối server.'); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div style={{ background: 'var(--surface-container-lowest)' }} className="w-full max-w-md rounded-lg border p-6 shadow-xl" onClick={ev => ev.stopPropagation()}>
        <h2 style={{ color: 'var(--on-surface)' }} className="mb-4 text-lg font-semibold">{isEdit ? 'Sửa dự án' : 'Thêm dự án mới'}</h2>
        <form onSubmit={submit} className="space-y-4">
          {!isEdit && (
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Mã dự án *</label>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="VD: PRJ-2026-001"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm font-mono" required />
            </div>
          )}
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Tên dự án *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Yên Phong Factory"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" required />
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Khách hàng *</label>
            <select value={clientCompanyId} onChange={e => setClientCompanyId(e.target.value)}
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" required>
              <option value="">-- Chọn khách hàng --</option>
              {clientCompanies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Ngày bắt đầu *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" required />
            </div>
            {isEdit && (
              <div>
                <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Trạng thái</label>
                <select value={status} onChange={e => setStatus(e.target.value as string)}
                  style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="DRAFT">Nháp</option>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="PAUSED">Tạm dừng</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Chỉ tiêu nhân sự (quota)</label>
            <input type="number" min={0} step={1} value={quota} onChange={e => setQuota(e.target.value)} placeholder="VD: 20"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" />
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
              Để trống nghĩa là 0. Quota 0 sẽ chặn lần chuyển ứng viên đầu tiên vào dự án.
            </p>
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Địa chỉ công trường</label>
            <input value={siteAddress} onChange={e => setSiteAddress(e.target.value)} placeholder="VD: KCN Yên Phong, Bắc Ninh"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" />
          </div>
          {err && <p style={{ color: 'var(--error)' }} className="text-sm">{err}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }} className="rounded px-4 py-2 text-sm">Hủy</button>
            <button type="submit" disabled={submitting} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }} className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {submitting ? 'Đang lưu…' : isEdit ? 'Lưu' : 'Thêm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clientCompanies, setClientCompanies] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState<ProjectRow | null>(null);

  // hrp-t1a-introduce-hrp-and-menu-cleanup: state ported from
  // /admin/jobs/page.tsx for the merged Slot trống + Công bố columns.
  /** Lỗi khi bật/tắt tin — bảng vẫn còn dữ liệu, in thành dải cảnh báo phía trên. */
  const [actionError, setActionError] = useState('');
  /**
   * Slot trống theo project id. `null` = chưa đọc đủ đơn tuyển dụng nên chưa biết
   * (in dấu gạch), khác hoàn toàn với "biết chắc là 0".
   */
  const [freeSlots, setFreeSlots] = useState<Map<string, number> | null>(null);
  const [slotsNote, setSlotsNote] = useState('');

  const loadClients = useCallback(async () => {
    try {
      const r = await fetch('/api/clients?take=100');
      if (r.ok) {
        const d = await r.json();
        setClientCompanies(d.clients ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const r = await fetch(`/api/projects?${params}`);
      if (!r.ok) { if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; } if (r.status === 403) { setError('Bạn không có quyền xem dự án.'); return; } throw new Error(`${r.status}`); }
      const d: ProjectsResponse = await r.json();
      setProjects(
        d.projects.map((p) => ({
          ...p,
          // hrp-t1a-introduce-hrp-and-menu-cleanup: cột isPublic / version
          // mặc định an toàn khi API chưa trả về (giữ render không crash).
          isPublic: (p as Partial<ProjectRow>).isPublic ?? false,
          version: (p as Partial<ProjectRow>).version ?? 1,
        })),
      );
      setTotal(d.total);
    } catch { setError('Không thể tải danh sách dự án.'); } finally { setLoading(false); }
  }, [statusFilter, search]);

  // hrp-t1a-introduce-hrp-and-menu-cleanup: gọi /api/projects?take=50 đã
  // đủ trả isPublic + version, nên KHÔNG cần fetch lại. Effect cũ ở
  // /admin/jobs/page.tsx gọi /api/projects?take=50 để tải cùng payload
  // rồi map sang Job interface; ở đây payload trùng nên dùng luôn.

  // hrp-t1a-introduce-hrp-and-menu-cleanup: effect fetch slot trống theo
  // đơn tuyển dụng — byte-ported từ /admin/jobs/page.tsx.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const collected: StaffingOrderRow[] = [];
      let skip = 0;
      let total = 0;
      let pages = 0;

      try {
        for (;;) {
          const response = await fetch(`/api/staffing/orders?take=${ORDERS_PAGE_SIZE}&skip=${skip}`);
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message ?? payload.error ?? 'Không thể tải đơn tuyển dụng');
          }
          const page: StaffingOrderRow[] = Array.isArray(payload.orders) ? payload.orders : [];
          collected.push(...page);
          total = Number(payload.total ?? collected.length);
          skip += ORDERS_PAGE_SIZE;
          pages += 1;
          if (collected.length >= total || page.length === 0) break;
          if (pages >= ORDERS_MAX_PAGES) {
            // Chưa phủ hết → thà để dấu gạch còn hơn in một con số thiếu.
            if (!cancelled) {
              setFreeSlots(null);
              setSlotsNote(
                `Mới đọc ${collected.length}/${total} đơn tuyển dụng nên chưa tính được slot trống. Hãy lọc bớt đơn đã đóng rồi tải lại.`,
              );
            }
            return;
          }
        }
        if (cancelled) return;
        setFreeSlots(freeSlotsByProject(collected, new Date()));
        setSlotsNote('');
      } catch (error) {
        if (cancelled) return;
        setFreeSlots(null);
        setSlotsNote(
          error instanceof Error
            ? `Không đọc được đơn tuyển dụng để tính slot trống: ${error.message}`
            : 'Không đọc được đơn tuyển dụng để tính slot trống.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // hrp-t1a-introduce-hrp-and-menu-cleanup: dịch mã lỗi của API publish
  // sang câu tiếng Việt mà người điều hành đọc được — byte-ported từ
  // /admin/jobs/page.tsx.
  const publishErrorText = (project: ProjectRow, code: string, message?: string) => {
    switch (code) {
      case 'INVALID_STATE':
        return `Dự án ${project.code} chưa có đơn tuyển dụng đang mở còn slot trống nên chưa đăng tin được.`;
      case 'STALE_VERSION':
        return `Dự án ${project.code} vừa được người khác sửa. Hãy tải lại trang rồi thử lại.`;
      case 'NOT_FOUND':
        return `Không còn thấy dự án ${project.code} trong hệ thống.`;
      case 'FORBIDDEN':
        return `Tài khoản hiện tại không có quyền đăng/tắt tin của dự án ${project.code}.`;
      default:
        return `Không cập nhật được tin của dự án ${project.code}${message ? `: ${message}` : '.'}`;
    }
  };

  // hrp-t1a-introduce-hrp-and-menu-cleanup: handler byte-ported từ
  // /admin/jobs/page.tsx. Cùng endpoint, cùng x-idempotency-key, cùng payload.
  const handlePublish = async (project: ProjectRow) => {
    const turningOn = !project.isPublic;
    const key = `admin-project-${project.id}-${project.version}-${turningOn ? 'publish' : 'unpublish'}`;
    try {
      const response = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-idempotency-key': key },
        body: JSON.stringify({
          isPublic: turningOn,
          expectedVersion: project.version,
          reason: turningOn ? 'Đăng tin từ trang quản trị' : 'Tắt tin từ trang quản trị',
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(publishErrorText(project, String(payload.error ?? ''), payload.message));
      }
      setProjects((current) => current.map((item) => item.id === project.id ? { ...item, isPublic: payload.project.isPublic, version: payload.project.version } : item));
      // Thao tác sau thành công thì dải cảnh báo cũ phải tắt.
      setActionError('');
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : `Không cập nhật được tin của dự án ${project.code}.`,
      );
    }
  };

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Dự án</h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">Module M5 — Quản lý master data dự án</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }} className="rounded px-4 py-2 text-sm font-semibold">+ Thêm dự án</button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Tìm kiếm…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="rounded border px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          {['', 'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ borderColor: statusFilter === s ? 'var(--primary)' : 'var(--outline-variant)', background: statusFilter === s ? 'var(--primary-container)' : 'var(--surface-container-lowest)', color: statusFilter === s ? 'var(--on-primary-container)' : 'var(--on-surface-variant)' }}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors">
              {s === '' ? 'Tất cả' : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">Đang tải…</p>
      : error ? <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'var(--error)' }} className="rounded-lg border p-4 text-sm">{error}</div>
      : projects.length === 0 ? <div style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="rounded-lg border p-8 text-center"><p className="text-sm">Chưa có dự án công khai.</p></div>
      : (
        <div className="space-y-4">
          {/* hrp-t1a-introduce-hrp-and-menu-cleanup: dải cảnh báo khi
              bật/tắt tin lỗi — byte-ported từ /admin/jobs/page.tsx. */}
          {actionError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
              style={{ borderColor: '#f5b5b5', backgroundColor: '#fdecec', color: '#8a1c1c' }}
            >
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError('')}
                className="shrink-0 font-medium underline"
              >
                Đóng
              </button>
            </div>
          )}
          {slotsNote && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ borderColor: 'var(--outline)', color: 'var(--on-surface-variant)' }}
            >
              {slotsNote}
            </div>
          )}
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {/* hrp-t1a-introduce-hrp-and-menu-cleanup: thêm 3 cột Slot trống /
                    Trạng thái công bố / Công bố — byte-ported từ /admin/jobs/page.tsx. */}
                {['Mã dự án', 'Tên dự án', 'Trạng thái', 'Slot trống', 'Trạng thái công bố', 'Ngày bắt đầu', 'Ngày tạo', 'Hành động', 'Công bố'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => {
                // undefined = chưa/không đọc được đơn hợp lệ của dự án → in dấu gạch.
                // 0 = đơn hợp lệ đã xác nhận hết slot → chặn luôn nút Công bố.
                const knownFree = freeSlots?.get(p.id);
                const blockPublish = !p.isPublic && knownFree === 0;
                return (
                <tr key={p.id} className="relative transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]" style={{ borderBottom: i < projects.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}>
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">
                    <RowLink href={`/admin/projects/${p.id}`}>{p.code}</RowLink>
                  </td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3"><LifecycleStatusBadge status={p.status} /></td>
                  {/* hrp-t1a-introduce-hrp-and-menu-cleanup: cột Slot trống */}
                  <td
                    className="px-4 py-3 text-center"
                    style={{ color: 'var(--on-surface-variant)' }}
                    title={knownFree === undefined ? 'Chưa đọc được đơn tuyển dụng hợp lệ của dự án này.' : 'Tổng slot còn trống của các đơn đang mở, còn hạn.'}
                  >
                    {knownFree === undefined ? '—' : knownFree}
                  </td>
                  {/* hrp-t1a-introduce-hrp-and-menu-cleanup: cột Trạng thái công bố */}
                  <td className="px-4 py-3 text-center">
                    <StatusBadgeCell project={p} />
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{new Date(p.startDate).toLocaleDateString('vi-VN')}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3"><button onClick={() => setEditRow(p)} style={{ color: 'var(--primary)' }} className="relative z-10 text-xs font-medium hover:underline">Sửa</button></td>
                  {/* hrp-t1a-introduce-hrp-and-menu-cleanup: cột Công bố */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handlePublish(p)}
                      disabled={blockPublish}
                      title={blockPublish ? 'Dự án chưa có đơn tuyển dụng đang mở còn slot trống.' : undefined}
                      className="px-3 py-1 text-sm font-medium rounded border disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
                    >
                      {p.isPublic ? 'Bỏ công bố dự án' : 'Công bố dự án'}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">Tổng: {total} dự án</div>
        </div>
        </div>
      )}

      {showCreate && <Modal onClose={() => setShowCreate(false)} onSuccess={load} clientCompanies={clientCompanies} />}
      {editRow && <Modal onClose={() => setEditRow(null)} onSuccess={load} editData={editRow} clientCompanies={clientCompanies} />}
    </div>
  );
}
