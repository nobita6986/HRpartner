/**
 * recruiter-workbench.placement-actions.states.test.ts — pure helpers.
 *
 * Targets (LOCK-02, LOCK-04, LOCK-07, LOCK-13, LOCK-15):
 *   - availableActionsForRow: matrix over (caseStatus, placement.status, mode)
 *   - canPerformPlacementAction: thin boolean wrapper
 *   - formatPlacementStatusVi / formatManagementModeVi: rendering strings
 *   - formatErrorMessage: safe inline alert text
 *   - fnv1a32Hex: deterministic, same-input-same-output
 *   - canonicalizePayload: sorted keys, Date.toISOString
 *   - sessionStorageKeyForPlacementCommand: scoped, deterministic, varying
 *     on payload hash
 *   - isStalePlacementSnapshot: locks the F0 router out of stale snapshots
 */

import { describe, expect, it } from 'vitest';

import type {
  RecruiterWorkbenchPlacement,
  RecruiterWorkbenchRow,
} from '@/src/domains/talent/recruiter-workbench.types';

import {
  availableActionsForRow,
  canPerformPlacementAction,
  canonicalizePayload,
  fnv1a32Hex,
  formatErrorMessage,
  formatManagementModeVi,
  formatPlacementStatusVi,
  isStalePlacementSnapshot,
  sessionStorageKeyForPlacementCommand,
} from '@/src/domains/talent/recruiter-workbench.placement-actions.states';

// ─────────────────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────────────────

function baseRow(
  overrides: Partial<RecruiterWorkbenchRow> = {},
): Pick<
  RecruiterWorkbenchRow,
  'caseStatus' | 'placement' | 'placementOptions' | 'nextAction'
> {
  // Explicit default for `nextAction`: tests targeting the workflow gate
  // (F-06) pass `null` or a non-REVIEW value to flip the matrix into
  // "no actions" mode; the matrix tests rely on the default below.
  const explicit = Object.prototype.hasOwnProperty.call(
    overrides,
    'nextAction',
  );
  return {
    caseStatus: overrides.caseStatus ?? 'READY_TO_PLACE',
    placement: overrides.placement ?? null,
    placementOptions: overrides.placementOptions ?? null,
    nextAction: explicit
      ? (overrides.nextAction as RecruiterWorkbenchRow['nextAction'])
      : 'REVIEW_PLACEMENT',
  };
}

function placement(
  overrides: Partial<RecruiterWorkbenchPlacement> = {},
): RecruiterWorkbenchPlacement {
  return {
    id: overrides.id ?? 'pl-1',
    status: overrides.status ?? 'SELECTED',
    jobOpeningId: overrides.jobOpeningId ?? 'jo-1',
    managementMode: overrides.managementMode ?? 'HRP_MANAGED',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// availableActionsForRow
// ─────────────────────────────────────────────────────────────────────────

describe('availableActionsForRow', () => {
  it('F1-AVR01: CLOSED case → no actions', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'CLOSED',
        placement: placement({ status: 'EFFECTIVE' }),
      }),
    );
    expect(out).toEqual([]);
  });

  it('F1-AVR02: no placement + no options + non-READY_TO_PLACE → no actions', () => {
    const out = availableActionsForRow(
      baseRow({ caseStatus: 'IN_PROGRESS', placement: null, placementOptions: null }),
    );
    expect(out).toEqual([]);
  });

  it('F1-AVR03: no placement + READY_TO_PLACE + options → only create', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: null,
        placementOptions: [
          {
            jobOpeningId: 'jo-1',
            sourceCandidateSubmissionId: 's1',
            title: 'X',
            projectName: 'P',
            companyName: 'C',
          },
        ],
      }),
    );
    expect(out.map((a) => a.command)).toEqual(['placement.create']);
    expect(out[0]!.intent).toBe('primary');
  });

  it('F1-AVR04: SELECTED + READY_TO_PLACE → confirm + fail + cancel', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({ status: 'SELECTED' }),
      }),
    );
    expect(out.map((a) => a.command)).toEqual([
      'placement.confirm',
      'placement.fail',
      'placement.cancel',
    ]);
  });

  it('F1-AVR05: SELECTED + non-READY_TO_PLACE (stale) → no actions', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'IN_PROGRESS',
        placement: placement({ status: 'SELECTED' }),
      }),
    );
    expect(out).toEqual([]);
  });

  it('F1-AVR06: CONFIRMED + HRP_MANAGED → fail + cancel (NO EFFECTIVE)', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({
          status: 'CONFIRMED',
          managementMode: 'HRP_MANAGED',
        }),
      }),
    );
    expect(out.map((a) => a.command)).toEqual([
      'placement.fail',
      'placement.cancel',
    ]);
  });

  it('F1-AVR07: CONFIRMED + CLIENT_MANAGED → effective + fail + cancel', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({
          status: 'CONFIRMED',
          managementMode: 'CLIENT_MANAGED',
        }),
      }),
    );
    expect(out.map((a) => a.command)).toEqual([
      'placement.effective',
      'placement.fail',
      'placement.cancel',
    ]);
  });

  it('F1-AVR08: EFFECTIVE placement on non-CLOSED case → no actions', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({ status: 'EFFECTIVE' }),
      }),
    );
    expect(out).toEqual([]);
  });

  it('F1-AVR09: FAILED placement → no actions', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({ status: 'FAILED' }),
      }),
    );
    expect(out).toEqual([]);
  });

  it('F1-AVR10: CANCELLED placement → no actions', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: placement({ status: 'CANCELLED' }),
      }),
    );
    expect(out).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────
  // F-06 / AC-02 / AC-16 — workflow gate. Placement mutations are only
  //                       offered when `nextAction === 'REVIEW_PLACEMENT'`.
  //                       All other 6 enum values must yield NO actions,
  //                       regardless of placement status / options.
  // ───────────────────────────────────────────────────────────────────────

  const F06_NON_REVIEW_VALUES = [
    'OPEN_INTAKE',
    'REQUEST_DOCS',
    'SCREEN_SUBMISSION',
    'SCHEDULE_SCREEN',
    'AWAITING_RESULT',
    'NONE',
  ] as const;

  it.each(F06_NON_REVIEW_VALUES)(
    'F-06/F06-AVR-%s: non-REVIEW_PLACEMENT nextAction → empty even with placement options',
    (nextAction) => {
      const out = availableActionsForRow(
        baseRow({
          caseStatus: 'READY_TO_PLACE',
          placement: null,
          placementOptions: [
            {
              jobOpeningId: 'jo-1',
              sourceCandidateSubmissionId: 's1',
              title: 'X',
              projectName: 'P',
              companyName: 'C',
            },
          ],
          nextAction,
        }),
      );
      expect(out).toEqual([]);
    },
  );

  it.each(F06_NON_REVIEW_VALUES)(
    'F-06/F06-AVR-CONFIRMED-%s: non-REVIEW_PLACEMENT → empty even with CONFIRMED placement',
    (nextAction) => {
      const out = availableActionsForRow(
        baseRow({
          caseStatus: 'READY_TO_PLACE',
          placement: placement({
            status: 'CONFIRMED',
            managementMode: 'CLIENT_MANAGED',
          }),
          nextAction,
        }),
      );
      expect(out).toEqual([]);
    },
  );

  it('F-06/F06-AVR-NULL: null nextAction → empty', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: null,
        placementOptions: [
          {
            jobOpeningId: 'jo-1',
            sourceCandidateSubmissionId: 's1',
            title: 'X',
            projectName: 'P',
            companyName: 'C',
          },
        ],
        nextAction: null as unknown as 'REVIEW_PLACEMENT',
      }),
    );
    expect(out).toEqual([]);
  });

  it('F-06/F06-AVR-REVIEW: REVIEW_PLACEMENT + options → create', () => {
    const out = availableActionsForRow(
      baseRow({
        caseStatus: 'READY_TO_PLACE',
        placement: null,
        placementOptions: [
          {
            jobOpeningId: 'jo-1',
            sourceCandidateSubmissionId: 's1',
            title: 'X',
            projectName: 'P',
            companyName: 'C',
          },
        ],
        nextAction: 'REVIEW_PLACEMENT',
      }),
    );
    expect(out.map((a) => a.command)).toEqual(['placement.create']);
  });
});

describe('canPerformPlacementAction', () => {
  it('F1-CPA01: TRUE when at least one action is available', () => {
    expect(
      canPerformPlacementAction(
        baseRow({
          caseStatus: 'READY_TO_PLACE',
          placement: null,
          placementOptions: [
            {
              jobOpeningId: 'jo-1',
              sourceCandidateSubmissionId: 's1',
              title: 'X',
              projectName: 'P',
              companyName: 'C',
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('F1-CPA02: FALSE on terminal case', () => {
    expect(
      canPerformPlacementAction(baseRow({ caseStatus: 'CLOSED' })),
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Status / mode formatting
// ─────────────────────────────────────────────────────────────────────────

describe('formatPlacementStatusVi', () => {
  it('F1-PS01: returns canonical Vietnamese label per status', () => {
    expect(formatPlacementStatusVi('SELECTED')).toBe('Đã chọn');
    expect(formatPlacementStatusVi('CONFIRMED')).toBe('Đã xác nhận');
    expect(formatPlacementStatusVi('EFFECTIVE')).toBe('Đã hiệu lực');
    expect(formatPlacementStatusVi('FAILED')).toBe('Thất bại');
    expect(formatPlacementStatusVi('CANCELLED')).toBe('Đã huỷ');
  });
});

describe('formatManagementModeVi', () => {
  it('F1-MM01: HRP_MANAGED → HRP quản lý', () => {
    expect(formatManagementModeVi('HRP_MANAGED')).toBe('HRP quản lý');
  });
  it('F1-MM02: CLIENT_MANAGED → Khách hàng quản lý', () => {
    expect(formatManagementModeVi('CLIENT_MANAGED')).toBe('Khách hàng quản lý');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// formatErrorMessage
// ─────────────────────────────────────────────────────────────────────────

describe('formatErrorMessage', () => {
  it('F1-FEM01: 4xx known safe code → canned Vietnamese message (no envelope.message pass-through)', () => {
    // F-03: 4xx with a known safe error code → frozen Vietnamese canned
    // text. The envelope.message ("Đã xảy ra lỗi X") is intentionally
    // discarded so a server regression cannot leak via render.
    const out = formatErrorMessage(
      { error: 'VALIDATION', message: 'Đã xảy ra lỗi X' },
      400,
    );
    expect(out).toBe('Yêu cầu không hợp lệ. Vui lòng kiểm tra lại.');
    expect(out).not.toContain('Đã xảy ra lỗi X');
  });

  it('F1-FEM02: 4xx known safe code (VALIDATION alone) → canned Vietnamese text', () => {
    const out = formatErrorMessage({ error: 'VALIDATION' }, 400);
    expect(out).toBe('Yêu cầu không hợp lệ. Vui lòng kiểm tra lại.');
  });

  it('F1-FEM03: 4xx unknown code → status-keyed fallback', () => {
    expect(formatErrorMessage({}, 400)).toBe(
      'Yêu cầu thất bại (mã 400). Vui lòng thử lại.',
    );
  });

  it('F1-FEM04: null envelope, status=0 (network failure) → NETWORK_GENERIC_VI', () => {
    expect(formatErrorMessage(null)).toBe(
      'Không thể kết nối máy chủ. Vui lòng thử lại.',
    );
    expect(formatErrorMessage(undefined)).toBe(
      'Không thể kết nối máy chủ. Vui lòng thử lại.',
    );
  });

  it('F1-FEM05: 4xx unknown code with empty envelope → status-keyed fallback (no custom override path)', () => {
    // Status is known → status-keyed fallback wins over caller fallback.
    expect(formatErrorMessage({}, 400, 'CUSTOM')).toBe(
      'Yêu cầu thất bại (mã 400). Vui lòng thử lại.',
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // F-03 / LOCK-09 — 5xx and network failure must NEVER leak raw envelope
  // text. The render layer must only show fixed generic Vietnamese.
  // ───────────────────────────────────────────────────────────────────────

  it('F1-FEM06: 5xx envelope.message is DROPPED → fixed generic fallback only', () => {
    const out = formatErrorMessage(
      { error: 'INTERNAL', message: 'Stack: at db.ts:42, PII = 0987654321' },
      500,
    );
    expect(out).toBe('Đã có lỗi máy chủ. Vui lòng thử lại sau.');
    expect(out).not.toContain('Stack');
    expect(out).not.toContain('0987654321');
    expect(out).not.toContain('INTERNAL');
  });

  it('F1-FEM07: 502/503/504 → fixed generic fallback only', () => {
    for (const s of [502, 503, 504]) {
      const out = formatErrorMessage(
        { error: 'BAD_GATEWAY', message: 'leaky-token-XXX' },
        s,
      );
      expect(out).toBe('Đã có lỗi máy chủ. Vui lòng thử lại sau.');
      expect(out).not.toContain('leaky-token-XXX');
    }
  });

  it('F1-FEM08: status=0 (network failure) → fixed Vietnamese fallback only', () => {
    const out = formatErrorMessage(
      { error: 'NETWORK', message: 'leaky fetch error text' },
      0,
    );
    expect(out).toBe('Không thể kết nối máy chủ. Vui lòng thử lại.');
    expect(out).not.toContain('leaky');
  });

  it('F1-FEM09: 5xx with null envelope → fixed generic fallback only', () => {
    expect(formatErrorMessage(null, 500)).toBe(
      'Đã có lỗi máy chủ. Vui lòng thử lại sau.',
    );
  });

  it('F1-FEM10: 409 known safe code → canned Vietnamese (no envelope pass-through)', () => {
    expect(
      formatErrorMessage(
        { error: 'IDEMPOTENCY_CONFLICT', message: 'Trùng thao tác' },
        409,
      ),
    ).toBe(
      'Yêu cầu trùng với thao tác trước nhưng payload khác. Vui lòng tải lại trang.',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// fnv1a32Hex — deterministic + collision-resistant enough for the scope
// ─────────────────────────────────────────────────────────────────────────

describe('fnv1a32Hex', () => {
  it('F1-FNV01: empty payload canonicalizes to "" then hashes deterministically', () => {
    // The function canonicalizes first, so the empty payload becomes `'""'`
    // and produces a stable 8-char hash. Pin the value to catch drift.
    expect(fnv1a32Hex('')).toBe('ffcaaa85');
  });

  it('F1-FNV02: same input → same hash (determinism)', () => {
    const a = fnv1a32Hex('placement.confirm:pl-1');
    const b = fnv1a32Hex('placement.confirm:pl-1');
    expect(a).toBe(b);
  });

  it('F1-FNV03: different input → different hash', () => {
    const a = fnv1a32Hex('placement.confirm:pl-1');
    const b = fnv1a32Hex('placement.cancel:pl-1');
    expect(a).not.toBe(b);
  });

  it('F1-FNV04: returns 8-char unsigned hex', () => {
    expect(fnv1a32Hex('hello')).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1a32Hex('hello world!@#$%^&*()')).toMatch(/^[0-9a-f]{8}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// canonicalizePayload
// ─────────────────────────────────────────────────────────────────────────

describe('canonicalizePayload', () => {
  it('F1-CAN01: object keys are sorted deterministically', () => {
    expect(canonicalizePayload({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('F1-CAN02: nested object keys are sorted at every depth', () => {
    const a = canonicalizePayload({ outer: { b: 1, a: 2 } });
    const b = canonicalizePayload({ outer: { a: 2, b: 1 } });
    expect(a).toBe(b);
  });

  it('F1-CAN03: Date → ISO string', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(canonicalizePayload({ ts: d })).toContain('2026-01-01T00:00:00.000Z');
  });

  it('F1-CAN04: undefined keys are normalized to null', () => {
    expect(canonicalizePayload({ a: 1, b: undefined })).toBe('{"a":1,"b":null}');
  });

  it('F1-CAN05: order of insertion does not affect output', () => {
    const a = canonicalizePayload({ x: 1, y: 2, z: 3 });
    const b = canonicalizePayload({ z: 3, y: 2, x: 1 });
    expect(a).toBe(b);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// sessionStorageKeyForPlacementCommand
// ─────────────────────────────────────────────────────────────────────────

describe('sessionStorageKeyForPlacementCommand', () => {
  const p1 = {
    command: 'placement.confirm' as const,
    placementId: 'pl-1',
  };
  const p2 = {
    command: 'placement.cancel' as const,
    placementId: 'pl-1',
  };

  it('F1-SSK01: same command + scope + payload → same key (idempotent retry)', () => {
    const a = sessionStorageKeyForPlacementCommand({
      routeFamily: 'admin',
      command: 'placement.confirm',
      scope: 'pl-1',
      payload: p1,
    });
    const b = sessionStorageKeyForPlacementCommand({
      routeFamily: 'admin',
      command: 'placement.confirm',
      scope: 'pl-1',
      payload: p1,
    });
    expect(a).toBe(b);
  });

  it('F1-SSK02: payload hash differs when payload changes', () => {
    const a = sessionStorageKeyForPlacementCommand({
      routeFamily: 'admin',
      command: 'placement.confirm',
      scope: 'pl-1',
      payload: p1,
    });
    const b = sessionStorageKeyForPlacementCommand({
      routeFamily: 'admin',
      command: 'placement.cancel',
      scope: 'pl-1',
      payload: p2,
    });
    expect(a).not.toBe(b);
  });

  it('F1-SSK03: scope differs when placementId differs', () => {
    const a = sessionStorageKeyForPlacementCommand({
      routeFamily: 'admin',
      command: 'placement.confirm',
      scope: 'pl-1',
      payload: p1,
    });
    const b = sessionStorageKeyForPlacementCommand({
      routeFamily: 'admin',
      command: 'placement.confirm',
      scope: 'pl-2',
      payload: p1,
    });
    expect(a).not.toBe(b);
  });

  it('F1-SSK04: key prefix is `hrp.p1f1.idem.<routeFamily>.<command>`', () => {
    const a = sessionStorageKeyForPlacementCommand({
      routeFamily: 'admin',
      command: 'placement.create',
      scope: 'case-7',
      payload: { placementCaseId: 'case-7', jobOpeningId: 'jo-9' },
    });
    expect(a.startsWith('hrp.p1f1.idem.admin.placement.create.case-7.')).toBe(true);
  });

  it('F1-SSK05: routeFamily is in the prefix → admin/recruiter keys do NOT collide', () => {
    const a = sessionStorageKeyForPlacementCommand({
      routeFamily: 'admin',
      command: 'placement.create',
      scope: 'case-7',
      payload: { placementCaseId: 'case-7', jobOpeningId: 'jo-9' },
    });
    const b = sessionStorageKeyForPlacementCommand({
      routeFamily: 'recruiter',
      command: 'placement.create',
      scope: 'case-7',
      payload: { placementCaseId: 'case-7', jobOpeningId: 'jo-9' },
    });
    expect(a).not.toBe(b);
    expect(a.startsWith('hrp.p1f1.idem.admin.')).toBe(true);
    expect(b.startsWith('hrp.p1f1.idem.recruiter.')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// isStalePlacementSnapshot (LOCK-15)
// ─────────────────────────────────────────────────────────────────────────

describe('isStalePlacementSnapshot', () => {
  it('F1-STL01: NULL placement → not stale', () => {
    expect(
      isStalePlacementSnapshot(
        baseRow({ caseStatus: 'IN_PROGRESS', placement: null }),
      ),
    ).toBe(false);
  });

  it('F1-STL02: SELECTED + READY_TO_PLACE → not stale', () => {
    expect(
      isStalePlacementSnapshot(
        baseRow({
          caseStatus: 'READY_TO_PLACE',
          placement: placement({ status: 'SELECTED' }),
        }),
      ),
    ).toBe(false);
  });

  it('F1-STL03: SELECTED + non-READY → stale', () => {
    expect(
      isStalePlacementSnapshot(
        baseRow({
          caseStatus: 'IN_PROGRESS',
          placement: placement({ status: 'SELECTED' }),
        }),
      ),
    ).toBe(true);
  });

  it('F1-STL04: EFFECTIVE + non-CLOSED → stale', () => {
    expect(
      isStalePlacementSnapshot(
        baseRow({
          caseStatus: 'READY_TO_PLACE',
          placement: placement({ status: 'EFFECTIVE' }),
        }),
      ),
    ).toBe(true);
  });

  it('F1-STL05: EFFECTIVE + CLOSED → not stale (terminal normal)', () => {
    expect(
      isStalePlacementSnapshot(
        baseRow({
          caseStatus: 'CLOSED',
          placement: placement({ status: 'EFFECTIVE' }),
        }),
      ),
    ).toBe(false);
  });

  it('F1-STL06: FAILED on any caseStatus → not stale', () => {
    expect(
      isStalePlacementSnapshot(
        baseRow({
          caseStatus: 'IN_PROGRESS',
          placement: placement({ status: 'FAILED' }),
        }),
      ),
    ).toBe(false);
  });
});
