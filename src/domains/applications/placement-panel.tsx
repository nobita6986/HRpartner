'use client';

/**
 * placement-panel — MP-3C STEP-07 (RQ-09) presentational drawer pieces.
 *
 * Pure, controlled components: every value and handler comes from props, so they
 * render deterministically and are asserted with `react-dom/server` in
 * `placement-panel.test.ts` (no DOM runtime, no new dependency). All decision
 * logic lives in `placement-ui.ts`; nothing here talks to the network.
 */

import type { ChangeEvent } from 'react';
import {
  ACTION_LABELS,
  availableActions,
  conflictLabel,
  formatCounter,
  isOverridable,
  OVERRIDE_CASE_LABELS,
  OVERRIDE_CASES,
  type ActionId,
  type ActionSubject,
  type OverrideCaseId,
  type PlacementFormState,
  type SubmitGate,
} from './placement-ui';

export interface PreviewConflict {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  overridable?: boolean;
}

export interface PreviewSlot {
  id: string;
  positionCode: string;
  positionTitle: string;
  slotsNeeded: number;
  slotsFilled: number;
  remaining: number;
}

export interface PreviewProject {
  id: string;
  code: string;
  name: string;
  status: string;
  quota: number;
  filled: number;
  remaining: number;
}

export interface PreviewGuard {
  source: string;
  blockCode: number;
  blockLabel: string;
  failedRules: string[];
  skippedRules: string[];
  overrideRequired: boolean;
}

export interface PlacementPreviewDto {
  canActivate: boolean;
  submissionId: string;
  submissionStatus: string;
  workerId: string | null;
  slot: PreviewSlot | null;
  order: { id: string; code: string; status: string } | null;
  project: PreviewProject | null;
  existingActiveAssignment: { assignmentId: string; projectId: string } | null;
  referralGuard: PreviewGuard | null;
  conflicts: PreviewConflict[];
}

// ─── Action bar ──────────────────────────────────────────────────────────────

export function ActionBar({ subject, role, pending, onAction }: {
  subject: ActionSubject;
  role: string;
  pending: ActionId | null;
  onAction: (action: ActionId) => void;
}) {
  const actions = availableActions(subject, role);
  if (actions.length === 0) {
    return (
      <p className='text-xs' data-testid='no-actions' style={{ color: 'var(--on-surface-variant)' }}>
        Không có hành động nào khả dụng cho trạng thái này.
      </p>
    );
  }
  return (
    <div className='flex flex-wrap gap-2' data-testid='action-bar'>
      {actions.map((action) => (
        <button
          key={action}
          type='button'
          data-action={action}
          disabled={pending !== null}
          onClick={() => onAction(action)}
          className='px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50'
          style={{
            backgroundColor: action === 'reject' ? 'var(--surface-container)' : 'var(--primary)',
            color: action === 'reject' ? 'var(--on-surface)' : 'var(--on-primary, white)',
          }}
        >
          {pending === action ? 'Đang xử lý…' : ACTION_LABELS[action]}
        </button>
      ))}
    </div>
  );
}

// ─── Conflicts ───────────────────────────────────────────────────────────────

export function ConflictList({ conflicts }: { conflicts: PreviewConflict[] }) {
  if (conflicts.length === 0) {
    return (
      <p className='text-sm' data-testid='no-conflicts' style={{ color: 'var(--on-surface-variant)' }}>
        Không có xung đột — có thể xếp việc.
      </p>
    );
  }
  return (
    <ul className='text-sm flex flex-col gap-1' data-testid='conflicts' role='list'>
      {conflicts.map((c) => (
        <li key={c.code} data-conflict={c.code} style={{ color: 'var(--error, #dc2626)' }}>
          <strong>{conflictLabel(c.code)}</strong>
          {isOverridable(c.code) && <span data-testid={`overridable-${c.code}`}> (có thể override)</span>}
          <span className='block text-xs' style={{ color: 'var(--on-surface-variant)' }}>{c.message}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Counters ────────────────────────────────────────────────────────────────

export function PlacementCounters({ preview }: { preview: PlacementPreviewDto }) {
  const { slot, project, order } = preview;
  return (
    <dl className='text-sm grid grid-cols-3 gap-y-1' data-testid='counters' style={{ color: 'var(--on-surface-variant)' }}>
      <dt>Vị trí</dt>
      <dd className='col-span-2' data-testid='slot-position' style={{ color: 'var(--on-surface)' }}>
        {slot ? `${slot.positionTitle} (${slot.positionCode})` : '—'}
      </dd>
      <dt>Slot</dt>
      <dd className='col-span-2' data-testid='slot-counter' style={{ color: 'var(--on-surface)' }}>
        {slot ? `${formatCounter(slot.slotsFilled, slot.slotsNeeded)} — còn ${slot.remaining}` : '—'}
      </dd>
      <dt>Đơn tuyển</dt>
      <dd className='col-span-2' data-testid='order-status' style={{ color: 'var(--on-surface)' }}>
        {order ? `${order.code} · ${order.status}` : '—'}
      </dd>
      <dt>Quota dự án</dt>
      <dd className='col-span-2' data-testid='project-counter' style={{ color: 'var(--on-surface)' }}>
        {project ? `${formatCounter(project.filled, project.quota)} — còn ${project.remaining}` : '—'}
      </dd>
      <dt>Referral Guard</dt>
      <dd className='col-span-2' data-testid='guard-status' style={{ color: 'var(--on-surface)' }}>
        {preview.referralGuard
          ? `${preview.referralGuard.source} · ${preview.referralGuard.blockLabel}${preview.referralGuard.skippedRules.length > 0 ? ` (bỏ qua ${preview.referralGuard.skippedRules.join('/')})` : ''}`
          : '—'}
      </dd>
      {preview.existingActiveAssignment && (
        <>
          <dt>Đang ACTIVE</dt>
          <dd className='col-span-2' data-testid='active-assignment' style={{ color: 'var(--error, #dc2626)' }}>
            {preview.existingActiveAssignment.assignmentId} @ {preview.existingActiveAssignment.projectId}
          </dd>
        </>
      )}
    </dl>
  );
}

// ─── Override form ───────────────────────────────────────────────────────────

export interface OverrideValue {
  overrideCase: string;
  reason: string;
  evidence: string;
}

export function OverrideForm({ value, canOverride, onChange }: {
  value: OverrideValue;
  canOverride: boolean;
  onChange: (next: OverrideValue) => void;
}) {
  if (!canOverride) {
    return (
      <p className='text-sm' data-testid='override-denied' role='alert' style={{ color: 'var(--error, #dc2626)' }}>
        Referral Guard chặn và bạn không có quyền override (CAN_OVERRIDE_REFERRAL_GUARD).
      </p>
    );
  }
  return (
    <div className='rounded-lg p-3 flex flex-col gap-2' data-testid='override-form' style={{ backgroundColor: 'var(--surface-container)' }}>
      <label className='text-xs' htmlFor='override-case' style={{ color: 'var(--on-surface-variant)' }}>Case override (SOP §9.3.1)</label>
      <select
        id='override-case'
        data-testid='override-case'
        value={value.overrideCase}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, overrideCase: e.target.value })}
        className='px-3 py-2 rounded-lg border'
        style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
      >
        <option value=''>— Chọn case —</option>
        {OVERRIDE_CASES.map((c: OverrideCaseId) => <option key={c} value={c}>{OVERRIDE_CASE_LABELS[c]}</option>)}
      </select>
      <textarea
        data-testid='override-reason'
        aria-label='Lý do override'
        placeholder='Lý do override (bắt buộc)'
        rows={2}
        value={value.reason}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange({ ...value, reason: e.target.value })}
        className='px-3 py-2 rounded-lg border'
        style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
      />
      <input
        data-testid='override-evidence'
        aria-label='Bằng chứng override'
        placeholder='Bằng chứng (tuỳ chọn — mã ticket, email…)'
        value={value.evidence}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, evidence: e.target.value })}
        className='px-3 py-2 rounded-lg border'
        style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
      />
    </div>
  );
}

// ─── Placement panel ─────────────────────────────────────────────────────────

export interface PlacementPanelProps {
  form: PlacementFormState;
  onFormChange: (next: PlacementFormState) => void;
  preview: PlacementPreviewDto | null;
  previewGate: SubmitGate;
  activateGateResult: SubmitGate;
  reason: string;
  onReasonChange: (next: string) => void;
  override: OverrideValue;
  onOverrideChange: (next: OverrideValue) => void;
  canOverride: boolean;
  onPreview: () => void;
  onActivate: () => void;
  error: string | null;
  success: string | null;
}

export function PlacementPanel(props: PlacementPanelProps) {
  const { form, preview, previewGate, activateGateResult } = props;
  const guardBlocked = Boolean(
    preview && !preview.canActivate && preview.conflicts.some((c) => isOverridable(c.code)),
  );

  return (
    <section className='flex flex-col gap-3' data-testid='placement-panel'>
      <h3 className='text-sm font-semibold' style={{ color: 'var(--on-surface)' }}>Xếp vào slot</h3>

      <input
        data-testid='employee-code'
        aria-label='Mã nhân viên tại dự án'
        placeholder='Mã NV tại dự án (bắt buộc)'
        value={form.employeeCode}
        onChange={(e: ChangeEvent<HTMLInputElement>) => props.onFormChange({ ...form, employeeCode: e.target.value })}
        className='px-3 py-2 rounded-lg border'
        style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
      />
      <select
        data-testid='employment-type'
        aria-label='Loại hình làm việc'
        value={form.employmentType}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => props.onFormChange({ ...form, employmentType: e.target.value })}
        className='px-3 py-2 rounded-lg border'
        style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
      >
        <option value=''>— Loại hình —</option>
        <option value='HRP_EMPLOYED'>HRP tuyển</option>
        <option value='OUTSOURCED'>Thuê ngoài</option>
        <option value='REFERRED_OUT'>Giới thiệu ra</option>
      </select>
      <select
        data-testid='work-setting'
        aria-label='Khối làm việc'
        value={form.workSetting ?? ''}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => props.onFormChange({ ...form, workSetting: e.target.value })}
        className='px-3 py-2 rounded-lg border'
        style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
      >
        <option value=''>— Khối (tuỳ chọn) —</option>
        <option value='PHOTHONG'>Phổ thông</option>
        <option value='VANPHONG'>Văn phòng</option>
        <option value='CONGXUONG'>Công xưởng</option>
      </select>
      <label className='text-xs' htmlFor='valid-from' style={{ color: 'var(--on-surface-variant)' }}>Hiệu lực từ</label>
      <input
        id='valid-from'
        data-testid='valid-from'
        type='datetime-local'
        value={form.validFrom}
        onChange={(e: ChangeEvent<HTMLInputElement>) => props.onFormChange({ ...form, validFrom: e.target.value })}
        className='px-3 py-2 rounded-lg border'
        style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
      />
      <label className='text-xs' htmlFor='valid-to' style={{ color: 'var(--on-surface-variant)' }}>Đến (tuỳ chọn)</label>
      <input
        id='valid-to'
        data-testid='valid-to'
        type='datetime-local'
        value={form.validTo ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => props.onFormChange({ ...form, validTo: e.target.value })}
        className='px-3 py-2 rounded-lg border'
        style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
      />

      <button
        type='button'
        data-testid='preview-button'
        disabled={previewGate.disabled}
        onClick={props.onPreview}
        className='px-4 py-2 rounded-lg font-medium disabled:opacity-50'
        style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }}
      >
        Xem trước
      </button>
      {previewGate.hint && <p className='text-xs' data-testid='preview-hint' style={{ color: 'var(--on-surface-variant)' }}>{previewGate.hint}</p>}

      {preview && (
        <div className='flex flex-col gap-2' data-testid='preview-result'>
          <PlacementCounters preview={preview} />
          <ConflictList conflicts={preview.conflicts} />
          {guardBlocked && (
            <OverrideForm value={props.override} canOverride={props.canOverride} onChange={props.onOverrideChange} />
          )}
          <textarea
            data-testid='activate-reason'
            aria-label='Lý do xếp việc'
            placeholder='Lý do xếp việc (bắt buộc)'
            rows={2}
            value={props.reason}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => props.onReasonChange(e.target.value)}
            className='px-3 py-2 rounded-lg border'
            style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
          />
          <button
            type='button'
            data-testid='activate-button'
            disabled={activateGateResult.disabled}
            onClick={props.onActivate}
            className='px-4 py-2 rounded-lg font-medium disabled:opacity-50'
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}
          >
            Xác nhận xếp việc
          </button>
          {activateGateResult.hint && (
            <p className='text-xs' data-testid='activate-hint' style={{ color: 'var(--on-surface-variant)' }}>{activateGateResult.hint}</p>
          )}
        </div>
      )}

      {props.error && <p className='text-sm' data-testid='placement-error' role='alert' style={{ color: 'var(--error, #dc2626)' }}>{props.error}</p>}
      {props.success && <p className='text-sm' data-testid='placement-success' role='status' style={{ color: 'var(--primary)' }}>{props.success}</p>}
    </section>
  );
}

// ─── Dedup picker (convert flow) ─────────────────────────────────────────────

export interface DedupCandidateDto {
  workerId: string;
  matchedOn: string[];
}

export function DedupPicker({ candidates, selected, onSelect, onConfirm, onCancel, pending }: {
  candidates: DedupCandidateDto[];
  selected: string | null;
  onSelect: (workerId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className='rounded-lg p-3 flex flex-col gap-2' data-testid='dedup-picker' style={{ backgroundColor: 'var(--surface-container)' }}>
      <p className='text-sm' style={{ color: 'var(--on-surface)' }}>
        Có {candidates.length} Worker trùng. Chọn đúng người để gộp, hoặc huỷ để kiểm tra lại.
      </p>
      <ul className='flex flex-col gap-1' role='list'>
        {candidates.map((c) => (
          <li key={c.workerId}>
            <label className='text-sm flex items-center gap-2' style={{ color: 'var(--on-surface)' }}>
              <input
                type='radio'
                name='dedup-worker'
                data-testid={`dedup-${c.workerId}`}
                value={c.workerId}
                checked={selected === c.workerId}
                onChange={() => onSelect(c.workerId)}
              />
              <span className='font-mono text-xs'>{c.workerId}</span>
              <span className='text-xs' style={{ color: 'var(--on-surface-variant)' }}>({c.matchedOn.join(', ')})</span>
            </label>
          </li>
        ))}
      </ul>
      <div className='flex gap-2'>
        <button
          type='button'
          data-testid='dedup-confirm'
          disabled={pending || !selected}
          onClick={onConfirm}
          className='px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50'
          style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}
        >
          Gộp và nhận vào
        </button>
        <button
          type='button'
          data-testid='dedup-cancel'
          onClick={onCancel}
          className='px-3 py-1.5 rounded-lg text-sm'
          style={{ backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}
