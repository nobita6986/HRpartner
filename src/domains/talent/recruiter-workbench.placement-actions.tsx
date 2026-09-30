'use client';

/**
 * recruiter-workbench.placement-actions.tsx — P1-F1 UI island.
 *
 * LOCK-02: Server is the lifecycle authority. The cell NEVER decides whether
 *   to fire a mutation; it only collects the user's intent and delegates to
 *   the drawer.
 * LOCK-03: narrow action-cell / client island scoped to a single row.
 * LOCK-04: SlideOutDrawer + single-row actions (NO bulk).
 * LOCK-05: every mutation POSTs `x-idempotency-key: <raw UUID v4>`.
 * LOCK-06: `router.refresh()` after 200/201 success. No SWR, no optimistic
 *   status mutation.
 * LOCK-07: safe inline `role="status"` / `role="alert"` — no Toast library.
 * LOCK-08: no client-side audit log, no `placement.timeline`.
 * LOCK-13: sessionStorage-scoped Idempotency-Key (raw UUID v4) per
 *   `(command, scope, payloadHash)`.
 * LOCK-15: HRP-managed restrictions preserved (no EFFECTIVE button).
 *
 * Components:
 *   - `<PlacementActionCell/>` — the narrow table-cell island. Renders
 *     either an "Mở bố trí" trigger button or a `—` sentinel.
 *   - `<PlacementActionDrawer/>` — wraps the shared `SlideOutDrawer` with
 *     F1-specific body/actions/forms.
 *   - `<ConfirmPlacementActionDialog/>` — confirm dialog for the
 *     non-create, non-effective commands (confirm/fail/cancel).
 *   - `<EffectiveEvidenceForm/>` — controlled form for the EFFECTIVE
 *     command's evidence payload (client-managed only). Strict Zod
 *     RFC 3339 validation + retention of form state + same idempotency
 *     key on same-payload retry (LOCK-13).
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  XCircle,
} from 'lucide-react';

import { cn } from '@/src/shared/utils/cn';
import { SlideOutDrawer } from '@/src/shared/ui/sheet/slide-out-drawer';

import {
  EFFECTIVE_EVIDENCE_SCHEMA,
  availableActionsForRow,
  canPerformPlacementAction,
  formatManagementModeVi,
  formatPlacementStatusVi,
  isStalePlacementSnapshot,
  type EffectiveEvidencePayload,
  type PlacementCommandName,
  type PlacementCommandPayloadShape,
  type PlacementRouteFamily,
} from './recruiter-workbench.placement-actions.states';

export {
  EFFECTIVE_EVIDENCE_SCHEMA,
  type EffectiveEvidencePayload,
};
import {
  type PlacementCommandResult,
  runPlacementCommandRequest,
} from './recruiter-workbench.placement-actions.fetch';

import type {
  RecruiterWorkbenchRow,
  ServerDerivedNextAction,
} from '@/src/domains/talent/recruiter-workbench.types';

// ─────────────────────────────────────────────────────────────────────────
// 1. PlacementActionCell — the narrow cell island (LOCK-03).
// ─────────────────────────────────────────────────────────────────────────

export interface PlacementActionCellProps {
  row: Pick<
    RecruiterWorkbenchRow,
    'caseId' | 'caseStatus' | 'placement' | 'placementOptions'
  > & { nextAction: ServerDerivedNextAction };
  /**
   * F-04 / B-08: server-derived route family flag.
   *   - `'admin'`     → ADMIN and HR_MANAGER; mutations POST to
   *                     `/api/admin/placements[/...actions/<verb>]`.
   *   - `'recruiter'` → HR_STAFF + view=MINE only; mutations POST to
   *                     `/api/admin/recruiter/placements[/...actions/<verb>]`.
   *
   * Server F0 authorization remains canonical. This flag is purely the
   * UX selector for which route family to target — and the server fails
   * closed (403 ROLE_NOT_PERMITTED / 404 / 409 IDEMPOTENCY_CONFLICT) if
   * the dual-authority predicate no longer holds.
   */
  placementRouteFamily: PlacementRouteFamily;
  /**
   * Server-derived affordance flag (F-02). `true` only for ADMIN and
   * HR_MANAGER; every other role renders NO mutation affordance at all.
   * Server F0 authorization remains canonical; this flag is purely UX.
   */
  canMutatePlacement: boolean;
}

/**
 * The placement action cell.
 *
 * Renders:
 *   - `—` when no action is available (terminal case, stale snapshot, no
 *     options for CREATE, or `canMutatePlacement=false`).
 *   - A small "Mở bố trí" button when actions exist AND role is authorized.
 *
 * The button opens the `<PlacementActionDrawer>` for this row.
 */
export function PlacementActionCell({
  row,
  placementRouteFamily,
  canMutatePlacement,
}: PlacementActionCellProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const hasActions = canPerformPlacementAction(row);
  const stale = isStalePlacementSnapshot(row);
  const authorized = canMutatePlacement === true;

  if (!authorized) {
    // F-02 / AC-03: role gate. UI MUST NOT render any mutation affordance
    // for HR_STAFF / CTV / PUBLIC / unauthenticated. Server F0 is authority.
    return (
      <div
        className="flex justify-end"
        data-testid="placement-action-cell"
        data-case-id={row.caseId}
        data-authorized="false"
        data-route-family={placementRouteFamily}
      >
        <span className="text-xs text-slate-500" aria-hidden="true">
          —
        </span>
      </div>
    );
  }

  if (stale) {
    return (
      <div
        className="flex flex-col items-end gap-1"
        data-testid="placement-action-cell"
        data-case-id={row.caseId}
        data-authorized="true"
        data-route-family={placementRouteFamily}
      >
        <span className="text-xs text-slate-500" aria-hidden="true">
          —
        </span>
        <p
          role="alert"
          data-testid="placement-stale-alert"
          className="text-[11px] text-amber-700 text-right max-w-[160px]"
        >
          Dữ liệu đã cũ. Vui lòng tải lại trang.
        </p>
      </div>
    );
  }

  if (!hasActions) {
    return (
      <div
        className="flex justify-end"
        data-testid="placement-action-cell"
        data-case-id={row.caseId}
        data-authorized="true"
        data-route-family={placementRouteFamily}
      >
        <span className="text-xs text-slate-500" aria-hidden="true">
          —
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex justify-end"
      data-testid="placement-action-cell"
      data-case-id={row.caseId}
      data-authorized="true"
      data-route-family={placementRouteFamily}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="placement-action-open"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
      >
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        Mở bố trí
      </button>
      <PlacementActionDrawer
        row={row}
        placementRouteFamily={placementRouteFamily}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2. PlacementActionDrawer — wraps shared SlideOutDrawer (LOCK-04, F-05).
// ─────────────────────────────────────────────────────────────────────────

export interface PlacementActionDrawerProps {
  row: PlacementActionCellProps['row'];
  /**
   * F-04 / B-08: which F0 route family to POST to. Forwarded by
   * `PlacementActionCell` from the page-level discriminator.
   */
  placementRouteFamily: PlacementRouteFamily;
  open: boolean;
  onClose: () => void;
}

interface DrawerState {
  statusText: string | null;
  alertText: string | null;
  pendingCommand: PlacementCommandName | null;
}

const INITIAL_DRAWER_STATE: DrawerState = {
  statusText: null,
  alertText: null,
  pendingCommand: null,
};

export function PlacementActionDrawer({
  row,
  placementRouteFamily,
  open,
  onClose,
}: PlacementActionDrawerProps): React.ReactElement | null {
  const router = useRouter();
  const [state, setState] = React.useState<DrawerState>(INITIAL_DRAWER_STATE);
  const [pending, setPending] = React.useState<PlacementCommandName | null>(
    null,
  );
  const [createPayload, setCreatePayload] = React.useState<{
    jobOpeningId: string;
    sourceCandidateSubmissionId: string;
  } | null>(null);
  const [effectiveEvidence, setEffectiveEvidence] = React.useState<{
    clientAcknowledgedAt: string;
    clientAcknowledgedByUserId: string;
    acknowledgementRef: string;
  } | null>(null);
  const [confirming, setConfirming] = React.useState<PlacementCommandName | null>(
    null,
  );

  const actions = React.useMemo(() => availableActionsForRow(row), [row]);

  React.useEffect(() => {
    if (!open) {
      setState(INITIAL_DRAWER_STATE);
      setPending(null);
      setCreatePayload(null);
      setEffectiveEvidence(null);
      setConfirming(null);
    }
  }, [open]);

  // Send the mutation. NO optimistic mutation (LOCK-06). After success →
  // surface `role="status"`, then `router.refresh()`.
  async function submitCommand(
    command: PlacementCommandName,
    payload: PlacementCommandPayloadShape,
  ): Promise<void> {
    setPending(command);
    setState({ ...INITIAL_DRAWER_STATE, pendingCommand: command });

    const result: PlacementCommandResult<unknown> =
      await runPlacementCommandRequest({
        routeFamily: placementRouteFamily,
        command,
        payload,
      });

    if (!result.ok) {
      setPending(null);
      setState({
        statusText: null,
        alertText: result.displayMessage,
        pendingCommand: null,
      });
      return;
    }

    // LOCK-06: revalidate the server-rendered list, then close.
    setPending(null);
    setState({
      statusText:
        command === 'placement.create'
          ? 'Đã tạo bố trí. Đang làm mới danh sách…'
          : command === 'placement.confirm'
            ? 'Đã xác nhận. Đang làm mới danh sách…'
            : command === 'placement.effective'
              ? 'Đã đánh dấu hiệu lực. Đang làm mới danh sách…'
              : command === 'placement.fail'
                ? 'Đã thất bại. Đang làm mới danh sách…'
                : 'Đã huỷ. Đang làm mới danh sách…',
      alertText: null,
      pendingCommand: null,
    });

    router.refresh();
    window.setTimeout(() => onClose(), 800);
  }

  if (!open) return null;

  return (
    <>
      <SlideOutDrawer
        open={open}
        onClose={onClose}
        title={`Bố trí cho case ${row.caseId}`}
        description="Chọn thao tác. Mỗi lệnh đều có Idempotency-Key; lệnh đã gửi sẽ không tạo trùng."
        width="md"
        data-testid="placement-drawer"
      >
        <div className="space-y-4" data-case-id={row.caseId}>
          <DrawerCaseSummary row={row} />

          {/* Inline status + alert (LOCK-07). Plain text only. */}
          {state.statusText && (
            <p
              role="status"
              data-testid="placement-status"
              className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded"
            >
              {state.statusText}
            </p>
          )}
          {state.alertText && (
            <p
              role="alert"
              data-testid="placement-alert"
              className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded"
            >
              {state.alertText}
            </p>
          )}

          {/* CREATE — only candidate for `placement.create`. */}
          {actions.some((a) => a.command === 'placement.create') && (
            <PlacementCreateForm
              row={row}
              pending={pending === 'placement.create'}
              onSubmit={(selection) => {
                if (!selection) return;
                setCreatePayload(selection);
                setConfirming('placement.create');
              }}
            />
          )}

          {/* EFFECTIVE — only candidate when placement.client-managed + confirmed. */}
          {actions.some((a) => a.command === 'placement.effective') && (
            <EffectiveEvidenceForm
              pending={pending === 'placement.effective'}
              onSubmit={(evidence) => {
                if (!evidence) return;
                setEffectiveEvidence(evidence);
                setConfirming('placement.effective');
              }}
            />
          )}

          {/* Transition buttons (other than EFFECTIVE). */}
          <div className="flex flex-wrap gap-2 pt-2">
            {actions
              .filter(
                (a) =>
                  a.command !== 'placement.create' &&
                  a.command !== 'placement.effective',
              )
              .map((a) => {
                const isPending = pending === a.command;
                return (
                  <button
                    key={a.command}
                    type="button"
                    onClick={() => setConfirming(a.command)}
                    disabled={Boolean(pending)}
                    data-testid={`placement-action-${a.command}`}
                    data-intent={a.intent}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium focus:outline-none focus:ring-2',
                      a.intent === 'danger'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-300 disabled:opacity-50'
                        : a.intent === 'secondary'
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-300 disabled:opacity-50'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-300 disabled:opacity-50',
                    )}
                  >
                    {a.command === 'placement.confirm' && (
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {a.command === 'placement.fail' && (
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {a.command === 'placement.cancel' && (
                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {a.label}
                    {isPending && (
                      <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            Quyết định vòng đời thuộc quyền máy chủ (F0). Trạng thái hiển thị
            chỉ phục vụ kích hoạt nút, không tự cập nhật.
          </p>
        </div>
      </SlideOutDrawer>

      <ConfirmPlacementActionDialog
        command={confirming}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          const cmd = confirming;
          if (!cmd) return;
          setConfirming(null);
          if (cmd === 'placement.create' && createPayload) {
            void submitCommand(cmd, {
              command: 'placement.create',
              placementCaseId: row.caseId,
              jobOpeningId: createPayload.jobOpeningId,
              sourceCandidateSubmissionId:
                createPayload.sourceCandidateSubmissionId,
            });
          } else if (
            cmd === 'placement.effective' &&
            row.placement &&
            effectiveEvidence
          ) {
            void submitCommand(cmd, {
              command: 'placement.effective',
              placementId: row.placement.id,
              evidence: effectiveEvidence,
            });
          } else if (row.placement) {
            void submitCommand(cmd, {
              command: cmd,
              placementId: row.placement.id,
            } as PlacementCommandPayloadShape);
          }
        }}
      />
    </>
  );
}

function DrawerCaseSummary({
  row,
}: {
  row: PlacementActionCellProps['row'];
}): React.ReactElement {
  const p = row.placement;
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-700">Case</span>
        <span
          className="font-mono text-slate-900"
          data-testid="placement-drawer-case-id"
        >
          {row.caseId}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-slate-700">Trạng thái case</span>
        <span
          data-testid="placement-drawer-case-status"
          className="font-medium text-slate-900"
        >
          {row.caseStatus}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-slate-700">Hành động tiếp</span>
        <span
          data-testid="placement-drawer-next-action"
          className="font-medium text-slate-900"
        >
          {row.nextAction}
        </span>
      </div>
      {p && (
        <>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-slate-700">Trạng thái placement</span>
            <span
              data-testid="placement-drawer-status"
              className="font-medium text-slate-900"
            >
              {formatPlacementStatusVi(p.status)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-slate-700">Chế độ</span>
            <span
              data-testid="placement-drawer-mode"
              className="font-medium text-slate-900"
            >
              {formatManagementModeVi(p.managementMode)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3. PlacementCreateForm — select opening → submit.
// ─────────────────────────────────────────────────────────────────────────

interface PlacementCreateFormProps {
  row: Pick<RecruiterWorkbenchRow, 'caseId' | 'placementOptions'>;
  pending: boolean;
  onSubmit: (selection: {
    jobOpeningId: string;
    sourceCandidateSubmissionId: string;
  } | null) => void;
}

function PlacementCreateForm({
  row,
  pending,
  onSubmit,
}: PlacementCreateFormProps): React.ReactElement | null {
  const options = row.placementOptions ?? [];
  const [jobOpeningId, setJobOpeningId] = React.useState<string>('');
  const first = options[0];
  React.useEffect(() => {
    if (!jobOpeningId && first) setJobOpeningId(first.jobOpeningId);
  }, [first, jobOpeningId]);

  if (options.length === 0) return null;
  const selected = options.find((o) => o.jobOpeningId === jobOpeningId);

  return (
    <div className="rounded border border-slate-200 px-3 py-3 space-y-2">
      <div>
        <label
          htmlFor="placement-create-opening"
          className="block text-xs font-medium text-slate-700"
        >
          Chọn JobOpening
        </label>
        <select
          id="placement-create-opening"
          data-testid="placement-create-opening"
          value={jobOpeningId}
          onChange={(e) => setJobOpeningId(e.target.value)}
          disabled={pending}
          className="mt-1 block w-full rounded border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          {options.map((o) => (
            <option key={o.jobOpeningId} value={o.jobOpeningId}>
              {`${o.title}${o.projectName ? ` • ${o.projectName}` : ''}${
                o.companyName ? ` • ${o.companyName}` : ''
              }`}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() =>
          selected
            ? onSubmit({
                jobOpeningId: selected.jobOpeningId,
                sourceCandidateSubmissionId: selected.sourceCandidateSubmissionId,
              })
            : onSubmit(null)
        }
        disabled={pending || !selected}
        data-testid="placement-action-create"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium',
          'bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50',
        )}
      >
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        Tạo bố trí
        {pending && (
          <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 4. EffectiveEvidenceForm — strict Zod RFC 3339 + retention (LOCK-13, F-04).
//
// The form is exported so the test file can drive the EXACT production
// component (no Schema re-definition per C2-04).
// ─────────────────────────────────────────────────────────────────────────

interface EffectiveEvidenceFormProps {
  pending: boolean;
  onSubmit: (evidence: EffectiveEvidencePayload | null) => void;
}

/**
 * Controlled evidence form. Strict Zod RFC 3339 for `clientAcknowledgedAt`.
 * Form state is preserved across same-payload retry (caller invokes
 * `onSubmit(null)` only when user explicitly resets).
 *
 * Reuse the SAME idempotency-key on same-payload retry (handled by the
 * fetch helper via `sessionStorageKeyForPlacementCommand` — the key is
 * derived from the canonical payload hash).
 *
 * Whitespace handling matches the schema: the implementation trims the
 * user inputs BEFORE `safeParse`, mirroring the test fixtures
 * (F4-EV-08/09). For `clientAcknowledgedAt`, the form trims input too,
 * but Zod's `.datetime({ offset: true })` still rejects whitespace
 * because the parsed string is revalidated canonical.
 */
export function EffectiveEvidenceForm({
  pending,
  onSubmit,
}: EffectiveEvidenceFormProps): React.ReactElement {
  const [clientAcknowledgedAt, setClientAcknowledgedAt] =
    React.useState<string>('');
  const [clientAcknowledgedByUserId, setClientAcknowledgedByUserId] =
    React.useState<string>('');
  const [acknowledgementRef, setAcknowledgementRef] =
    React.useState<string>('');
  const [localError, setLocalError] = React.useState<string | null>(null);

  function submit(): void {
    const parsed = EFFECTIVE_EVIDENCE_SCHEMA.safeParse({
      clientAcknowledgedAt: clientAcknowledgedAt.trim(),
      clientAcknowledgedByUserId: clientAcknowledgedByUserId.trim(),
      acknowledgementRef: acknowledgementRef.trim(),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setLocalError(first?.message ?? 'Dữ liệu không hợp lệ.');
      return;
    }
    setLocalError(null);
    onSubmit(parsed.data);
  }

  return (
    <div className="rounded border border-emerald-200 bg-emerald-50/40 px-3 py-3 space-y-2">
      <p className="text-xs font-medium text-emerald-800">
        Bằng chứng khách hàng xác nhận
      </p>
      <div>
        <label
          htmlFor="placement-evidence-at"
          className="block text-[11px] text-slate-700"
        >
          Thời điểm xác nhận (RFC 3339)
        </label>
        <input
          id="placement-evidence-at"
          type="text"
          inputMode="text"
          placeholder="2026-01-02T03:04:05Z"
          value={clientAcknowledgedAt}
          onChange={(e) => setClientAcknowledgedAt(e.target.value)}
          disabled={pending}
          data-testid="placement-evidence-at"
          className="mt-1 block w-full rounded border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>
      <div>
        <label
          htmlFor="placement-evidence-user"
          className="block text-[11px] text-slate-700"
        >
          Mã người xác nhận
        </label>
        <input
          id="placement-evidence-user"
          type="text"
          value={clientAcknowledgedByUserId}
          onChange={(e) => setClientAcknowledgedByUserId(e.target.value)}
          disabled={pending}
          data-testid="placement-evidence-user"
          className="mt-1 block w-full rounded border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>
      <div>
        <label
          htmlFor="placement-evidence-ref"
          className="block text-[11px] text-slate-700"
        >
          Mã tham chiếu
        </label>
        <input
          id="placement-evidence-ref"
          type="text"
          value={acknowledgementRef}
          onChange={(e) => setAcknowledgementRef(e.target.value)}
          disabled={pending}
          data-testid="placement-evidence-ref"
          className="mt-1 block w-full rounded border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>
      {localError && (
        <p
          role="alert"
          data-testid="placement-evidence-error"
          className="text-[11px] text-rose-700"
        >
          {localError}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        data-testid="placement-action-effective"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium',
          'bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50',
        )}
      >
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        Đánh dấu hiệu lực
        {pending && (
          <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 5. ConfirmPlacementActionDialog — confirm dialog for transitions.
// ─────────────────────────────────────────────────────────────────────────

interface ConfirmPlacementActionDialogProps {
  command: PlacementCommandName | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIRM_LABEL: Record<PlacementCommandName, string> = {
  'placement.create': 'Tạo bố trí?',
  'placement.confirm': 'Xác nhận bố trí?',
  'placement.effective': 'Đánh dấu hiệu lực?',
  'placement.fail': 'Đánh dấu thất bại?',
  'placement.cancel': 'Huỷ bố trí?',
};

const CONFIRM_BODY: Record<PlacementCommandName, string> = {
  'placement.create':
    'Bố trí sẽ được chọn (SELECTED). Không thể chọn lại JobOpening sau bước này.',
  'placement.confirm':
    'Xác nhận trạng thái. Bố trí chuyển sang CONFIRMED.',
  'placement.effective':
    'Bố trí sẽ được đánh dấu hiệu lực (EFFECTIVE). Hành động này đóng PlacementCase (client-managed).',
  'placement.fail':
    'Bố trí sẽ được đánh dấu thất bại. Slot trên StaffingOrder được giải phóng.',
  'placement.cancel':
    'Bố trí sẽ bị huỷ. Slot trên StaffingOrder được giải phóng.',
};

export function ConfirmPlacementActionDialog({
  command,
  onCancel,
  onConfirm,
}: ConfirmPlacementActionDialogProps): React.ReactElement | null {
  React.useEffect(() => {
    if (!command) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [command, onCancel]);

  if (!command) return null;

  return (
    <div
      role="presentation"
      data-testid="placement-confirm-overlay"
      className="fixed inset-0 bg-slate-900/50 z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="placement-confirm-title"
        data-testid="placement-confirm-dialog"
        className="bg-white rounded-lg shadow-2xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="placement-confirm-title"
          className="text-sm font-semibold text-slate-900"
        >
          {CONFIRM_LABEL[command]}
        </h3>
        <p className="mt-2 text-xs text-slate-700">{CONFIRM_BODY[command]}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            data-testid="placement-confirm-cancel"
            className="px-3 py-1.5 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="placement-confirm-ok"
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium text-white focus:outline-none focus:ring-2',
              command === 'placement.fail' || command === 'placement.cancel'
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300'
                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300',
            )}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
