import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  createInitialAffiliateAssignment,
  getActiveHandlingAssignment,
  managerAssign,
  releaseHandlingAssignment,
  ASSIGNMENT_STATUS,
  ASSIGNMENT_SOURCE,
  normalizeManagerAssignDays,
  MANAGER_ASSIGN_DAYS_DEFAULT,
  MANAGER_ASSIGN_DAYS_MIN,
  MANAGER_ASSIGN_DAYS_MAX,
  ManagerAssignDaysError,
} from './handling-assignment.service';

const mockTx = {
  laborProfileHandlingAssignment: {
    updateMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
} as unknown as Prisma.TransactionClient;

describe('handling-assignment.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create initial affiliate assignment correctly', async () => {
    const laborProfileId = 'lp-1';
    const referrerUserId = 'user-1';

    (mockTx.laborProfileHandlingAssignment.create as any).mockImplementation(async (args: any) => ({
      id: 'assignment-1',
      ...args.data,
    }));

    const assignment = await createInitialAffiliateAssignment(mockTx, {
      laborProfileId,
      referrerUserId,
    });

    expect(mockTx.laborProfileHandlingAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        laborProfileId,
        status: ASSIGNMENT_STATUS.ACTIVE,
      },
      data: {
        status: ASSIGNMENT_STATUS.REVOKED,
        reason: 'Replaced by initial affiliate assignment',
        updatedAt: expect.any(Date),
      },
    });

    expect(assignment.laborProfileId).toBe(laborProfileId);
    expect(assignment.assigneeUserId).toBe(referrerUserId);
    expect(assignment.assignedByUserId).toBeNull();
    expect(assignment.source).toBe(ASSIGNMENT_SOURCE.AFF_INITIAL);
    expect(assignment.status).toBe(ASSIGNMENT_STATUS.ACTIVE);
    expect(assignment.expiresAt).toBeDefined();
  });

  it('should return null for expired assignment (expiresAt < asOf)', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24);

    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue({
      id: 'assignment-old',
      expiresAt: pastDate,
      status: ASSIGNMENT_STATUS.ACTIVE,
    });

    const active = await getActiveHandlingAssignment(mockTx, 'lp-2');
    expect(active).toBeNull();
  });

  it('should return null when expiresAt exactly equals asOf (boundary: expired)', async () => {
    const fixedNow = new Date('2026-09-22T12:00:00Z');
    vi.setSystemTime(fixedNow);
    const exactExpiry = new Date('2026-09-22T12:00:00Z'); // exactly same instant

    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue({
      id: 'assignment-exact',
      expiresAt: exactExpiry,
      status: ASSIGNMENT_STATUS.ACTIVE,
    });

    // Same snapshot used by both sweep and getActiveHandlingAssignment
    const asOf = new Date('2026-09-22T12:00:00Z');
    const active = await getActiveHandlingAssignment(mockTx, 'lp-boundary', asOf);

    // expiresAt === asOf is treated as expired (consistent with sweep lte)
    expect(active).toBeNull();
    vi.useRealTimers();
  });

  it('should manager assign and transfer previous assignment', async () => {
    const activeAssignment = { id: 'old-1', expiresAt: null };
    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue(activeAssignment);
    (mockTx.laborProfileHandlingAssignment.create as any).mockImplementation(async (args: any) => args.data);
    (mockTx.user.findUnique as any).mockResolvedValue({ role: 'HR_STAFF' });

    const newAssignment = await managerAssign(mockTx, {
      laborProfileId: 'lp-3',
      newAssigneeUserId: 'user-2',
      managerUserId: 'manager-1',
      days: 30,
      reason: 'Manual assign',
    });

    expect(mockTx.laborProfileHandlingAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        laborProfileId: 'lp-3',
        status: ASSIGNMENT_STATUS.ACTIVE,
        expiresAt: { lte: expect.any(Date) },
      },
      data: {
        status: ASSIGNMENT_STATUS.EXPIRED,
        updatedAt: expect.any(Date),
      },
    });
    expect(mockTx.laborProfileHandlingAssignment.update).toHaveBeenCalledWith({
      where: { id: 'old-1' },
      data: {
        status: ASSIGNMENT_STATUS.TRANSFERRED,
        reason: 'Manager reassigned',
        updatedAt: expect.any(Date),
      },
    });

    expect(newAssignment.assigneeUserId).toBe('user-2');
    expect(newAssignment.previousAssignmentId).toBe('old-1');
    expect(newAssignment.source).toBe(ASSIGNMENT_SOURCE.MANAGER_ASSIGNMENT);
  });

  it('should create after sweeping an elapsed ACTIVE row', async () => {
    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue(null);
    (mockTx.laborProfileHandlingAssignment.create as any).mockImplementation(async (args: any) => args.data);
    (mockTx.user.findUnique as any).mockResolvedValue({ role: 'HR_STAFF' });

    const newAssignment = await managerAssign(mockTx, {
      laborProfileId: 'lp-expired',
      newAssigneeUserId: 'user-2',
      managerUserId: 'manager-1',
      days: 7,
      reason: 'Reassign expired handling',
    });

    expect(mockTx.laborProfileHandlingAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        laborProfileId: 'lp-expired',
        status: ASSIGNMENT_STATUS.ACTIVE,
        expiresAt: { lte: expect.any(Date) },
      },
      data: {
        status: ASSIGNMENT_STATUS.EXPIRED,
        updatedAt: expect.any(Date),
      },
    });
    expect(newAssignment.status).toBe(ASSIGNMENT_STATUS.ACTIVE);
    expect(newAssignment.previousAssignmentId).toBeNull();
  });

  it('should record manual release as REVOKED', async () => {
    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue({
      id: 'active-1',
      expiresAt: null,
    });
    (mockTx.user.findUnique as any).mockResolvedValue({ name: 'Manager' });
    (mockTx.laborProfileHandlingAssignment.update as any).mockImplementation(async (args: any) => args.data);

    const released = await releaseHandlingAssignment(mockTx, {
      laborProfileId: 'lp-release',
      actorId: 'manager-1',
      reason: 'Return to pool',
    });

    expect(released?.status).toBe(ASSIGNMENT_STATUS.REVOKED);
    expect(released?.reason).toBe('[Thu hồi bởi Manager] Return to pool');
  });

  it('should expire an elapsed row and not manually revoke it', async () => {
    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue(null);

    const released = await releaseHandlingAssignment(mockTx, {
      laborProfileId: 'lp-elapsed-release',
      actorId: 'manager-1',
      reason: 'Too late',
    });

    expect(released).toBeNull();
    expect(mockTx.laborProfileHandlingAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        laborProfileId: 'lp-elapsed-release',
        status: ASSIGNMENT_STATUS.ACTIVE,
        expiresAt: { lte: expect.any(Date) },
      },
      data: {
        status: ASSIGNMENT_STATUS.EXPIRED,
        updatedAt: expect.any(Date),
      },
    });
    expect(mockTx.laborProfileHandlingAssignment.update).not.toHaveBeenCalled();
  });

  // --- Timing-edge deterministic regression tests ---
  // These tests use vi.setSystemTime so that sweep and getActive see
  // the exact same `now` snapshot — no reliance on wall-clock timing.

  it('sweep + getActive share the same `now` snapshot: expired row gets EXPIRED then new ACTIVE is created', async () => {
    const fixedNow = new Date('2026-09-22T12:00:00Z');
    vi.setSystemTime(fixedNow);

    // Simulate: DB has an ACTIVE row whose expiresAt is already past `now`
    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue(null);

    (mockTx.laborProfileHandlingAssignment.updateMany as any).mockResolvedValue({ count: 1 });
    (mockTx.laborProfileHandlingAssignment.create as any).mockImplementation(async (args: any) => args.data);
    (mockTx.user.findUnique as any).mockResolvedValue({ role: 'HR_STAFF' });

    const result = await managerAssign(mockTx, {
      laborProfileId: 'lp-same-snapshot',
      newAssigneeUserId: 'user-2',
      managerUserId: 'manager-1',
      days: 7,
      reason: 'Same-snapshot test',
    });

    // The sweep should have marked the old row EXPIRED
    expect(mockTx.laborProfileHandlingAssignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ASSIGNMENT_STATUS.ACTIVE,
          expiresAt: { lte: fixedNow },
        }),
        data: expect.objectContaining({
          status: ASSIGNMENT_STATUS.EXPIRED,
        }),
      }),
    );

    // getActive found nothing (sweep already cleared it) → new ACTIVE created
    expect(mockTx.laborProfileHandlingAssignment.create).toHaveBeenCalled();
    expect(result.status).toBe(ASSIGNMENT_STATUS.ACTIVE);
    expect(result.previousAssignmentId).toBeNull(); // no valid predecessor

    vi.useRealTimers();
  });

  it('sweep + getActive share the same `now` snapshot: valid row gets TRANSFERRED then new ACTIVE links to it', async () => {
    const fixedNow = new Date('2026-09-22T12:00:00Z');
    vi.setSystemTime(fixedNow);

    const stillValid = {
      id: 'valid-predecessor',
      expiresAt: new Date('2026-09-29T12:00:00Z'), // far future > now
    };

    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue(stillValid);
    (mockTx.laborProfileHandlingAssignment.updateMany as any).mockResolvedValue({ count: 0 });
    (mockTx.laborProfileHandlingAssignment.update as any).mockImplementation(async (args: any) => args.data);
    (mockTx.laborProfileHandlingAssignment.create as any).mockImplementation(async (args: any) => args.data);
    (mockTx.user.findUnique as any).mockResolvedValue({ role: 'HR_STAFF' });

    const result = await managerAssign(mockTx, {
      laborProfileId: 'lp-valid-pred',
      newAssigneeUserId: 'user-2',
      managerUserId: 'manager-1',
      days: 7,
      reason: 'Valid predecessor',
    });

    // Sweep found 0 rows to expire (nothing elapsed)
    expect(mockTx.laborProfileHandlingAssignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ expiresAt: { lte: fixedNow } }),
        data: expect.objectContaining({ status: ASSIGNMENT_STATUS.EXPIRED }),
      }),
    );

    // getActive found the still-valid row → TRANSFERRED
    expect(mockTx.laborProfileHandlingAssignment.update).toHaveBeenCalledWith({
      where: { id: 'valid-predecessor' },
      data: expect.objectContaining({ status: ASSIGNMENT_STATUS.TRANSFERRED }),
    });

    // New ACTIVE links to predecessor
    expect(result.previousAssignmentId).toBe('valid-predecessor');
    expect(result.status).toBe(ASSIGNMENT_STATUS.ACTIVE);

    vi.useRealTimers();
  });

  it('release with valid assignment: marks REVOKED and returns the row', async () => {
    const fixedNow = new Date('2026-09-22T12:00:00Z');
    vi.setSystemTime(fixedNow);

    const valid = {
      id: 'valid-release',
      expiresAt: new Date('2026-09-29T12:00:00Z'),
    };
    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue(valid);
    (mockTx.laborProfileHandlingAssignment.updateMany as any).mockResolvedValue({ count: 0 });
    (mockTx.laborProfileHandlingAssignment.update as any).mockImplementation(async (args: any) => args.data);
    (mockTx.user.findUnique as any).mockResolvedValue({ name: 'Manager' });

    const result = await releaseHandlingAssignment(mockTx, {
      laborProfileId: 'lp-valid-release',
      actorId: 'manager-1',
      reason: 'Return to pool',
    });

    expect(result?.status).toBe(ASSIGNMENT_STATUS.REVOKED);
    expect(mockTx.laborProfileHandlingAssignment.update).toHaveBeenCalledWith({
      where: { id: 'valid-release' },
      data: expect.objectContaining({ status: ASSIGNMENT_STATUS.REVOKED }),
    });

    vi.useRealTimers();
  });

  it('release with expired assignment: sweep marks EXPIRED, getActive returns null, nothing updated', async () => {
    const fixedNow = new Date('2026-09-22T12:00:00Z');
    vi.setSystemTime(fixedNow);

    // After sweep, findFirst returns null (row already swept away or null due to expiresAt <= now)
    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue(null);
    (mockTx.laborProfileHandlingAssignment.updateMany as any).mockResolvedValue({ count: 1 });

    const result = await releaseHandlingAssignment(mockTx, {
      laborProfileId: 'lp-expired-release',
      actorId: 'manager-1',
      reason: 'Too late',
    });

    // Sweep ran
    expect(mockTx.laborProfileHandlingAssignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ASSIGNMENT_STATUS.ACTIVE,
          expiresAt: { lte: fixedNow },
        }),
          data: expect.objectContaining({ status: ASSIGNMENT_STATUS.EXPIRED }),
      }),
    );

    // getActive found nothing → no update
    expect(result).toBeNull();
    expect(mockTx.laborProfileHandlingAssignment.update).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  // --- AFF-05A-R2 normalized duration contract (AC-01) ---
  describe('normalizeManagerAssignDays', () => {
    it('returns 7 when property absent', () => {
      expect(normalizeManagerAssignDays(false, undefined)).toBe(MANAGER_ASSIGN_DAYS_DEFAULT);
    });

    it('accepts the boundary values 1, 7, 30', () => {
      for (const v of [MANAGER_ASSIGN_DAYS_MIN, 7, MANAGER_ASSIGN_DAYS_MAX]) {
        expect(normalizeManagerAssignDays(true, v)).toBe(v);
      }
    });

    it('rejects explicit null when property present', () => {
      expect(() => normalizeManagerAssignDays(true, null)).toThrow(ManagerAssignDaysError);
    });

    it('rejects strings, booleans, NaN, Infinity', () => {
      expect(() => normalizeManagerAssignDays(true, '7')).toThrow(ManagerAssignDaysError);
      expect(() => normalizeManagerAssignDays(true, true)).toThrow(ManagerAssignDaysError);
      expect(() => normalizeManagerAssignDays(true, Number.NaN)).toThrow(ManagerAssignDaysError);
      expect(() => normalizeManagerAssignDays(true, Number.POSITIVE_INFINITY)).toThrow(ManagerAssignDaysError);
      expect(() => normalizeManagerAssignDays(true, Number.NEGATIVE_INFINITY)).toThrow(ManagerAssignDaysError);
    });

    it('rejects fractions', () => {
      expect(() => normalizeManagerAssignDays(true, 7.5)).toThrow(ManagerAssignDaysError);
    });

    it('rejects 0, negative, 31+', () => {
      expect(() => normalizeManagerAssignDays(true, 0)).toThrow(ManagerAssignDaysError);
      expect(() => normalizeManagerAssignDays(true, -1)).toThrow(ManagerAssignDaysError);
      expect(() => normalizeManagerAssignDays(true, 31)).toThrow(ManagerAssignDaysError);
      expect(() => normalizeManagerAssignDays(true, 1000)).toThrow(ManagerAssignDaysError);
    });
  });

  it('managerAssign re-validates days at the service boundary', async () => {
    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue(null);
    (mockTx.user.findUnique as any).mockResolvedValue({ role: 'HR_STAFF' });
    await expect(
      managerAssign(mockTx, {
        laborProfileId: 'lp-bad-days',
        newAssigneeUserId: 'user-2',
        managerUserId: 'manager-1',
        days: 0,
        reason: 'should reject',
      } as any),
    ).rejects.toBeInstanceOf(ManagerAssignDaysError);
    expect(mockTx.laborProfileHandlingAssignment.create).not.toHaveBeenCalled();
  });
});
