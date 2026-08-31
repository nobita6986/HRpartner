'use client';

/**
 * /admin/applications — MP-3C STEP-07 (RQ-09).
 *
 * The authenticated HR/Sale queue plus the full MP-3 review drawer: the
 * screen → qualify → reject → convert (dedup-aware) → placement (preview →
 * override → activate) pipeline. Every decision (which action a status/role may
 * take, gating, conflict labels) comes from `placement-ui.ts`; every piece of
 * markup is a controlled component from `placement-panel.tsx`. This page only
 * wires state to the RLS-scoped API routes — the server re-checks every gate,
 * so the UI is a convenience, never the authority (DEC-04).
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActionBar,
  DedupPicker,
  PlacementPanel,
  type DedupCandidateDto,
  type OverrideValue,
  type PlacementPreviewDto,
} from '@/src/domains/applications/placement-panel';
import {
  activateGate,
  availableActions,
  conflictLabel,
  newIdempotencyKey,
  previewSubmitGate,
  SOURCE_LABELS,
  STATUS_LABELS,
  toIsoOrEmpty,
  type ActionId,
  type PlacementFormState,
} from '@/src/domains/applications/placement-ui';

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

/* MP-3 detail additions (RQ-08) — IDs / codes / counters only, never rate/margin. */
interface SourceClaimDto { id: string; claimType: string; registrationChannel: string; accepted: boolean }
interface DedupFactsDto { dedupWorkerId: string | null; mergedWorkerId: string | null; blockCode: string | null; overrideCase: string | null }
interface AssignmentDto {
  assignmentId: string; status: string; projectId: string;
  staffingOrderId: string | null; staffingOrderSlotId: string | null;
  employeeCode: string; employmentType: string; validFrom: string | null; validTo: string | null;
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
  version: number;
  workerId: string | null;
  sourceClaim: SourceClaimDto | null;
  dedup: DedupFactsDto;
  assignment: AssignmentDto | null;
}

// DEC-05: MP-2 owns ONLY the NEW ↔ NEEDS_INFO pair; MP-3 actions drive the rest.
const MP2_TARGET: Record<string, string | null> = { NEW: 'NEEDS_INFO', NEEDS_INFO: 'NEW' };

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
}

/* Prefer a server message; otherwise translate the stable error code to Vietnamese. */
function messageOf(data: unknown): string {
  const d = (data ?? {}) as { message?: unknown; error?: unknown };
  if (typeof d.message === 'string' && d.message) return d.message;
  if (typeof d.error === 'string' && d.error) return conflictLabel(d.error);
  return 'Có lỗi xảy ra.';
}

export default function AdminApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Viewer role — drives which lifecycle actions the drawer offers (the server
  // is still the authority and re-checks every gate). /api/me returns { role } only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (cancelled || !res.ok) return;
        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        if (typeof data.role === 'string') setRole(data.role);
      } catch { /* role stays empty → drawer offers no actions until known */ }
    })();
    return () => { cancelled = true; };
  }, []);

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
  // After any drawer mutation: re-read the detail in place (new status/version/
  // assignment) and refresh the list counters. The drawer stays open so HR can
  // continue the pipeline (screen → qualify → convert → placement) uninterrupted.
  const onChanged = (id: string) => { openDetail(id); refresh(); };

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
                <tr key={r.id} onClick={() => openDetail(r.id)} className='cursor-pointer border-t transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]' style={{ borderColor: 'var(--outline)' }}>
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
        <DetailPanel
          detail={selected}
          role={role}
          onClose={() => setSelected(null)}
          onChanged={() => onChanged(selected.id)}
        />
      )}
    </div>
  );
}

function DetailPanel({ detail, role, onClose, onChanged }: {
  detail: Detail;
  role: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  // Lifecycle actions (screen/qualify/reject/convert) share one reason field.
  const [pending, setPending] = useState<ActionId | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [panelError, setPanelError] = useState('');
  const [panelSuccess, setPanelSuccess] = useState('');

  // Dedup-aware convert (AC-08): candidates surface when the server asks for review.
  const [dedup, setDedup] = useState<DedupCandidateDto[] | null>(null);
  const [dedupSelected, setDedupSelected] = useState<string | null>(null);

  // Placement sub-flow (preview → override → activate).
  const [showPlacement, setShowPlacement] = useState(false);
  const [form, setForm] = useState<PlacementFormState>({ employeeCode: '', employmentType: '', validFrom: '', validTo: '', workSetting: '' });
  const [preview, setPreview] = useState<PlacementPreviewDto | null>(null);
  const [dirtySincePreview, setDirty] = useState(false);
  const [placementReason, setPlacementReason] = useState('');
  const [override, setOverride] = useState<OverrideValue>({ overrideCase: '', reason: '', evidence: '' });
  const [previewing, setPreviewing] = useState(false);
  const [activating, setActivating] = useState(false);
  // One idempotency key per activation attempt; any edit to the payload mints a
  // fresh one so a retry of the SAME payload replays, a changed payload does not
  // collide (DEC-08).
  const idemKey = useRef(newIdempotencyKey());

  const target = MP2_TARGET[detail.status] ?? null;
  const subject = { status: detail.status, hasAssignment: Boolean(detail.assignment) };
  const actions = availableActions(subject, role);
  const needsReason = actions.some((a) => a !== 'placement');
  // The placement panel only ever renders for ADMIN/HR_MANAGER, so the override
  // form is offered; the server still enforces CAN_OVERRIDE_REFERRAL_GUARD and
  // returns OVERRIDE_DENIED if the actor actually lacks it.
  const canOverride = role === 'ADMIN' || role === 'HR_MANAGER';

  const previewGate = previewSubmitGate(form, previewing);
  const activateResult = activateGate({
    preview: preview ? { canActivate: preview.canActivate, conflicts: preview.conflicts } : null,
    reason: placementReason,
    pending: activating,
    dirtySincePreview,
    override: canOverride ? { overrideCase: override.overrideCase, reason: override.reason } : null,
    canOverride,
  });

  const jsonHeaders = { 'Content-Type': 'application/json' };

  async function runAction(action: ActionId) {
    setPanelError(''); setPanelSuccess('');
    if (action === 'placement') { setShowPlacement(true); return; }
    if (!actionReason.trim()) { setPanelError('Vui lòng nhập lý do.'); return; }
    if (action === 'convert') { await doConvert(); return; }
    setPending(action);
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(detail.id)}/actions/${action}`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ reason: actionReason.trim(), expectedVersion: detail.version }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPanelError(messageOf(data)); return; }
      setActionReason(''); setPanelSuccess('Đã cập nhật trạng thái.'); onChanged();
    } catch { setPanelError('Không thể kết nối máy chủ.'); }
    finally { setPending(null); }
  }

  async function doConvert(existingWorkerId?: string) {
    setPending('convert');
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(detail.id)}/actions/convert`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({
          reason: actionReason.trim(), expectedVersion: detail.version,
          ...(existingWorkerId ? { existingWorkerId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDedup(null); setDedupSelected(null); setActionReason('');
        setPanelSuccess('Đã nhận vào — tạo Worker.'); onChanged(); return;
      }
      if (data?.error === 'DEDUP_REVIEW_REQUIRED' || data?.error === 'DEDUP_SELECTION_INVALID') {
        setDedup((data?.details?.candidates ?? []) as DedupCandidateDto[]);
        if (data.error === 'DEDUP_SELECTION_INVALID') setPanelError('Lựa chọn không hợp lệ — chọn lại người trùng.');
        return;
      }
      setPanelError(messageOf(data));
    } catch { setPanelError('Không thể kết nối máy chủ.'); }
    finally { setPending(null); }
  }

  async function submitMp2() {
    if (!target) return;
    if (!actionReason.trim()) { setPanelError('Vui lòng nhập lý do.'); return; }
    setPending('screen'); // reuse the busy flag to disable the row
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(detail.id)}/status`, {
        method: 'PATCH', headers: jsonHeaders,
        body: JSON.stringify({ toStatus: target, reason: actionReason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPanelError(messageOf(data)); return; }
      setActionReason(''); setPanelSuccess('Đã cập nhật trạng thái.'); onChanged();
    } catch { setPanelError('Không thể kết nối máy chủ.'); }
    finally { setPending(null); }
  }

  // Editing any activation input mints a fresh idempotency key and forces a
  // re-preview so a stale preview can never authorise a write (DEC-03/DEC-08).
  function editForm(next: PlacementFormState) { setForm(next); setDirty(true); idemKey.current = newIdempotencyKey(); }
  function editReason(next: string) { setPlacementReason(next); idemKey.current = newIdempotencyKey(); }
  function editOverride(next: OverrideValue) { setOverride(next); idemKey.current = newIdempotencyKey(); }

  const placementBody = () => ({
    submissionId: detail.id,
    employeeCode: form.employeeCode.trim(),
    employmentType: form.employmentType,
    workSetting: form.workSetting || null,
    validFrom: toIsoOrEmpty(form.validFrom),
    validTo: toIsoOrEmpty(form.validTo) || null,
  });

  async function doPreview() {
    setPanelError(''); setPanelSuccess(''); setPreviewing(true);
    try {
      const res = await fetch('/api/admin/assignments/preview', {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify(placementBody()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPreview(null); setPanelError(messageOf(data)); return; }
      setPreview(data.preview as PlacementPreviewDto); setDirty(false);
    } catch { setPanelError('Không thể kết nối máy chủ.'); }
    finally { setPreviewing(false); }
  }

  async function doActivate() {
    setPanelError(''); setPanelSuccess(''); setActivating(true);
    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { ...jsonHeaders, 'Idempotency-Key': idemKey.current },
        body: JSON.stringify({
          ...placementBody(),
          reason: placementReason.trim(),
          override: canOverride && override.overrideCase
            ? { overrideCase: override.overrideCase, reason: override.reason.trim(), evidence: override.evidence.trim() || undefined }
            : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPanelError(messageOf(data)); return; }
      const asg = data.assignment as { assignmentId?: string } | undefined;
      idemKey.current = newIdempotencyKey(); // next attempt is a new activation
      setShowPlacement(false); setPreview(null);
      setPanelSuccess(`Đã xếp việc: ${asg?.assignmentId ?? ''}${data.replayed ? ' (đã ghi trước đó)' : ''}`);
      onChanged();
    } catch { setPanelError('Không thể kết nối máy chủ.'); }
    finally { setActivating(false); }
  }

  return (
    <div className='fixed inset-0 z-50 flex justify-end' style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className='w-full max-w-md h-full overflow-y-auto p-6 flex flex-col gap-4 shadow-2xl' style={{ backgroundColor: 'var(--surface)' }}>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold' style={{ color: 'var(--on-surface)' }}>{detail.fullName}</h2>
          <button onClick={onClose} aria-label='Đóng' className='flex h-11 w-11 shrink-0 items-center justify-center rounded transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]' style={{ color: 'var(--on-surface)' }}>✕</button>
        </div>

        <dl className='text-sm grid grid-cols-3 gap-y-2' style={{ color: 'var(--on-surface-variant)' }}>
          <dt>SĐT</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{detail.phone}</dd>
          <dt>CCCD</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{detail.cccdNumber ?? '—'}</dd>
          <dt>Dự án</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{detail.projectName ?? '—'}</dd>
          <dt>Nguồn</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{SOURCE_LABELS[detail.source] ?? detail.source}</dd>
          <dt>CV</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{detail.cvFileName ?? '—'}</dd>
          <dt>Trạng thái</dt><dd className='col-span-2' style={{ color: 'var(--on-surface)' }}>{STATUS_LABELS[detail.status] ?? detail.status} · v{detail.version}</dd>
          <dt>Worker</dt><dd className='col-span-2 font-mono text-xs' style={{ color: 'var(--on-surface)' }}>{detail.workerId ?? '—'}</dd>
          {detail.assignment && (
            <>
              <dt>Xếp việc</dt>
              <dd className='col-span-2 text-xs' data-testid='detail-assignment' style={{ color: 'var(--on-surface)' }}>
                {detail.assignment.employeeCode} · {STATUS_LABELS[detail.assignment.status] ?? detail.assignment.status} · {detail.assignment.employmentType}
              </dd>
            </>
          )}
        </dl>

        <div>
          <h3 className='text-sm font-semibold mb-2' style={{ color: 'var(--on-surface)' }}>Lịch sử trạng thái</h3>
          <ul className='text-xs flex flex-col gap-1' style={{ color: 'var(--on-surface-variant)' }}>
            {detail.statusHistory.length === 0 && <li>—</li>}
            {detail.statusHistory.map((h) => (
              <li key={h.id}>
                {fmt(h.createdAt)}: {h.fromStatus ? (STATUS_LABELS[h.fromStatus] ?? h.fromStatus) : '∅'} → {STATUS_LABELS[h.toStatus] ?? h.toStatus}{h.reason ? ` — ${h.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>

        {/* Shared reason — consumed by the lifecycle actions (screen/qualify/reject/
            convert) and the MP-2 NEW↔NEEDS_INFO toggle. Placement has its own reason. */}
        {(needsReason || target) && (
          <textarea
            data-testid='action-reason'
            aria-label='Lý do'
            placeholder='Lý do (bắt buộc)'
            rows={2}
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className='px-3 py-2 rounded-lg border'
            style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
          />
        )}

        {/* MP-3 lifecycle actions + the MP-2 toggle sit together as the decision row. */}
        <div className='flex flex-wrap items-center gap-2'>
          <ActionBar subject={subject} role={role} pending={pending} onAction={runAction} />
          {target && (
            <button
              type='button'
              data-testid='mp2-toggle'
              disabled={pending !== null}
              onClick={submitMp2}
              className='px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50'
              style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }}
            >
              {target === 'NEEDS_INFO' ? 'Yêu cầu bổ sung' : 'Đưa lại về Mới'}
            </button>
          )}
        </div>

        {/* Dedup review (convert flow, AC-08) — surfaces when the server flags duplicates. */}
        {dedup !== null && (
          <DedupPicker
            candidates={dedup}
            selected={dedupSelected}
            onSelect={setDedupSelected}
            onConfirm={() => { if (dedupSelected) void doConvert(dedupSelected); }}
            onCancel={() => { setDedup(null); setDedupSelected(null); }}
            pending={pending === 'convert'}
          />
        )}

        {/* Placement sub-flow: preview → (override) → activate. Panel messages route to
            the shared panelError/panelSuccess below, so its own slots stay empty. */}
        {showPlacement && (
          <PlacementPanel
            form={form}
            onFormChange={editForm}
            preview={preview}
            previewGate={previewGate}
            activateGateResult={activateResult}
            reason={placementReason}
            onReasonChange={editReason}
            override={override}
            onOverrideChange={editOverride}
            canOverride={canOverride}
            onPreview={doPreview}
            onActivate={doActivate}
            error={null}
            success={null}
          />
        )}

        {panelError && <p className='text-sm' role='alert' style={{ color: 'var(--error, #dc2626)' }}>{panelError}</p>}
        {panelSuccess && <p className='text-sm' role='status' style={{ color: 'var(--primary)' }}>{panelSuccess}</p>}
      </div>
    </div>
  );
}
