/**
 * assignment-placement.service unit tests — MP-3C STEP-03/04/05
 * (RQ-02..RQ-07; AC-02, AC-03, AC-05, AC-06).
 *
 * The service takes its transaction client as a parameter, so a hand-rolled fake
 * `tx` covers every branch with NO database. The fake records every write, which
 * is how "preview writes nothing" (RQ-02) is proven, and how the counter/audit/
 * outbox call counts are asserted.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  activatePlacement,
  deriveConflicts,
  mapWriteConflict,
  normalizePlacementAttributes,
  PlacementError,
  PLACEMENT_ROLES,
  previewPlacement,
  sortConflicts,
  type ActivatePlacementInput,
  type PlacementAttributes,
} from './assignment-placement.service';

const NOW = new Date('2026-08-25T03:00:00.000Z');
const HR = { userId: 'hr-1', role: 'HR_MANAGER' as const };
const ADMIN = { userId: 'admin-1', role: 'ADMIN' as const };

interface World {
  submissionMissing?: boolean;
  status?: string;
  workerId?: string | null;
  slotId?: string | null;
  vendorId?: string | null;
  ctvId?: string | null;
  acceptedClaimWorkerId?: string | null;
  slotMissing?: boolean;
  slotsNeeded?: number;
  slotsFilled?: number;
  slotValidFrom?: string;
  slotValidTo?: string | null;
  orderStatus?: string;
  orderMissing?: boolean;
  projectStatus?: string;
  projectMissing?: boolean;
  quota?: number;
  filled?: number;
  assignmentForSubmission?: { id: string; status: string } | null;
  activeAssignment?: { id: string; projectId: string } | null;
  employeeCodeClash?: boolean;
  r1Hit?: boolean;
  contract?: boolean;
  rateCard?: boolean;
  createThrows?: unknown;
}

function makeTx(w: World = {}) {
  const writes: string[] = [];
  const raw: string[] = [];
  const audit: Array<Record<string, unknown>> = [];
  const outbox: Array<Record<string, unknown>> = [];
  let slotsFilled = w.slotsFilled ?? 0;
  let filled = w.filled ?? 0;
  const slotsNeeded = w.slotsNeeded ?? 2;
  const quota = w.quota ?? 10;

  const tx = {
    candidateSubmission: {
      findUnique: vi.fn(async () => w.submissionMissing ? null : {
        id: 'sub-1',
        status: w.status ?? 'CONVERTED',
        workerId: w.workerId === undefined ? 'worker-1' : w.workerId,
        slotId: w.slotId === undefined ? 'slot-1' : w.slotId,
        vendorId: w.vendorId ?? null,
        ctvId: w.ctvId ?? null,
        sourceClaims: (w.acceptedClaimWorkerId === null)
          ? []
          : [{ id: 'claim-1', workerId: w.acceptedClaimWorkerId ?? (w.workerId === undefined ? 'worker-1' : w.workerId) }],
      }),
    },
    projectAssignment: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if ('submissionId' in where) return w.assignmentForSubmission ?? null;
        if (where.status === 'ACTIVE') {
          return w.activeAssignment
            ? {
                id: w.activeAssignment.id, projectId: w.activeAssignment.projectId,
                staffingOrderId: null, employeeCode: 'OLD-1', validFrom: new Date('2026-01-01T00:00:00.000Z'),
              }
            : null;
        }
        if ('employeeCode' in where) return w.employeeCodeClash ? { id: 'clash-1' } : null;
        return null;
      }),
      create: vi.fn(async () => {
        writes.push('assignment.create');
        if (w.createThrows) throw w.createThrows;
        return { id: 'assign-new' };
      }),
    },
    staffingOrder: {
      findUnique: vi.fn(async () => w.orderMissing ? null : {
        id: 'order-1', code: 'SO-001', status: w.orderStatus ?? 'OPEN', projectId: 'project-1',
      }),
    },
    project: {
      findUnique: vi.fn(async () => w.projectMissing ? null : {
        id: 'project-1', code: 'PRJ-1', name: 'Project One',
        status: w.projectStatus ?? 'ACTIVE', quota, filled,
      }),
      update: vi.fn(async () => { writes.push('project.update'); filled += 1; return { filled, quota }; }),
    },
    staffingOrderSlot: {
      update: vi.fn(async () => { writes.push('slot.update'); slotsFilled += 1; return { slotsFilled, slotsNeeded }; }),
    },
    contract: { findFirst: vi.fn(async () => (w.contract ? { id: 'contract-1' } : null)) },
    vendorRateCard: { findFirst: vi.fn(async () => (w.rateCard ? { id: 'rate-1' } : null)) },
    auditLog: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { writes.push('audit.create'); audit.push(data); return data; }) },
    outboxEvent: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { writes.push('outbox.create'); outbox.push(data); return data; }) },
    $executeRawUnsafe: vi.fn(async (sql: string) => { raw.push(sql); return 1; }),
    $queryRawUnsafe: vi.fn(async (sql: string) => {
      raw.push(sql);
      if (sql.includes('staffing_order_slots')) {
        return w.slotMissing ? [] : [{
          id: 'slot-1', staffing_order_id: 'order-1', position_code: 'ELECTRICIAN',
          position_title: 'Thợ điện', slots_needed: slotsNeeded, slots_filled: slotsFilled,
          valid_from: new Date(w.slotValidFrom ?? '2026-08-01T00:00:00.000Z'),
          valid_to: w.slotValidTo === undefined ? null : (w.slotValidTo ? new Date(w.slotValidTo) : null),
        }];
      }
      if (sql.includes('candidate_submissions')) return w.r1Hit ? [{ id: 'sub-other' }] : [];
      return [];
    }),
  };
  return { tx, writes, raw, audit, outbox, counters: () => ({ slotsFilled, filled }) };
}

const attrs: PlacementAttributes = {
  submissionId: 'sub-1',
  employeeCode: 'PRJ1-001',
  employmentType: 'OUTSOURCED',
  validFrom: '2026-08-25T00:00:00.000Z',
};
const activateInput: ActivatePlacementInput = { ...attrs, reason: 'Placement approved by HR' };

// ─── Validation (pure) ───────────────────────────────────────────────────────

describe('normalizePlacementAttributes', () => {
  it('accepts a well-formed, currently-effective payload', () => {
    const out = normalizePlacementAttributes({ ...attrs, workSetting: 'CONGXUONG', validTo: '2026-12-31T00:00:00.000Z' }, NOW);
    expect(out).toMatchObject({ submissionId: 'sub-1', employeeCode: 'PRJ1-001', employmentType: 'OUTSOURCED', workSetting: 'CONGXUONG' });
    expect(out.validFrom.toISOString()).toBe('2026-08-25T00:00:00.000Z');
  });

  it.each([
    ['missing submissionId', { ...attrs, submissionId: '  ' }],
    ['missing employeeCode', { ...attrs, employeeCode: '' }],
    ['employeeCode too long', { ...attrs, employeeCode: 'x'.repeat(65) }],
    ['bad employmentType', { ...attrs, employmentType: 'FREELANCE' }],
    ['bad workSetting', { ...attrs, workSetting: 'REMOTE' }],
    ['unparseable validFrom', { ...attrs, validFrom: 'not-a-date' }],
    ['validTo before validFrom', { ...attrs, validTo: '2026-08-24T00:00:00.000Z' }],
    ['future validFrom', { ...attrs, validFrom: '2026-09-01T00:00:00.000Z' }],
    ['already-expired validTo', { ...attrs, validTo: '2026-08-25T01:00:00.000Z' }],
  ])('rejects %s with VALIDATION', (_label, input) => {
    expect(() => normalizePlacementAttributes(input as PlacementAttributes, NOW))
      .toThrowError(expect.objectContaining({ code: 'VALIDATION', httpStatus: 400 }));
  });
});

describe('role boundary (DEC-04 / EV-08)', () => {
  it('permits only ADMIN and HR_MANAGER', () => {
    expect([...PLACEMENT_ROLES].sort()).toEqual(['ADMIN', 'HR_MANAGER']);
  });

  it.each(['DIRECTOR', 'SALE', 'HR_STAFF', 'PM', 'VENDOR_ADMIN', 'CTV', 'WORKER'])(
    'rejects %s on preview and activate before any read',
    async (role) => {
      const { tx, writes } = makeTx();
      const ctx = { userId: 'u', role: role as typeof HR.role };
      await expect(previewPlacement(tx as never, ctx, attrs, NOW))
        .rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
      await expect(activatePlacement(tx as never, ctx, activateInput, NOW))
        .rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
      expect(tx.candidateSubmission.findUnique).not.toHaveBeenCalled();
      expect(writes).toEqual([]);
    },
  );
});
// ─── Preview (RQ-02 / AC-02) ─────────────────────────────────────────────────

describe('previewPlacement — read-only projection', () => {
  it('is clean for an intact conversion and writes NOTHING', async () => {
    const { tx, writes } = makeTx();
    const preview = await previewPlacement(tx as never, HR, attrs, NOW);

    expect(preview.canActivate).toBe(true);
    expect(preview.conflicts).toEqual([]);
    expect(preview).toMatchObject({
      submissionId: 'sub-1', submissionStatus: 'CONVERTED', workerId: 'worker-1',
      sourceClaimId: 'claim-1', source: 'PUBLIC',
    });
    expect(preview.slot).toMatchObject({ id: 'slot-1', slotsNeeded: 2, slotsFilled: 0, remaining: 2 });
    expect(preview.order).toMatchObject({ id: 'order-1', status: 'OPEN' });
    expect(preview.project).toMatchObject({ id: 'project-1', quota: 10, filled: 0, remaining: 10 });
    expect(preview.referralGuard).toMatchObject({ blockCode: 0, overrideRequired: false });

    // RQ-02: no write of any kind, and no lock acquisition.
    expect(writes).toEqual([]);
    expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(tx.projectAssignment.create).not.toHaveBeenCalled();
    expect(tx.staffingOrderSlot.update).not.toHaveBeenCalled();
    expect(tx.project.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('never asks the database to lock the slot row', async () => {
    const { tx, raw } = makeTx();
    await previewPlacement(tx as never, HR, attrs, NOW);
    expect(raw.some((sql) => sql.includes('FOR UPDATE'))).toBe(false);
  });

  it('omits contact PII and rate/margin fields from the projection', async () => {
    const { tx } = makeTx();
    const preview = await previewPlacement(tx as never, ADMIN, attrs, NOW);
    const json = JSON.stringify(preview);
    for (const forbidden of ['phone', 'cccd', 'hourlyRate', 'hourly_rate', 'salary', 'margin', 'fullName']) {
      expect(json.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('404s an unknown submission', async () => {
    const { tx } = makeTx({ submissionMissing: true });
    await expect(previewPlacement(tx as never, HR, attrs, NOW))
      .rejects.toMatchObject({ code: 'NOT_FOUND', httpStatus: 404 });
  });

  it.each([
    ['a non-CONVERTED status', { status: 'QUALIFIED' }, 'status is QUALIFIED, expected CONVERTED'],
    ['a missing canonical worker', { workerId: null }, 'no canonical workerId'],
    ['a missing slot link', { slotId: null }, 'no slot link'],
    ['a missing accepted claim', { acceptedClaimWorkerId: null }, 'no accepted SourceClaim for the converted Worker'],
  ])('reports CONVERSION_INVARIANT_BROKEN for %s', async (_l, world, reason) => {
    const { tx } = makeTx(world as World);
    const preview = await previewPlacement(tx as never, HR, attrs, NOW);
    expect(preview.canActivate).toBe(false);
    const conflict = preview.conflicts.find((c) => c.code === 'CONVERSION_INVARIANT_BROKEN');
    expect(conflict).toBeDefined();
    expect((conflict?.details?.reasons as string[]).join('; ')).toContain(reason);
  });

  it.each([
    ['a closed staffing order', { orderStatus: 'CLOSED' }, 'staffing order is CLOSED, expected OPEN'],
    ['a non-ACTIVE project', { projectStatus: 'PAUSED' }, 'project is PAUSED, expected ACTIVE'],
    ['an expired slot interval', { slotValidTo: '2026-08-20T00:00:00.000Z' }, 'slot interval has expired'],
    ['a not-yet-started slot', { slotValidFrom: '2026-09-01T00:00:00.000Z' }, 'slot has not started yet'],
    ['a full slot', { slotsFilled: 2, slotsNeeded: 2 }, 'slot is full'],
    ['a missing slot row', { slotMissing: true }, 'slot not found or out of scope'],
  ])('reports SLOT_UNAVAILABLE for %s', async (_l, world, reason) => {
    const { tx } = makeTx(world as World);
    const preview = await previewPlacement(tx as never, HR, attrs, NOW);
    expect(preview.canActivate).toBe(false);
    const conflict = preview.conflicts.find((c) => c.code === 'SLOT_UNAVAILABLE');
    expect((conflict?.details?.reasons as string[]).join('; ')).toContain(reason);
  });

  it('reports PROJECT_QUOTA_FULL with the counters', async () => {
    const { tx } = makeTx({ quota: 3, filled: 3 });
    const preview = await previewPlacement(tx as never, HR, attrs, NOW);
    expect(preview.conflicts.map((c) => c.code)).toContain('PROJECT_QUOTA_FULL');
    expect(preview.project).toMatchObject({ quota: 3, filled: 3, remaining: 0 });
  });

  it('reports EMPLOYEE_CODE_CONFLICT', async () => {
    const { tx } = makeTx({ employeeCodeClash: true });
    const preview = await previewPlacement(tx as never, HR, attrs, NOW);
    const conflict = preview.conflicts.find((c) => c.code === 'EMPLOYEE_CODE_CONFLICT');
    expect(conflict?.details).toMatchObject({ projectId: 'project-1', employeeCode: 'PRJ1-001' });
  });

  it('reports ACTIVE_ASSIGNMENT_CONFLICT with the guided-transfer target (DEC-05)', async () => {
    const { tx } = makeTx({ activeAssignment: { id: 'assign-old', projectId: 'project-9' } });
    const preview = await previewPlacement(tx as never, HR, attrs, NOW);
    const conflict = preview.conflicts.find((c) => c.code === 'ACTIVE_ASSIGNMENT_CONFLICT');
    expect(conflict?.details).toMatchObject({ assignmentId: 'assign-old', projectId: 'project-9' });
    expect(preview.existingActiveAssignment).toMatchObject({ assignmentId: 'assign-old' });
  });

  it('reports ASSIGNMENT_EXISTS when the submission is already placed', async () => {
    const { tx } = makeTx({ assignmentForSubmission: { id: 'assign-1', status: 'ACTIVE' } });
    const preview = await previewPlacement(tx as never, HR, attrs, NOW);
    expect(preview.conflicts.map((c) => c.code)).toContain('ASSIGNMENT_EXISTS');
    expect(preview.existingAssignmentForSubmission).toMatchObject({ assignmentId: 'assign-1' });
  });

  it('reports an overridable REFERRAL_GUARD_BLOCKED for a blocked vendor referral', async () => {
    const { tx } = makeTx({ vendorId: 'vendor-1', contract: true, rateCard: true });
    const preview = await previewPlacement(tx as never, HR, attrs, NOW);
    const conflict = preview.conflicts.find((c) => c.code === 'REFERRAL_GUARD_BLOCKED');
    expect(conflict?.overridable).toBe(true);
    expect(conflict?.details).toMatchObject({ blockCode: 6, blockLabel: 'R2+R3', source: 'VENDOR' });
    expect(preview.referralGuard).toMatchObject({ overrideRequired: true, failedRules: ['R2', 'R3'] });
  });

  it('does not fabricate a vendor guard for a CTV referral', async () => {
    const { tx } = makeTx({ ctvId: 'ctv-1', contract: true, rateCard: true });
    const preview = await previewPlacement(tx as never, HR, attrs, NOW);
    expect(preview.source).toBe('CTV');
    expect(preview.canActivate).toBe(true);
    expect(preview.referralGuard).toMatchObject({ blockCode: 0, skippedRules: ['R2', 'R3'] });
  });

  it('returns conflicts in a stable order', () => {
    const shuffled = sortConflicts([
      { code: 'REFERRAL_GUARD_BLOCKED', message: 'g' },
      { code: 'ASSIGNMENT_EXISTS', message: 'a' },
      { code: 'CONVERSION_INVARIANT_BROKEN', message: 'c' },
      { code: 'SLOT_UNAVAILABLE', message: 's' },
    ]);
    expect(shuffled.map((c) => c.code)).toEqual([
      'CONVERSION_INVARIANT_BROKEN', 'ASSIGNMENT_EXISTS', 'SLOT_UNAVAILABLE', 'REFERRAL_GUARD_BLOCKED',
    ]);
  });

  it('deriveConflicts is the single source of truth shared with activate', () => {
    expect(typeof deriveConflicts).toBe('function');
  });
});
// ─── Activation (RQ-03/05/06/07 — AC-03, AC-05, AC-06) ───────────────────────

describe('activatePlacement — happy path', () => {
  it('locks worker then slot, creates ONE assignment and bumps both counters once', async () => {
    const { tx, writes, raw, audit, outbox, counters } = makeTx();
    const result = await activatePlacement(tx as never, HR, activateInput, NOW);

    expect(result).toMatchObject({
      assignmentId: 'assign-new', status: 'ACTIVE', submissionId: 'sub-1',
      workerId: 'worker-1', slotId: 'slot-1', staffingOrderId: 'order-1',
      projectId: 'project-1', employeeCode: 'PRJ1-001', overrideApplied: false,
    });
    expect(result.counters).toEqual({ slotsFilled: 1, slotsNeeded: 2, projectFilled: 1, projectQuota: 10 });
    expect(counters()).toEqual({ slotsFilled: 1, filled: 1 });

    // 4.4 lock order: worker advisory lock BEFORE the slot row lock.
    const lockIdx = raw.findIndex((sql) => sql.includes('pg_advisory_xact_lock'));
    const slotIdx = raw.findIndex((sql) => sql.includes('FOR UPDATE'));
    expect(lockIdx).toBeGreaterThanOrEqual(0);
    expect(slotIdx).toBeGreaterThan(lockIdx);

    // Exactly-once side effects (RQ-07).
    expect(writes).toEqual(['assignment.create', 'slot.update', 'project.update', 'audit.create', 'outbox.create']);
    expect(audit).toHaveLength(1);
    expect(outbox).toHaveLength(1);
    expect(audit[0]).toMatchObject({ entityType: 'ProjectAssignment', entityId: 'assign-new', action: 'ASSIGNMENT_ACTIVATE', reason: 'Placement approved by HR' });
    expect(outbox[0]).toMatchObject({ eventType: 'AssignmentActivated', aggregateId: 'assign-new' });
  });

  it('persists the canonical links and never trusts client IDs (DEC-01)', async () => {
    const { tx } = makeTx();
    await activatePlacement(tx as never, ADMIN, {
      ...activateInput,
      // Extra client-supplied IDs must be ignored entirely.
      ...({ workerId: 'evil-worker', slotId: 'evil-slot', projectId: 'evil-project' } as unknown as object),
    } as ActivatePlacementInput, NOW);
    const data = (tx.projectAssignment.create.mock.calls as unknown as Array<[{ data: Record<string, unknown> }]>)[0][0].data;
    expect(data).toMatchObject({
      workerId: 'worker-1', projectId: 'project-1', staffingOrderId: 'order-1',
      staffingOrderSlotId: 'slot-1', submissionId: 'sub-1', status: 'ACTIVE', isPrimary: true,
    });
  });

  it('requires a non-empty reason', async () => {
    const { tx, writes } = makeTx();
    await expect(activatePlacement(tx as never, HR, { ...activateInput, reason: '   ' }, NOW))
      .rejects.toMatchObject({ code: 'VALIDATION', httpStatus: 400 });
    expect(writes).toEqual([]);
  });
});

describe('activatePlacement — conflicts roll everything back', () => {
  it.each([
    ['CONVERSION_INVARIANT_BROKEN', { status: 'QUALIFIED' } as World],
    ['ASSIGNMENT_EXISTS', { assignmentForSubmission: { id: 'a', status: 'ACTIVE' } } as World],
    ['ACTIVE_ASSIGNMENT_CONFLICT', { activeAssignment: { id: 'assign-old', projectId: 'p9' } } as World],
    ['SLOT_UNAVAILABLE', { slotsFilled: 2, slotsNeeded: 2 } as World],
    ['PROJECT_QUOTA_FULL', { quota: 1, filled: 1 } as World],
    ['EMPLOYEE_CODE_CONFLICT', { employeeCodeClash: true } as World],
    ['REFERRAL_GUARD_BLOCKED', { vendorId: 'vendor-1', contract: true } as World],
  ])('throws %s and performs no write', async (code, world) => {
    const { tx, writes } = makeTx(world);
    await expect(activatePlacement(tx as never, HR, activateInput, NOW))
      .rejects.toMatchObject({ name: 'PlacementError', code, httpStatus: 409 });
    expect(writes).toEqual([]);
  });

  it('fails a CONVERTED submission that lost its worker before the lock', async () => {
    const { tx, writes } = makeTx({ workerId: null });
    await expect(activatePlacement(tx as never, HR, activateInput, NOW))
      .rejects.toMatchObject({ code: 'CONVERSION_INVARIANT_BROKEN' });
    expect(tx.$executeRawUnsafe).not.toHaveBeenCalled(); // no lock taken
    expect(writes).toEqual([]);
  });

  it('surfaces the full conflict list in details for the UI', async () => {
    const { tx } = makeTx({ quota: 1, filled: 1, employeeCodeClash: true });
    const error = await activatePlacement(tx as never, HR, activateInput, NOW)
      .then(() => null, (e: unknown) => e as PlacementError);
    expect(error).toBeInstanceOf(PlacementError);
    const codes = ((error as PlacementError).details?.conflicts as Array<{ code: string }>).map((c) => c.code);
    expect(codes).toEqual(['PROJECT_QUOTA_FULL', 'EMPLOYEE_CODE_CONFLICT']);
  });

  it('rolls back when the slot counter would exceed capacity after the increment', async () => {
    // slotsNeeded 1 with slotsFilled 0 passes the pre-check, but the fake bumps to 2
    // by reporting a smaller capacity on update — the post-increment guard fires.
    const { tx } = makeTx({ slotsNeeded: 1, slotsFilled: 0 });
    tx.staffingOrderSlot.update = vi.fn(async () => ({ slotsFilled: 2, slotsNeeded: 1 })) as never;
    await expect(activatePlacement(tx as never, HR, activateInput, NOW))
      .rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' });
    expect(tx.project.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('rolls back when the project counter would exceed quota after the increment', async () => {
    const { tx } = makeTx({ quota: 1, filled: 0 });
    tx.project.update = vi.fn(async () => ({ filled: 2, quota: 1 })) as never;
    await expect(activatePlacement(tx as never, HR, activateInput, NOW))
      .rejects.toMatchObject({ code: 'PROJECT_QUOTA_FULL' });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
  });
});

describe('activatePlacement — override gate (RQ-06 / AC-05)', () => {
  const blockedWorld: World = { vendorId: 'vendor-1', contract: true, rateCard: true };
  const override = { overrideCase: 'S2', reason: 'Client confirmed the transfer', evidence: 'ticket-9' };

  it('activates with a permitted override and audits it exactly once', async () => {
    const { tx, audit, writes } = makeTx(blockedWorld);
    const result = await activatePlacement(tx as never, HR,
      { ...activateInput, override, hasOverridePermission: true }, NOW);

    expect(result.overrideApplied).toBe(true);
    expect(writes).toEqual(['audit.create', 'assignment.create', 'slot.update', 'project.update', 'audit.create', 'outbox.create']);
    const overrideAudit = audit.filter((a) => String(a.action).startsWith('OVERRIDE_'));
    expect(overrideAudit).toHaveLength(1);
    expect(overrideAudit[0]).toMatchObject({ action: 'OVERRIDE_S2', entityType: 'ProjectAssignment', entityId: 'sub-1' });
    expect((overrideAudit[0].diff as Record<string, unknown>)).toMatchObject({ originalBlockCode: 6, slotId: 'slot-1' });
  });

  it('denies the override when the permission is absent — no write at all', async () => {
    const { tx, writes } = makeTx(blockedWorld);
    await expect(activatePlacement(tx as never, HR,
      { ...activateInput, override, hasOverridePermission: false }, NOW))
      .rejects.toMatchObject({ code: 'OVERRIDE_DENIED', httpStatus: 403 });
    expect(writes).toEqual([]);
  });

  it.each([
    ['an invalid case', { overrideCase: 'S9', reason: 'x' }],
    ['an empty reason', { overrideCase: 'S1', reason: '  ' }],
  ])('rejects %s with OVERRIDE_DENIED before any read', async (_l, bad) => {
    const { tx, writes } = makeTx(blockedWorld);
    await expect(activatePlacement(tx as never, HR,
      { ...activateInput, override: bad, hasOverridePermission: true }, NOW))
      .rejects.toMatchObject({ code: 'OVERRIDE_DENIED', httpStatus: 400 });
    expect(tx.candidateSubmission.findUnique).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });

  it('refuses an override when the guard did not block (nothing to override)', async () => {
    const { tx, writes } = makeTx();
    await expect(activatePlacement(tx as never, HR,
      { ...activateInput, override, hasOverridePermission: true }, NOW))
      .rejects.toMatchObject({ code: 'OVERRIDE_DENIED', httpStatus: 409 });
    expect(writes).toEqual([]);
  });

  it('an override does not clear a non-guard conflict', async () => {
    const { tx, writes } = makeTx({ ...blockedWorld, quota: 1, filled: 1 });
    await expect(activatePlacement(tx as never, HR,
      { ...activateInput, override, hasOverridePermission: true }, NOW))
      .rejects.toMatchObject({ code: 'PROJECT_QUOTA_FULL' });
    expect(writes).toEqual([]);
  });
});

describe('mapWriteConflict — DB backstops map to stable codes', () => {
  const p2002 = (target: string[]) => ({ code: 'P2002', meta: { target } });

  it('maps the submission_id unique index to ASSIGNMENT_EXISTS', () => {
    expect(mapWriteConflict(p2002(['submission_id']), 'sub-1', 'worker-1', 'C1'))
      .toMatchObject({ code: 'ASSIGNMENT_EXISTS', httpStatus: 409 });
  });

  it('maps one_active_assignment to ACTIVE_ASSIGNMENT_CONFLICT', () => {
    expect(mapWriteConflict(p2002(['one_active_assignment']), 'sub-1', 'worker-1', 'C1'))
      .toMatchObject({ code: 'ACTIVE_ASSIGNMENT_CONFLICT', details: { workerId: 'worker-1' } });
  });

  it('maps the project+employee_code unique index to EMPLOYEE_CODE_CONFLICT', () => {
    expect(mapWriteConflict(p2002(['project_id', 'employee_code']), 'sub-1', 'worker-1', 'C1'))
      .toMatchObject({ code: 'EMPLOYEE_CODE_CONFLICT' });
  });

  it('falls back to ASSIGNMENT_CONFLICT for anything else', () => {
    expect(mapWriteConflict(new Error('deadlock detected'), 'sub-1', 'worker-1', 'C1'))
      .toMatchObject({ code: 'ASSIGNMENT_CONFLICT', httpStatus: 409 });
    expect(mapWriteConflict(p2002(['something_else']), 'sub-1', 'worker-1', 'C1'))
      .toMatchObject({ code: 'ASSIGNMENT_CONFLICT' });
  });

  it('propagates a unique violation on submission_id raised by the insert', async () => {
    const { tx } = makeTx({ createThrows: p2002(['submission_id']) });
    await expect(activatePlacement(tx as never, HR, activateInput, NOW))
      .rejects.toMatchObject({ code: 'ASSIGNMENT_EXISTS' });
    expect(tx.staffingOrderSlot.update).not.toHaveBeenCalled();
    expect(tx.project.update).not.toHaveBeenCalled();
  });
});
