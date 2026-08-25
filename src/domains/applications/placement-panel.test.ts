/**
 * placement-panel component tests — MP-3C STEP-07 (RQ-09, AC-08).
 *
 * These are real component tests: each component is rendered with React and
 * asserted on its produced markup via `react-dom/server`. That needs no DOM
 * runtime and no new dependency (react-dom already ships with the app), so the
 * unit lane stays dependency-free and DB-free.
 *
 * Interaction-driven state lives in the page; these components are controlled, so
 * every state the user can reach is expressed as props and asserted here.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ActionBar,
  ConflictList,
  DedupPicker,
  OverrideForm,
  PlacementCounters,
  PlacementPanel,
  type PlacementPreviewDto,
} from './placement-panel';
import { activateGate, previewSubmitGate, type PlacementFormState } from './placement-ui';

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const noop = () => {};

const PREVIEW: PlacementPreviewDto = {
  canActivate: true,
  submissionId: 'sub-1',
  submissionStatus: 'CONVERTED',
  workerId: 'worker-1',
  slot: { id: 'slot-1', positionCode: 'ELECTRICIAN', positionTitle: 'Thợ điện', slotsNeeded: 3, slotsFilled: 1, remaining: 2 },
  order: { id: 'order-1', code: 'SO-001', status: 'OPEN' },
  project: { id: 'project-1', code: 'PRJ-1', name: 'Project One', status: 'ACTIVE', quota: 10, filled: 4, remaining: 6 },
  existingActiveAssignment: null,
  referralGuard: { source: 'PUBLIC', blockCode: 0, blockLabel: 'NONE', failedRules: [], skippedRules: ['R2', 'R3'], overrideRequired: false },
  conflicts: [],
};

const FORM: PlacementFormState = {
  employeeCode: 'PRJ1-001', employmentType: 'OUTSOURCED', validFrom: '2026-08-25T08:00', validTo: '', workSetting: '',
};

describe('ActionBar — correct action per status and role (AC-08)', () => {
  it('offers screen + reject for a NEW application read by HR_MANAGER', () => {
    const html = render(createElement(ActionBar, { subject: { status: 'NEW' }, role: 'HR_MANAGER', pending: null, onAction: noop }));
    expect(html).toContain('data-action="screen"');
    expect(html).toContain('data-action="reject"');
    expect(html).not.toContain('data-action="convert"');
    expect(html).not.toContain('data-action="placement"');
  });

  it('offers only screen for SALE (no qualify/reject/convert)', () => {
    const html = render(createElement(ActionBar, { subject: { status: 'NEW' }, role: 'SALE', pending: null, onAction: noop }));
    expect(html).toContain('data-action="screen"');
    expect(html).not.toContain('data-action="reject"');
  });

  it('offers convert for QUALIFIED and placement for CONVERTED', () => {
    const qualified = render(createElement(ActionBar, { subject: { status: 'QUALIFIED' }, role: 'ADMIN', pending: null, onAction: noop }));
    expect(qualified).toContain('data-action="convert"');
    const converted = render(createElement(ActionBar, { subject: { status: 'CONVERTED' }, role: 'ADMIN', pending: null, onAction: noop }));
    expect(converted).toContain('data-action="placement"');
    expect(converted).not.toContain('data-action="convert"');
  });

  it('hides placement once the application already has an assignment', () => {
    const html = render(createElement(ActionBar, { subject: { status: 'CONVERTED', hasAssignment: true }, role: 'ADMIN', pending: null, onAction: noop }));
    expect(html).toContain('data-testid="no-actions"');
  });

  it('renders a read-only notice for DIRECTOR', () => {
    const html = render(createElement(ActionBar, { subject: { status: 'QUALIFIED' }, role: 'DIRECTOR', pending: null, onAction: noop }));
    expect(html).toContain('data-testid="no-actions"');
  });

  it('disables every button while one action is pending (no double submit)', () => {
    const html = render(createElement(ActionBar, { subject: { status: 'NEW' }, role: 'ADMIN', pending: 'screen', onAction: noop }));
    expect(html.match(/disabled=""/g) ?? []).toHaveLength(2);
    expect(html).toContain('Đang xử lý…');
  });

  it('does not fire the handler during render', () => {
    const onAction = vi.fn();
    render(createElement(ActionBar, { subject: { status: 'NEW' }, role: 'ADMIN', pending: null, onAction }));
    expect(onAction).not.toHaveBeenCalled();
  });
});

describe('ConflictList', () => {
  it('renders the empty state when a preview is clean', () => {
    expect(render(createElement(ConflictList, { conflicts: [] }))).toContain('data-testid="no-conflicts"');
  });

  it('labels each conflict and marks only the overridable one', () => {
    const html = render(createElement(ConflictList, {
      conflicts: [
        { code: 'PROJECT_QUOTA_FULL', message: 'Project quota is full' },
        { code: 'REFERRAL_GUARD_BLOCKED', message: 'blocked R2+R3', overridable: true },
      ],
    }));
    expect(html).toContain('data-conflict="PROJECT_QUOTA_FULL"');
    expect(html).toContain('Dự án đã đủ quota');
    expect(html).toContain('data-testid="overridable-REFERRAL_GUARD_BLOCKED"');
    expect(html).not.toContain('overridable-PROJECT_QUOTA_FULL');
  });

  it('falls back to the raw code for an unknown conflict', () => {
    const html = render(createElement(ConflictList, { conflicts: [{ code: 'WEIRD_NEW_CODE', message: 'x' }] }));
    expect(html).toContain('WEIRD_NEW_CODE');
  });
});

describe('PlacementCounters', () => {
  it('shows slot, order, project and guard facts', () => {
    const html = render(createElement(PlacementCounters, { preview: PREVIEW }));
    expect(html).toContain('Thợ điện (ELECTRICIAN)');
    expect(html).toContain('1/3 — còn 2');
    expect(html).toContain('SO-001 · OPEN');
    expect(html).toContain('4/10 — còn 6');
    expect(html).toContain('PUBLIC · NONE (bỏ qua R2/R3)');
    expect(html).not.toContain('data-testid="active-assignment"');
  });

  it('surfaces the guided-transfer target when the worker is already ACTIVE', () => {
    const html = render(createElement(PlacementCounters, {
      preview: { ...PREVIEW, existingActiveAssignment: { assignmentId: 'assign-old', projectId: 'project-9' } },
    }));
    expect(html).toContain('assign-old @ project-9');
  });
});

describe('OverrideForm', () => {
  it('renders the S1/S2/S3 form for a permitted actor', () => {
    const html = render(createElement(OverrideForm, {
      value: { overrideCase: 'S2', reason: 'Client confirmed', evidence: '' }, canOverride: true, onChange: noop,
    }));
    expect(html).toContain('data-testid="override-form"');
    for (const c of ['S1', 'S2', 'S3']) expect(html).toContain(`value="${c}"`);
    expect(html).toContain('Client confirmed');
  });

  it('renders a denial notice when the actor lacks the permission', () => {
    const html = render(createElement(OverrideForm, {
      value: { overrideCase: '', reason: '', evidence: '' }, canOverride: false, onChange: noop,
    }));
    expect(html).toContain('data-testid="override-denied"');
    expect(html).toContain('CAN_OVERRIDE_REFERRAL_GUARD');
    expect(html).not.toContain('data-testid="override-form"');
  });
});

describe('PlacementPanel — preview → conflicts → override → activate', () => {
  const base = {
    form: FORM, onFormChange: noop, reason: '', onReasonChange: noop,
    override: { overrideCase: '', reason: '', evidence: '' }, onOverrideChange: noop,
    canOverride: false, onPreview: noop, onActivate: noop, error: null, success: null,
  };

  it('hides the preview block until a preview exists, and explains why activate is off', () => {
    const gate = activateGate({ preview: null, reason: '', pending: false, dirtySincePreview: false, override: null, canOverride: false });
    const html = render(createElement(PlacementPanel, {
      ...base, preview: null, previewGate: previewSubmitGate(FORM, false), activateGateResult: gate,
    }));
    expect(html).not.toContain('data-testid="preview-result"');
    expect(html).toContain('data-testid="preview-button"');
    expect(gate.hint).toContain('xem trước');
  });

  it('blocks preview until the form is complete', () => {
    const gate = previewSubmitGate({ ...FORM, employeeCode: '' }, false);
    const html = render(createElement(PlacementPanel, {
      ...base, form: { ...FORM, employeeCode: '' }, preview: null, previewGate: gate,
      activateGateResult: { disabled: true, hint: null },
    }));
    expect(gate).toMatchObject({ disabled: true });
    expect(html).toContain('Nhập mã nhân viên tại dự án.');
  });

  it('enables activate on a clean preview with a reason', () => {
    const gate = activateGate({ preview: PREVIEW, reason: 'Duyệt xếp việc', pending: false, dirtySincePreview: false, override: null, canOverride: false });
    expect(gate).toEqual({ disabled: false, hint: null });
    const html = render(createElement(PlacementPanel, {
      ...base, reason: 'Duyệt xếp việc', preview: PREVIEW,
      previewGate: previewSubmitGate(FORM, false), activateGateResult: gate,
    }));
    expect(html).toContain('data-testid="activate-button"');
    expect(html).not.toMatch(/data-testid="activate-button"[^>]*disabled=""/);
    expect(html).toContain('data-testid="no-conflicts"');
  });

  it('forces a fresh preview after the form changed (no stale success)', () => {
    const gate = activateGate({ preview: PREVIEW, reason: 'x', pending: false, dirtySincePreview: true, override: null, canOverride: false });
    expect(gate.disabled).toBe(true);
    expect(gate.hint).toContain('xem trước lại');
  });

  it('shows the override form and keeps activate off until the case + reason are filled', () => {
    const blocked: PlacementPreviewDto = {
      ...PREVIEW, canActivate: false,
      referralGuard: { source: 'VENDOR', blockCode: 6, blockLabel: 'R2+R3', failedRules: ['R2', 'R3'], skippedRules: [], overrideRequired: true },
      conflicts: [{ code: 'REFERRAL_GUARD_BLOCKED', message: 'blocked', overridable: true }],
    };
    const empty = activateGate({ preview: blocked, reason: 'r', pending: false, dirtySincePreview: false, override: { overrideCase: '', reason: '' }, canOverride: true });
    expect(empty).toMatchObject({ disabled: true });
    expect(empty.hint).toContain('S1/S2/S3');

    const ready = activateGate({ preview: blocked, reason: 'r', pending: false, dirtySincePreview: false, override: { overrideCase: 'S2', reason: 'ok' }, canOverride: true });
    expect(ready).toEqual({ disabled: false, hint: null });

    const html = render(createElement(PlacementPanel, {
      ...base, canOverride: true, reason: 'r', preview: blocked,
      override: { overrideCase: 'S2', reason: 'ok', evidence: '' },
      previewGate: previewSubmitGate(FORM, false), activateGateResult: ready,
    }));
    expect(html).toContain('data-testid="override-form"');
    expect(html).toContain('data-conflict="REFERRAL_GUARD_BLOCKED"');
  });

  it('shows the denial notice instead of the override form when the actor cannot override', () => {
    const blocked: PlacementPreviewDto = {
      ...PREVIEW, canActivate: false,
      conflicts: [{ code: 'REFERRAL_GUARD_BLOCKED', message: 'blocked', overridable: true }],
    };
    const gate = activateGate({ preview: blocked, reason: 'r', pending: false, dirtySincePreview: false, override: null, canOverride: false });
    expect(gate.hint).toContain('không có quyền override');
    const html = render(createElement(PlacementPanel, {
      ...base, preview: blocked, previewGate: previewSubmitGate(FORM, false), activateGateResult: gate,
    }));
    expect(html).toContain('data-testid="override-denied"');
  });

  it('keeps activate off for a non-overridable conflict', () => {
    const blocked: PlacementPreviewDto = {
      ...PREVIEW, canActivate: false,
      conflicts: [{ code: 'ACTIVE_ASSIGNMENT_CONFLICT', message: 'already active' }],
    };
    const gate = activateGate({ preview: blocked, reason: 'r', pending: false, dirtySincePreview: false, override: { overrideCase: 'S1', reason: 'x' }, canOverride: true });
    expect(gate).toMatchObject({ disabled: true, hint: 'Còn xung đột chưa xử lý được.' });
  });

  it('disables activate while a request is in flight (no double submit)', () => {
    const gate = activateGate({ preview: PREVIEW, reason: 'r', pending: true, dirtySincePreview: false, override: null, canOverride: false });
    expect(gate).toMatchObject({ disabled: true, hint: 'Đang xử lý…' });
    const html = render(createElement(PlacementPanel, {
      ...base, reason: 'r', preview: PREVIEW, previewGate: { disabled: true, hint: 'Đang kiểm tra…' }, activateGateResult: gate,
    }));
    expect(html).toMatch(/data-testid="activate-button"[^>]*disabled=""/);
  });

  it('renders error and success states', () => {
    const err = render(createElement(PlacementPanel, {
      ...base, preview: PREVIEW, previewGate: { disabled: false, hint: null },
      activateGateResult: { disabled: true, hint: null }, error: 'Slot đã đủ người',
    }));
    expect(err).toContain('data-testid="placement-error"');
    expect(err).toContain('Slot đã đủ người');

    const ok = render(createElement(PlacementPanel, {
      ...base, preview: PREVIEW, previewGate: { disabled: false, hint: null },
      activateGateResult: { disabled: true, hint: null }, success: 'Đã xếp việc: assign-1',
    }));
    expect(ok).toContain('data-testid="placement-success"');
    expect(ok).toContain('assign-1');
  });
});

describe('DedupPicker — dedup-aware convert (AC-08)', () => {
  const candidates = [
    { workerId: 'worker-1', matchedOn: ['CCCD', 'PHONE'] },
    { workerId: 'worker-2', matchedOn: ['PHONE'] },
  ];

  it('lists every candidate with its matched fields', () => {
    const html = render(createElement(DedupPicker, {
      candidates, selected: null, onSelect: noop, onConfirm: noop, onCancel: noop, pending: false,
    }));
    expect(html).toContain('Có 2 Worker trùng');
    expect(html).toContain('data-testid="dedup-worker-1"');
    expect(html).toContain('CCCD, PHONE');
  });

  it('keeps confirm disabled until a candidate is selected', () => {
    const none = render(createElement(DedupPicker, {
      candidates, selected: null, onSelect: noop, onConfirm: noop, onCancel: noop, pending: false,
    }));
    expect(none).toMatch(/data-testid="dedup-confirm"[^>]*disabled=""/);

    const picked = render(createElement(DedupPicker, {
      candidates, selected: 'worker-2', onSelect: noop, onConfirm: noop, onCancel: noop, pending: false,
    }));
    expect(picked).not.toMatch(/data-testid="dedup-confirm"[^>]*disabled=""/);
    expect(picked).toContain('checked=""');
  });

  it('disables confirm while the convert request is pending', () => {
    const html = render(createElement(DedupPicker, {
      candidates, selected: 'worker-1', onSelect: noop, onConfirm: noop, onCancel: noop, pending: true,
    }));
    expect(html).toMatch(/data-testid="dedup-confirm"[^>]*disabled=""/);
  });
});
