/**
 * job-opening-activation.service.test.ts — P1-A0.5 STEP-12 / AC-03 / AC-05.
 *
 * Pure / mocked unit tests for the activation service. Covers:
 *   - atomic state transitions (UPDATE filtered by status = 'DRAFT')
 *   - race-safety (distinct-key loser gets 0 rows updated → INVALID_STATE_TRANSITION)
 *   - NULL fail-closed (SERVICE_MODEL_REQUIRED 422)
 *   - role gate (PERMISSION_DENIED 403 for non-eligible roles)
 *   - scoped HR_STAFF authority (NO_ACTIVE_ORDER_ASSIGNMENT 403)
 *   - typed envelope (`JobOpeningActivationError` carries code + httpStatus + message)
 *   - idempotent replay (same value already set → returns without UPDATE)
 *   - placement fail-closed (placementCount > 0 → INVALID_STATE_TRANSITION)
 *   - opening predicate (no `NOT EXISTS job_postings` check)
 *
 * Race / RLS / atomic integration coverage lives in
 * `tests/db/p1a05-job-opening-readiness.integration.test.ts` (DB-touching).
 *
 * This file is a pure unit lane (no DATABASE_URL).
 */
import { describe, it, expect, vi } from 'vitest';
import type { Prisma, ServiceModel, SystemRole } from '@prisma/client';

import {
  classifyJobOpening,
  openJobOpening,
  JobOpeningActivationError,
} from './job-opening-activation.service';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const adminCtx = { userId: 'admin-1', role: 'ADMIN' as SystemRole };
const hrManagerCtx = { userId: 'mgr-1', role: 'HR_MANAGER' as SystemRole };
const hrStaffCtx = { userId: 'staff-1', role: 'HR_STAFF' as SystemRole };
const directorCtx = { userId: 'dir-1', role: 'DIRECTOR' as SystemRole };
const vendorCtx = { userId: 'v-1', role: 'VENDOR_ADMIN' as SystemRole };

interface TxMocks {
  findUnique?: ReturnType<typeof vi.fn>;
  updateMany?: ReturnType<typeof vi.fn>;
  queryRaw?: ReturnType<typeof vi.fn>;
  // For HR_STAFF authority (assertActiveRecruiterForOrder)
  findFirst?: ReturnType<typeof vi.fn>;
}

function makeTx(mocks: TxMocks = {}): Prisma.TransactionClient {
  const findUnique = mocks.findUnique ?? vi.fn();
  const updateMany = mocks.updateMany ?? vi.fn();
  const queryRaw = mocks.queryRaw ?? vi.fn();
  const findFirst = mocks.findFirst ?? vi.fn();
  return {
    jobOpening: {
      findUnique: findUnique as never,
      updateMany: updateMany as never,
    },
    $queryRaw: queryRaw as never,
    staffingOrderRecruiterAssignment: {
      findFirst: findFirst as never,
    },
  } as unknown as Prisma.TransactionClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// classifyJobOpening — AC-03
// ─────────────────────────────────────────────────────────────────────────────

describe('classifyJobOpening (AC-03)', () => {
  it('(a) DRAFT + valid 4-enum serviceModel → updates and returns', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'op-1',
      status: 'DRAFT',
      serviceModel: null,
      _count: { placements: 0 },
    });
    const queryRaw = vi.fn().mockResolvedValue([{ id: 'op-1' }]);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = makeTx({ findUnique, queryRaw, updateMany });

    const result = await classifyJobOpening(tx, adminCtx, {
      openingId: 'op-1',
      serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
    });
    expect(result).toEqual({
      openingId: 'op-1',
      serviceModel: 'STAFFING_SUPPLY',
      status: 'DRAFT',
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'op-1', status: 'DRAFT' },
      data: { serviceModel: 'STAFFING_SUPPLY' },
    });
  });

  it('(b) OPEN opening → 409 INVALID_STATE_TRANSITION (no UPDATE)', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'op-2',
      status: 'OPEN',
      serviceModel: 'STAFFING_SUPPLY',
      _count: { placements: 0 },
    });
    const updateMany = vi.fn();
    const tx = makeTx({ findUnique, updateMany });

    await expect(
      classifyJobOpening(tx, adminCtx, {
        openingId: 'op-2',
        serviceModel: 'RECRUITMENT_SERVICE' as ServiceModel,
      }),
    ).rejects.toMatchObject({
      name: 'JobOpeningActivationError',
      code: 'INVALID_STATE_TRANSITION',
      httpStatus: 409,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('(c) NULL incoming serviceModel → 400 INVALID_INPUT', async () => {
    const findUnique = vi.fn();
    const tx = makeTx({ findUnique });
    await expect(
      classifyJobOpening(tx, adminCtx, {
        openingId: 'op-1',
        // @ts-expect-error: deliberately invalid
        serviceModel: null,
      }),
    ).rejects.toMatchObject({
      name: 'JobOpeningActivationError',
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('(c2) unknown enum → 400 INVALID_INPUT', async () => {
    const tx = makeTx();
    await expect(
      classifyJobOpening(tx, adminCtx, {
        openingId: 'op-1',
        // @ts-expect-error: deliberately invalid
        serviceModel: 'BOGUS_ENUM',
      }),
    ).rejects.toMatchObject({
      name: 'JobOpeningActivationError',
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
  });

  it('(d) placement exists → 409 INVALID_STATE_TRANSITION (defense in depth)', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'op-3',
      status: 'DRAFT',
      serviceModel: null,
      _count: { placements: 1 },
    });
    const tx = makeTx({ findUnique });
    await expect(
      classifyJobOpening(tx, adminCtx, {
        openingId: 'op-3',
        serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      httpStatus: 409,
    });
  });

  it('(e) atomic — race loser (UPDATE count=0) → 409 INVALID_STATE_TRANSITION', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'op-4',
      status: 'DRAFT',
      serviceModel: null,
      _count: { placements: 0 },
    });
    const queryRaw = vi.fn().mockResolvedValue([{ id: 'op-4' }]);
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const tx = makeTx({ findUnique, queryRaw, updateMany });
    await expect(
      classifyJobOpening(tx, adminCtx, {
        openingId: 'op-4',
        serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      httpStatus: 409,
    });
  });

  it('idempotent replay — same value already set → no UPDATE, return same', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'op-5',
      status: 'DRAFT',
      serviceModel: 'STAFFING_SUPPLY',
      _count: { placements: 0 },
    });
    const updateMany = vi.fn();
    const tx = makeTx({ findUnique, updateMany });
    const result = await classifyJobOpening(tx, adminCtx, {
      openingId: 'op-5',
      serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
    });
    expect(result.serviceModel).toBe('STAFFING_SUPPLY');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('role gate — HR_STAFF → 403 PERMISSION_DENIED', async () => {
    const tx = makeTx();
    await expect(
      classifyJobOpening(tx, hrStaffCtx, {
        openingId: 'op-1',
        serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
      }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      httpStatus: 403,
    });
  });

  it('role gate — DIRECTOR → 403 PERMISSION_DENIED', async () => {
    const tx = makeTx();
    await expect(
      classifyJobOpening(tx, directorCtx, {
        openingId: 'op-1',
        serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
      }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      httpStatus: 403,
    });
  });

  it('role gate — VENDOR_ADMIN → 403 PERMISSION_DENIED', async () => {
    const tx = makeTx();
    await expect(
      classifyJobOpening(tx, vendorCtx, {
        openingId: 'op-1',
        serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
      }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      httpStatus: 403,
    });
  });

  it('NOT_FOUND — unknown openingId → 404', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const tx = makeTx({ findUnique });
    await expect(
      classifyJobOpening(tx, adminCtx, {
        openingId: 'op-missing',
        serviceModel: 'STAFFING_SUPPLY' as ServiceModel,
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// openJobOpening — AC-05
// ─────────────────────────────────────────────────────────────────────────────

describe('openJobOpening (AC-05)', () => {
  it('(a) DRAFT + serviceModel set + parent OPEN + slot eligible → status OPEN + openedAt set', async () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'DRAFT',
        service_model: 'STAFFING_SUPPLY',
        order_status: 'OPEN',
        order_deadline_date: null,
        slot_valid_to: future,
        slots_filled: 0,
        slots_needed: 1,
        slot_is_eligible: true,
      },
    ]);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi.fn(); // unused for ADMIN
    const tx = makeTx({ queryRaw, updateMany, findFirst });

    const result = await openJobOpening(tx, adminCtx, { openingId: 'op-1' });
    expect(result.openingId).toBe('op-1');
    expect(result.status).toBe('OPEN');
    expect(typeof result.openedAt).toBe('string');
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'op-1', status: 'DRAFT' },
      }),
    );
  });

  it('(b) NULL serviceModel → 422 SERVICE_MODEL_REQUIRED', async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'DRAFT',
        service_model: null,
        order_status: 'OPEN',
        order_deadline_date: null,
        slot_valid_to: null,
        slots_filled: 0,
        slots_needed: 1,
        slot_is_eligible: true,
      },
    ]);
    const updateMany = vi.fn();
    const tx = makeTx({ queryRaw, updateMany });
    await expect(
      openJobOpening(tx, adminCtx, { openingId: 'op-1' }),
    ).rejects.toMatchObject({
      code: 'SERVICE_MODEL_REQUIRED',
      httpStatus: 422,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('(c) parent order not OPEN → 409 ORDER_NOT_OPEN', async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'DRAFT',
        service_model: 'STAFFING_SUPPLY',
        order_status: 'CLOSED',
        order_deadline_date: null,
        slot_valid_to: null,
        slots_filled: 0,
        slots_needed: 1,
        slot_is_eligible: true,
      },
    ]);
    const updateMany = vi.fn();
    const tx = makeTx({ queryRaw, updateMany });
    await expect(
      openJobOpening(tx, adminCtx, { openingId: 'op-1' }),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_OPEN',
      httpStatus: 409,
    });
  });

  it('(d) slot deadline passed → 409 SLOT_NOT_ELIGIBLE', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'DRAFT',
        service_model: 'STAFFING_SUPPLY',
        order_status: 'OPEN',
        order_deadline_date: past,
        slot_valid_to: null,
        slots_filled: 0,
        slots_needed: 1,
        slot_is_eligible: false,
      },
    ]);
    const updateMany = vi.fn();
    const tx = makeTx({ queryRaw, updateMany });
    await expect(
      openJobOpening(tx, adminCtx, { openingId: 'op-1' }),
    ).rejects.toMatchObject({
      code: 'SLOT_NOT_ELIGIBLE',
      httpStatus: 409,
    });
  });

  it('(d2) slot over-filled → 409 SLOT_NOT_ELIGIBLE', async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'DRAFT',
        service_model: 'STAFFING_SUPPLY',
        order_status: 'OPEN',
        order_deadline_date: null,
        slot_valid_to: null,
        slots_filled: 5,
        slots_needed: 5,
        slot_is_eligible: false,
      },
    ]);
    const updateMany = vi.fn();
    const tx = makeTx({ queryRaw, updateMany });
    await expect(
      openJobOpening(tx, adminCtx, { openingId: 'op-1' }),
    ).rejects.toMatchObject({
      code: 'SLOT_NOT_ELIGIBLE',
      httpStatus: 409,
    });
  });

  it('(e) HR_STAFF without active assignment → 403 NO_ACTIVE_ORDER_ASSIGNMENT', async () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'DRAFT',
        service_model: 'STAFFING_SUPPLY',
        order_status: 'OPEN',
        order_deadline_date: null,
        slot_valid_to: future,
        slots_filled: 0,
        slots_needed: 1,
        slot_is_eligible: true,
      },
    ]);
    const findFirst = vi.fn().mockResolvedValue(null); // no active assignment
    const updateMany = vi.fn();
    const tx = makeTx({ queryRaw, findFirst, updateMany });

    await expect(
      openJobOpening(tx, hrStaffCtx, { openingId: 'op-1' }),
    ).rejects.toMatchObject({
      code: 'NO_ACTIVE_ORDER_ASSIGNMENT',
      httpStatus: 403,
    });
  });

  it('(f) Presence of a JobPosting DRAFT MUST NOT fail /open (shared-predicate refactor)', async () => {
    // The opening predicate uses the BASE capacity/time/order predicate (no
    // `NOT EXISTS job_postings`). A slot with an existing JobPosting DRAFT
    // is still ELIGIBLE for opening the JobOpening. We model this by
    // returning is_eligible: true even though a JobPosting DRAFT exists
    // (the test fixture encodes the slot's eligibility, not the postings).
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'DRAFT',
        service_model: 'STAFFING_SUPPLY',
        order_status: 'OPEN',
        order_deadline_date: null,
        slot_valid_to: future,
        slots_filled: 0,
        slots_needed: 1,
        slot_is_eligible: true, // base predicate only; no `NOT EXISTS job_postings`
      },
    ]);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = makeTx({ queryRaw, updateMany });
    const result = await openJobOpening(tx, adminCtx, { openingId: 'op-1' });
    expect(result.status).toBe('OPEN');
  });

  it('(g) concurrent race — UPDATE count=0 → 409 INVALID_STATE_TRANSITION', async () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'DRAFT',
        service_model: 'STAFFING_SUPPLY',
        order_status: 'OPEN',
        order_deadline_date: null,
        slot_valid_to: future,
        slots_filled: 0,
        slots_needed: 1,
        slot_is_eligible: true,
      },
    ]);
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const tx = makeTx({ queryRaw, updateMany });
    await expect(
      openJobOpening(tx, adminCtx, { openingId: 'op-1' }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      httpStatus: 409,
    });
  });

  it('(h) OPEN opening (race lost) → 409 INVALID_STATE_TRANSITION', async () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'OPEN',
        service_model: 'STAFFING_SUPPLY',
        order_status: 'OPEN',
        order_deadline_date: null,
        slot_valid_to: future,
        slots_filled: 0,
        slots_needed: 1,
        slot_is_eligible: true,
      },
    ]);
    const updateMany = vi.fn();
    const tx = makeTx({ queryRaw, updateMany });
    await expect(
      openJobOpening(tx, adminCtx, { openingId: 'op-1' }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      httpStatus: 409,
    });
  });

  it('(i) NOT_FOUND — unknown openingId → 404', async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    const tx = makeTx({ queryRaw });
    await expect(
      openJobOpening(tx, adminCtx, { openingId: 'op-missing' }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('PERMISSION_DENIED — VENDOR_ADMIN', async () => {
    const tx = makeTx();
    await expect(
      openJobOpening(tx, vendorCtx, { openingId: 'op-1' }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      httpStatus: 403,
    });
  });

  it('HR_STAFF WITH active assignment → opens successfully (scoped authority)', async () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'op-1',
        staffing_order_id: 'so-1',
        staffing_order_slot_id: 'slot-1',
        status: 'DRAFT',
        service_model: 'STAFFING_SUPPLY',
        order_status: 'OPEN',
        order_deadline_date: null,
        slot_valid_to: future,
        slots_filled: 0,
        slots_needed: 1,
        slot_is_eligible: true,
      },
    ]);
    const findFirst = vi.fn().mockResolvedValue({ id: 'asg-1' }); // active
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = makeTx({ queryRaw, findFirst, updateMany });
    const result = await openJobOpening(tx, hrStaffCtx, { openingId: 'op-1' });
    expect(result.status).toBe('OPEN');
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          staffingOrderId: 'so-1',
          recruiterUserId: 'staff-1',
          status: 'ACTIVE',
        }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Typed envelope shape (RQ-09)
// ─────────────────────────────────────────────────────────────────────────────

describe('JobOpeningActivationError typed envelope', () => {
  it('carries code + httpStatus + message + details', () => {
    const err = new JobOpeningActivationError(
      'INVALID_STATE_TRANSITION',
      409,
      'JobOpening is OPEN',
      { currentStatus: 'OPEN' },
    );
    expect(err.name).toBe('JobOpeningActivationError');
    expect(err.code).toBe('INVALID_STATE_TRANSITION');
    expect(err.httpStatus).toBe(409);
    expect(err.message).toBe('JobOpening is OPEN');
    expect(err.details).toEqual({ currentStatus: 'OPEN' });
    expect(err).toBeInstanceOf(Error);
  });
});
